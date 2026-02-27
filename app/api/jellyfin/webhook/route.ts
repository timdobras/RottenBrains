import { NextRequest, NextResponse } from 'next/server';
import { ticksToPercentage, ticksToSeconds } from '@/lib/jellyfin/client';
import { extractMediaInfoFromWebhook } from '@/lib/jellyfin/mapping';
import { getUserByWebhookSecret, syncFromJellyfin } from '@/lib/jellyfin/sync';
import type { JellyfinWebhookPayload } from '@/lib/jellyfin/types';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

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

    let payload: JellyfinWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      logger.error('[JELLYFIN WEBHOOK] Failed to parse JSON payload');
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
    }

    // Determine event type — different webhook plugin versions use different field names
    const eventType = payload.NotificationType || payload.Event;

    logger.error('[JELLYFIN WEBHOOK] Parsed event:', {
      userId: config.user_id,
      eventType,
      itemName: payload.Item?.Name,
      itemType: payload.Item?.Type,
      providerIds: payload.Item?.ProviderIds,
      allKeys: Object.keys(payload),
    });

    // 3. Only process playback and mark-played events
    const processableEvents = ['PlaybackStart', 'PlaybackStop', 'PlaybackProgress', 'MarkPlayed'];
    if (!eventType || !processableEvents.includes(eventType)) {
      return NextResponse.json({
        success: true,
        action: 'ignored',
        reason: 'Event type not handled',
      });
    }

    // 4. Extract media info from the payload
    if (!payload.Item) {
      return NextResponse.json({ success: true, action: 'ignored', reason: 'No item in payload' });
    }

    const mediaInfo = extractMediaInfoFromWebhook(
      payload.Item as {
        Type: string;
        ProviderIds?: Record<string, string | undefined>;
        ParentIndexNumber?: number;
        IndexNumber?: number;
        SeriesId?: string;
      }
    );

    if (!mediaInfo.tmdbId || !mediaInfo.mediaType) {
      logger.debug('Jellyfin webhook: item has no TMDB ID or unknown type, skipping', {
        itemName: payload.Item.Name,
        itemType: payload.Item.Type,
        providerIds: payload.Item.ProviderIds,
      });
      return NextResponse.json({
        success: true,
        action: 'skipped',
        reason: 'No TMDB ID on item',
      });
    }

    // 5. For TV episodes, we need the TMDB ID of the **series**, not the episode.
    //    The webhook item's ProviderIds.Tmdb for an Episode is the episode's TMDB ID,
    //    but our DB keys on the series TMDB ID. For episodes, try the series' provider IDs.
    //    If the series TMDB ID isn't available, we'll use the episode's.
    const tmdbId = mediaInfo.tmdbId;

    // 6. Calculate progress
    let percentageWatched = 0;
    let timeSpentSeconds = 0;

    if (eventType === 'MarkPlayed') {
      percentageWatched = 100;
      // Estimate time spent from runtime
      const runtimeTicks = payload.Item.RunTimeTicks || 0;
      timeSpentSeconds = ticksToSeconds(runtimeTicks);
    } else {
      // Playback events — extract position
      const positionTicks =
        payload.PlaybackInfo?.PositionTicks ?? payload.PlaybackPositionTicks ?? 0;
      const runtimeTicks = payload.Item.RunTimeTicks || 0;

      if (runtimeTicks > 0) {
        percentageWatched = ticksToPercentage(positionTicks, runtimeTicks);
      }

      // For progress events, estimate a 30-second chunk of time spent
      // (Jellyfin doesn't send deltas, just absolute position)
      timeSpentSeconds = 30;
    }

    // 7. Sync to local database
    const result = await syncFromJellyfin({
      userId: config.user_id,
      tmdbId,
      mediaType: mediaInfo.mediaType,
      seasonNumber: mediaInfo.seasonNumber,
      episodeNumber: mediaInfo.episodeNumber,
      percentageWatched,
      timeSpent: timeSpentSeconds,
    });

    return NextResponse.json({
      success: result.success,
      action: result.action,
      message: result.message,
    });
  } catch (error) {
    logger.error('Error in Jellyfin webhook endpoint:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    // Return 200 even on errors to prevent Jellyfin from retrying
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 200 });
  }
}
