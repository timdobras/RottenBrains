import { NextRequest, NextResponse } from 'next/server';
import { ticksToPercentage, ticksToSeconds } from '@/lib/jellyfin/client';
import { getUserByWebhookSecret, syncFromJellyfin } from '@/lib/jellyfin/sync';
import type { JellyfinConfig } from '@/lib/jellyfin/types';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// ============================================================
// Throttle: only write PlaybackProgress to DB every N seconds
// ============================================================

/** Key: "userId:mediaType:mediaId:season:episode" → last write timestamp */
const lastWriteTimestamps = new Map<string, number>();

/** Minimum interval between DB writes for PlaybackProgress events (ms) */
const PROGRESS_THROTTLE_MS = 30_000; // 30 seconds

function makeThrottleKey(
  userId: string,
  mediaType: string,
  mediaId: number,
  season: number | null,
  episode: number | null
): string {
  return `${userId}:${mediaType}:${mediaId}:${season ?? -1}:${episode ?? -1}`;
}

/**
 * Check if a PlaybackProgress event should be throttled.
 * Returns true if we should SKIP writing to the DB.
 */
function shouldThrottleProgress(key: string): boolean {
  const now = Date.now();
  const lastWrite = lastWriteTimestamps.get(key);
  if (lastWrite && now - lastWrite < PROGRESS_THROTTLE_MS) {
    return true; // Too soon, skip
  }
  return false;
}

function recordWrite(key: string): void {
  lastWriteTimestamps.set(key, Date.now());

  // Prune old entries to prevent memory leak (keep last 200)
  if (lastWriteTimestamps.size > 200) {
    const cutoff = Date.now() - PROGRESS_THROTTLE_MS * 2;
    for (const [k, ts] of lastWriteTimestamps) {
      if (ts < cutoff) lastWriteTimestamps.delete(k);
    }
  }
}

// ============================================================
// Payload parsing helpers
// ============================================================

/**
 * Safely parse a value that might be a number, a string-encoded number, or empty.
 */
function safeNumber(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}

/**
 * Extract provider IDs from a Jellyfin webhook payload.
 * Handles both nested (Item.ProviderIds.Tmdb) and flat (Provider_tmdb) formats.
 */
function extractProviderIds(payload: Record<string, unknown>): {
  tmdb: string;
  imdb: string;
  tvdb: string;
} {
  const item = payload.Item as Record<string, unknown> | undefined;
  const nestedProviders = item?.ProviderIds as Record<string, string> | undefined;

  if (nestedProviders?.Tmdb || nestedProviders?.Imdb || nestedProviders?.Tvdb) {
    return {
      tmdb: nestedProviders.Tmdb || '',
      imdb: nestedProviders.Imdb || '',
      tvdb: nestedProviders.Tvdb || '',
    };
  }

  return {
    tmdb: (payload.Provider_tmdb as string) || '',
    imdb: (payload.Provider_imdb as string) || '',
    tvdb: (payload.Provider_tvdb as string) || '',
  };
}

/**
 * Extract fields from the webhook payload, handling both nested (Item.X)
 * and flat (SendAllProperties=true) formats.
 */
function extractPayloadFields(payload: Record<string, unknown>) {
  const item = payload.Item as Record<string, unknown> | undefined;

  const eventType = (payload.NotificationType as string) || (payload.Event as string) || '';

  const itemName = (item?.Name as string) || (payload.Name as string) || '';
  const itemType = (item?.Type as string) || (payload.ItemType as string) || '';
  const runtimeTicks = safeNumber(item?.RunTimeTicks ?? payload.RunTimeTicks);
  const seasonNumber = safeNumber(item?.ParentIndexNumber ?? payload.SeasonNumber);
  const episodeNumber = safeNumber(item?.IndexNumber ?? payload.EpisodeNumber);
  const seriesId = (item?.SeriesId as string) || (payload.SeriesId as string) || '';
  const seriesName = (item?.SeriesName as string) || (payload.SeriesName as string) || '';

  const playbackInfo = (payload.PlaybackInfo as Record<string, unknown>) || {};
  const positionTicks = safeNumber(
    playbackInfo.PositionTicks ?? payload.PlaybackPositionTicks ?? 0
  );

  const playedToCompletion =
    payload.PlayedToCompletion === true || payload.PlayedToCompletion === 'True';

  const providers = extractProviderIds(payload);

  return {
    eventType,
    itemName,
    itemType,
    runtimeTicks,
    seasonNumber,
    episodeNumber,
    seriesId,
    seriesName,
    positionTicks,
    playedToCompletion,
    providers,
  };
}

/**
 * Look up a Jellyfin series by its internal ID to get the series' TMDB provider ID.
 */
