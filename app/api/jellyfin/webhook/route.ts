import { NextRequest, NextResponse } from 'next/server';
import { ticksToPercentage, ticksToSeconds } from '@/lib/jellyfin/client';
import { extractMediaInfoFromWebhook } from '@/lib/jellyfin/mapping';
import { getUserByWebhookSecret, syncFromJellyfin } from '@/lib/jellyfin/sync';
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
 * POST /api/jellyfin/webhook?token={webhook_secret}
 *
 * Receives webhook events from Jellyfin's webhook plugin.
 * Not authenticated via Supabase — uses a per-user secret token instead.
 *
 * Handles event types:
 * - PlaybackStart / PlaybackProgress / PlaybackStop → update watch progress
 * - MarkPlayed → mark item as fully watched
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
    logger.error('[JELLYFIN WEBHOOK] Raw payload received:', rawBody);

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      logger.error('[JELLYFIN WEBHOOK] Failed to parse JSON payload');
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
    }

    // 3. Extract fields — handle both raw Jellyfin API format and Handlebars template format
    const eventType = (payload.NotificationType as string) || (payload.Event as string) || '';

    const item = (payload.Item as Record<string, unknown>) || {};
    const itemName = (item.Name as string) || '';
    const itemType = (item.Type as string) || '';
    const providerIds = (item.ProviderIds as Record<string, string>) || {};
    const tmdbIdRaw = providerIds.Tmdb || '';

    logger.error('[JELLYFIN WEBHOOK] Parsed event:', {
      userId: config.user_id,
      eventType,
      itemName,
      itemType,
      tmdbId: tmdbIdRaw,
      allKeys: Object.keys(payload),
    });

    // 4. Only process playback and mark-played events
    const processableEvents = [
      'PlaybackStart',
      'PlaybackStop',
      'PlaybackProgress',
      'MarkPlayed',
      'ItemMarkedPlayed',
    ];
    if (!eventType || !processableEvents.includes(eventType)) {
      return NextResponse.json({
        success: true,
        action: 'ignored',
        reason: `Event type '${eventType}' not handled`,
      });
    }

    // 5. Parse TMDB ID
    const tmdbId = safeNumber(tmdbIdRaw);
    if (!tmdbId) {
      logger.error('[JELLYFIN WEBHOOK] No TMDB ID on item, skipping', {
        itemName,
        itemType,
        providerIds,
      });
      return NextResponse.json({
        success: true,
        action: 'skipped',
        reason: 'No TMDB ID on item',
      });
    }

    // 6. Determine media type
    const mediaInfo = extractMediaInfoFromWebhook({
      Type: itemType,
      ProviderIds: providerIds,
      ParentIndexNumber: safeNumber(item.ParentIndexNumber) || undefined,
      IndexNumber: safeNumber(item.IndexNumber) || undefined,
      SeriesId: (item.SeriesId as string) || undefined,
    });

    if (!mediaInfo.mediaType) {
      logger.error('[JELLYFIN WEBHOOK] Unknown item type, skipping', { itemType });
      return NextResponse.json({
        success: true,
        action: 'skipped',
        reason: `Unknown item type: ${itemType}`,
      });
    }

    // 7. Calculate progress
    let percentageWatched = 0;
    let timeSpentSeconds = 0;

    const runtimeTicks = safeNumber(item.RunTimeTicks);

    if (eventType === 'MarkPlayed' || eventType === 'ItemMarkedPlayed') {
      percentageWatched = 100;
      timeSpentSeconds = runtimeTicks > 0 ? ticksToSeconds(runtimeTicks) : 0;
    } else {
      // Playback events — extract position
      const playbackInfo = (payload.PlaybackInfo as Record<string, unknown>) || {};
      const positionTicks = safeNumber(
        playbackInfo.PositionTicks ?? payload.PlaybackPositionTicks ?? 0
      );

      if (runtimeTicks > 0) {
        percentageWatched = ticksToPercentage(positionTicks, runtimeTicks);
      }

      // For progress events, estimate a 30-second chunk
      timeSpentSeconds = 30;
    }

    // 8. Sync to local database
    const result = await syncFromJellyfin({
      userId: config.user_id,
      tmdbId,
      mediaType: mediaInfo.mediaType,
      seasonNumber: mediaInfo.seasonNumber,
      episodeNumber: mediaInfo.episodeNumber,
      percentageWatched,
      timeSpent: timeSpentSeconds,
    });

    logger.error('[JELLYFIN WEBHOOK] Sync result:', result);

    return NextResponse.json({
      success: result.success,
      action: result.action,
      message: result.message,
    });
  } catch (error) {
    logger.error('[JELLYFIN WEBHOOK] Error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Return 200 even on errors to prevent Jellyfin from retrying
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 200 });
  }
}
