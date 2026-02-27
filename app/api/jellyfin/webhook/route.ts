import { NextRequest, NextResponse } from 'next/server';
import { ticksToPercentage, ticksToSeconds } from '@/lib/jellyfin/client';
import { getUserByWebhookSecret, syncFromJellyfin } from '@/lib/jellyfin/sync';
import type { JellyfinConfig } from '@/lib/jellyfin/types';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * Safely parse a value that might be a number, a string-encoded number, or empty.
 * Jellyfin webhook templates wrap numbers in quotes, so "12345" → 12345, "" → 0.
 */
function safeNumber(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}

/**
 * Extract provider IDs from a Jellyfin webhook payload.
 *
 * With SendAllProperties=true, Jellyfin sends flat keys like:
 *   Provider_tmdb, Provider_imdb, Provider_tvdb, Provider_tvrage
 *
 * With the nested format (Handlebars templates), they come as:
 *   Item.ProviderIds.Tmdb, Item.ProviderIds.Imdb, etc.
 *
 * This function handles both formats.
 */
function extractProviderIds(payload: Record<string, unknown>): {
  tmdb: string;
  imdb: string;
  tvdb: string;
} {
  // Try nested format first
  const item = payload.Item as Record<string, unknown> | undefined;
  const nestedProviders = item?.ProviderIds as Record<string, string> | undefined;

  if (nestedProviders?.Tmdb || nestedProviders?.Imdb || nestedProviders?.Tvdb) {
    return {
      tmdb: nestedProviders.Tmdb || '',
      imdb: nestedProviders.Imdb || '',
      tvdb: nestedProviders.Tvdb || '',
    };
  }

  // Flat format: Provider_tmdb, Provider_imdb, Provider_tvdb
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

  // Event type
  const eventType = (payload.NotificationType as string) || (payload.Event as string) || '';

  // Item fields — try nested first, fall back to flat
  const itemName = (item?.Name as string) || (payload.Name as string) || '';
  const itemType = (item?.Type as string) || (payload.ItemType as string) || '';
  const runtimeTicks = safeNumber(item?.RunTimeTicks ?? payload.RunTimeTicks);
  const seasonNumber = safeNumber(item?.ParentIndexNumber ?? payload.SeasonNumber);
  const episodeNumber = safeNumber(item?.IndexNumber ?? payload.EpisodeNumber);
  const seriesId = (item?.SeriesId as string) || (payload.SeriesId as string) || '';
  const seriesName = (item?.SeriesName as string) || (payload.SeriesName as string) || '';

  // Playback position — try nested PlaybackInfo, then flat
  const playbackInfo = (payload.PlaybackInfo as Record<string, unknown>) || {};
  const positionTicks = safeNumber(
    playbackInfo.PositionTicks ?? payload.PlaybackPositionTicks ?? 0
  );

  // PlayedToCompletion — Jellyfin sets this on PlaybackStop when the user
  // watched the item to the end. When true, PlaybackPositionTicks is reset to 0.
  const playedToCompletion =
    payload.PlayedToCompletion === true || payload.PlayedToCompletion === 'True';

  // Provider IDs
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
 * Used when the webhook payload for an episode doesn't include a TMDB ID directly.
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

/**
 * POST /api/jellyfin/webhook?token={webhook_secret}
 *
 * Receives webhook events from Jellyfin's webhook plugin.
 * Not authenticated via Supabase — uses a per-user secret token instead.
 *
 * Handles event types:
 * - PlaybackStart / PlaybackProgress / PlaybackStop → update watch progress
 * - MarkPlayed → mark item as fully watched
 *
 * Supports two payload formats:
 * - Nested (Handlebars template): Item.Name, Item.Type, Item.ProviderIds.Tmdb
 * - Flat (SendAllProperties=true): Name, ItemType, Provider_tmdb, Provider_imdb
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
      // Try form-encoded as fallback
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

    logger.debug('[Jellyfin webhook] Received event:', {
      userId: config.user_id,
      eventType: fields.eventType,
      itemName: fields.itemName,
      itemType: fields.itemType,
      providers: fields.providers,
    });

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
    let tmdbId = safeNumber(fields.providers.tmdb);

    // If no direct TMDB ID, try to resolve it
    if (!tmdbId) {
      // For episodes: look up the series in Jellyfin to get the series' TMDB ID
      if (fields.itemType === 'Episode' && fields.seriesId) {
        tmdbId = await lookupSeriesTmdbId(config, fields.seriesId);
        if (tmdbId) {
          logger.debug('[Jellyfin webhook] Resolved series TMDB ID from Jellyfin:', {
            seriesId: fields.seriesId,
            seriesName: fields.seriesName,
            tmdbId,
          });
        }
      }

      // Still no TMDB ID — skip
      if (!tmdbId) {
        logger.debug('[Jellyfin webhook] No TMDB ID available, skipping', {
          itemName: fields.itemName,
          itemType: fields.itemType,
          providers: fields.providers,
        });
        return NextResponse.json({
          success: true,
          action: 'skipped',
          reason: 'No TMDB ID on item',
        });
      }
    }

    // 6. Determine media type
    const mediaType = resolveMediaType(fields.itemType);
    if (!mediaType) {
      logger.debug('[Jellyfin webhook] Unknown item type, skipping', {
        itemType: fields.itemType,
      });
      return NextResponse.json({
        success: true,
        action: 'skipped',
        reason: `Unknown item type: ${fields.itemType}`,
      });
    }

    // 7. Calculate progress
    // DEBUG: Log raw values to diagnose percentage calculation
    logger.error('[Jellyfin webhook] DEBUG progress values:', {
      eventType: fields.eventType,
      positionTicks: fields.positionTicks,
      runtimeTicks: fields.runtimeTicks,
      playedToCompletion: fields.playedToCompletion,
      rawPlaybackPositionTicks: payload.PlaybackPositionTicks,
      rawPlayedToCompletion: payload.PlayedToCompletion,
      rawRunTimeTicks: payload.RunTimeTicks,
    });

    let percentageWatched = 0;
    let timeSpentSeconds = 0;

    if (
      fields.eventType === 'MarkPlayed' ||
      fields.eventType === 'ItemMarkedPlayed' ||
      fields.playedToCompletion
    ) {
      // Item was marked as played or user watched to completion
      percentageWatched = 100;
      timeSpentSeconds = fields.runtimeTicks > 0 ? ticksToSeconds(fields.runtimeTicks) : 0;
    } else {
      // Playback events — use position ticks for partial progress
      if (fields.runtimeTicks > 0 && fields.positionTicks > 0) {
        percentageWatched = ticksToPercentage(fields.positionTicks, fields.runtimeTicks);
      }
      timeSpentSeconds = fields.positionTicks > 0 ? ticksToSeconds(fields.positionTicks) : 0;
    }

    logger.error('[Jellyfin webhook] DEBUG calculated:', {
      percentageWatched,
      timeSpentSeconds,
    });

    // Resolve season/episode for TV
    const seasonNumber = mediaType === 'tv' && fields.seasonNumber > 0 ? fields.seasonNumber : null;
    const episodeNumber =
      mediaType === 'tv' && fields.episodeNumber > 0 ? fields.episodeNumber : null;

    // 8. Sync to local database
    const result = await syncFromJellyfin({
      userId: config.user_id,
      tmdbId,
      mediaType,
      seasonNumber,
      episodeNumber,
      percentageWatched,
      timeSpent: timeSpentSeconds,
    });

    logger.debug('[Jellyfin webhook] Sync result:', {
      itemName: fields.itemName,
      tmdbId,
      mediaType,
      seasonNumber,
      episodeNumber,
      percentageWatched: Math.round(percentageWatched * 100) / 100,
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