async function lookupSeriesTmdbId(config: JellyfinConfig, seriesId: string): Promise<number | 0> {
  try {
    const url =
      `${config.server_url.replace(/\/+$/, '')}` +
      `/Users/${config.jellyfin_user_id}/Items/${seriesId}` +
      `?Fields=ProviderIds`;

    const response = await fetch(url, {
      headers: {
        'X-Emby-Token': config.api_key,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return 0;

    const seriesItem = (await response.json()) as {
      ProviderIds?: Record<string, string>;
    };

    const tmdbStr = seriesItem.ProviderIds?.Tmdb || seriesItem.ProviderIds?.tmdb || '';
    const tmdbId = parseInt(tmdbStr, 10);
    return isNaN(tmdbId) ? 0 : tmdbId;
  } catch (error) {
    logger.warn('Failed to look up series TMDB ID from Jellyfin:', {
      seriesId,
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return 0;
  }
}

/**
 * Determine the media type from the Jellyfin item type string.
 */
function resolveMediaType(itemType: string): 'movie' | 'tv' | null {
  switch (itemType) {
    case 'Movie':
      return 'movie';
    case 'Episode':
    case 'Series':
    case 'Season':
      return 'tv';
    default:
      return null;
  }
}

// ============================================================
// Webhook handler
// ============================================================

/**
 * POST /api/jellyfin/webhook?token={webhook_secret}
 *
 * Receives webhook events from Jellyfin's webhook plugin.
 * Not authenticated via Supabase — uses a per-user secret token instead.
 *
 * Handles event types:
 * - PlaybackStart / PlaybackStop → always written to DB
 * - PlaybackProgress → throttled to one DB write per 30 seconds per item
 * - MarkPlayed → always written to DB as 100%
 *
 * Supports both nested and flat payload formats.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate via webhook secret token
    const token = req.nextUrl.searchParams.get('token');
    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 401 });
    }

    const config = await getUserByWebhookSecret(token);
    if (!config) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // 2. Parse the webhook payload
    const rawBody = await req.text();

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      try {
        const params = new URLSearchParams(rawBody);
        const obj: Record<string, unknown> = {};
        params.forEach((value, key) => {
          try {
            obj[key] = JSON.parse(value);
          } catch {
            obj[key] = value;
          }
        });
        payload = obj;
      } catch {
        logger.warn('[Jellyfin webhook] Could not parse payload in any format');
        return NextResponse.json(
          { success: false, error: 'Could not parse payload' },
          { status: 400 }
        );
      }
    }

    // 3. Extract fields — handles both nested and flat formats
    const fields = extractPayloadFields(payload);

    // 4. Only process playback and mark-played events
    const processableEvents = [
      'PlaybackStart',
      'PlaybackStop',
      'PlaybackProgress',
      'MarkPlayed',
      'ItemMarkedPlayed',
    ];
    if (!fields.eventType || !processableEvents.includes(fields.eventType)) {
      return NextResponse.json({
        success: true,
        action: 'ignored',
        reason: `Event type '${fields.eventType}' not handled`,
      });
    }

    // 5. Resolve TMDB ID
    // For episodes, we MUST use the series TMDB ID (not the episode's own TMDB ID)
    // because watch_history is keyed by (series_tmdb_id, season, episode).
    // The episode-level TMDB ID is a different number and won't match.
    let tmdbId = 0;

    if (fields.itemType === 'Episode' && fields.seriesId) {
      // Always look up the series TMDB ID for episodes
      tmdbId = await lookupSeriesTmdbId(config, fields.seriesId);
    }

    // Fall back to the item's own TMDB ID (correct for movies, last resort for episodes)
    if (!tmdbId) {
      tmdbId = safeNumber(fields.providers.tmdb);
    }

    if (!tmdbId) {
      logger.debug('[Jellyfin webhook] No TMDB ID available, skipping', {
        itemName: fields.itemName,
        itemType: fields.itemType,
      });
      return NextResponse.json({
        success: true,
        action: 'skipped',
        reason: 'No TMDB ID on item',
      });
    }

    // 6. Determine media type
    const mediaType = resolveMediaType(fields.itemType);
    if (!mediaType) {
      return NextResponse.json({
        success: true,
        action: 'skipped',
        reason: `Unknown item type: ${fields.itemType}`,
      });
    }

    // 7. Resolve season/episode for TV
    const seasonNumber = mediaType === 'tv' && fields.seasonNumber > 0 ? fields.seasonNumber : null;
    const episodeNumber =
      mediaType === 'tv' && fields.episodeNumber > 0 ? fields.episodeNumber : null;

    // 8. Throttle PlaybackProgress — only write every 30 seconds per item
    if (fields.eventType === 'PlaybackProgress') {
      const key = makeThrottleKey(config.user_id, mediaType, tmdbId, seasonNumber, episodeNumber);
      if (shouldThrottleProgress(key)) {
        return NextResponse.json({
          success: true,
          action: 'throttled',
          reason: 'Progress update throttled',
        });
      }
      // Will record the write after successful sync below
    }

    // 9. Calculate progress
    let percentageWatched = 0;
    let timeSpentSeconds = 0;

    if (
      fields.eventType === 'MarkPlayed' ||
      fields.eventType === 'ItemMarkedPlayed' ||
      fields.playedToCompletion
    ) {
      percentageWatched = 100;
      timeSpentSeconds = fields.runtimeTicks > 0 ? ticksToSeconds(fields.runtimeTicks) : 0;
    } else {
      if (fields.runtimeTicks > 0 && fields.positionTicks > 0) {
        percentageWatched = ticksToPercentage(fields.positionTicks, fields.runtimeTicks);
      }
      timeSpentSeconds = fields.positionTicks > 0 ? ticksToSeconds(fields.positionTicks) : 0;
    }

    // 10. Sync to local database
    const result = await syncFromJellyfin({
      userId: config.user_id,
      tmdbId,
      mediaType,
      seasonNumber,
      episodeNumber,
      percentageWatched,
      timeSpent: timeSpentSeconds,
    });

    // Record successful write for throttling
    if (result.success && result.action === 'synced') {
      const key = makeThrottleKey(config.user_id, mediaType, tmdbId, seasonNumber, episodeNumber);
      recordWrite(key);
    }

    logger.debug('[Jellyfin webhook] Sync:', {
      item: fields.itemName,
      tmdbId,
      event: fields.eventType,
      pct: Math.round(percentageWatched * 10) / 10,
      result: result.action,
    });

    return NextResponse.json({
      success: result.success,
      action: result.action,
      message: result.message,
    });
  } catch (error) {
    logger.error('[Jellyfin webhook] Unhandled error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    // Return 200 even on errors to prevent Jellyfin from retrying
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 200 });
  }
}
