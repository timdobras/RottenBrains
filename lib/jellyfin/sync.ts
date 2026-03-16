/**
 * Jellyfin sync orchestration
 *
 * Handles bidirectional sync between RottenBrains and Jellyfin:
 * - syncToJellyfin: called after saveWatchTime when sync_source='app'
 * - syncFromJellyfin: called by webhook endpoint when Jellyfin reports progress
 *
 * Anti-loop mechanism:
 * - Updates from the app are tagged sync_source='app' → synced TO Jellyfin
 * - Updates from Jellyfin are tagged sync_source='jellyfin' → NOT synced back
 * - Additional timestamp-based dedup as a safety net
 */

import { JELLYFIN_SYNC } from '@/lib/constants';
import { logger } from '@/lib/logger';
import { createServiceClient } from '@/lib/supabase/serviceClient';
import {
  reportPlaybackProgress,
  markAsPlayed,
  percentageToTicks,
  ticksToPercentage,
  ticksToSeconds,
  getRecentlyPlayedMovies,
  getRecentlyPlayedEpisodes,
  getInProgressItems,
} from './client';
import { extractTmdbId, jellyfinTypeToMediaType, resolveJellyfinItemId } from './mapping';
import type {
  JellyfinConfig,
  JellyfinItem,
  SyncToJellyfinParams,
  SyncFromJellyfinParams,
  SyncResult,
  PollResult,
} from './types';

// ============================================================
// Config helpers
// ============================================================

/**
 * Fetch a user's Jellyfin config from the database.
 * Returns null if the user hasn't configured Jellyfin or sync is disabled.
 */
export async function getJellyfinConfig(userId: string): Promise<JellyfinConfig | null> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('user_jellyfin_config')
      .select('*')
      .eq('user_id', userId)
      .eq('sync_enabled', true)
      .single();

    if (error || !data) return null;
    return data as JellyfinConfig;
  } catch (error) {
    logger.warn('Failed to fetch Jellyfin config:', error);
    return null;
  }
}

/**
 * Look up a user by their Jellyfin webhook secret token.
 * Used by the webhook endpoint to identify which user a webhook belongs to.
 */
export async function getUserByWebhookSecret(
  webhookSecret: string
): Promise<JellyfinConfig | null> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('user_jellyfin_config')
      .select('*')
      .eq('webhook_secret', webhookSecret)
      .eq('sync_enabled', true)
      .single();

    if (error || !data) return null;
    return data as JellyfinConfig;
  } catch (error) {
    logger.warn('Failed to look up user by webhook secret:', error);
    return null;
  }
}

// ============================================================
// Sync log helpers
// ============================================================

/**
 * Log a sync event for debugging and anti-loop dedup.
 */
async function logSyncEvent(
  userId: string,
  direction: 'to_jellyfin' | 'from_jellyfin',
  mediaType: string,
  mediaId: number,
  status: 'success' | 'skipped' | 'error',
  errorMessage?: string,
  seasonNumber?: number | null,
  episodeNumber?: number | null
): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase.from('jellyfin_sync_log').insert({
      user_id: userId,
      direction,
      media_type: mediaType,
      media_id: mediaId,
      season_number: seasonNumber ?? null,
      episode_number: episodeNumber ?? null,
      status,
      error_message: errorMessage || null,
    });
  } catch (error) {
    // Don't throw — logging failure shouldn't break sync
    logger.warn('Failed to write sync log entry:', error);
  }
}

/**
 * Check if a recent sync in the opposite direction happened for the same item.
 * Used as a secondary anti-loop safety net alongside sync_source.
 *
 * Returns true if sync should be SKIPPED (recent opposite sync found).
 */
async function shouldSkipDueToRecentSync(
  userId: string,
  mediaType: string,
  mediaId: number,
  oppositeDirection: 'to_jellyfin' | 'from_jellyfin'
): Promise<boolean> {
  try {
    const supabase = createServiceClient();
    const cutoff = new Date(Date.now() - JELLYFIN_SYNC.DEDUP_WINDOW_SECONDS * 1000).toISOString();

    const { data, error } = await supabase
      .from('jellyfin_sync_log')
      .select('id')
      .eq('user_id', userId)
      .eq('media_type', mediaType)
      .eq('media_id', mediaId)
      .eq('direction', oppositeDirection)
      .eq('status', 'success')
      .gte('created_at', cutoff)
      .limit(1);

    if (error) return false;
    return (data?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

// ============================================================
// Sync: App → Jellyfin
// ============================================================

/**
 * Sync a watch history update from RottenBrains to Jellyfin.
 *
 * Called asynchronously after saveWatchTime when sync_source='app'.
 * Fire-and-forget — does not block the API response.
 */
export async function syncToJellyfin(params: SyncToJellyfinParams): Promise<SyncResult> {
  const { userId, mediaType, mediaId, seasonNumber, episodeNumber, percentageWatched } = params;

  try {
    // 1. Check if user has Jellyfin configured
    const config = await getJellyfinConfig(userId);
    if (!config) {
      return { success: true, action: 'skipped', message: 'No Jellyfin config' };
    }

    // 2. Anti-loop: skip if we recently synced FROM Jellyfin for this item
    const shouldSkip = await shouldSkipDueToRecentSync(userId, mediaType, mediaId, 'from_jellyfin');
    if (shouldSkip) {
      logger.debug('Skipping to_jellyfin sync — recent from_jellyfin sync detected', {
        userId,
        mediaType,
        mediaId,
      });
      await logSyncEvent(
        userId,
        'to_jellyfin',
        mediaType,
        mediaId,
        'skipped',
        'Anti-loop dedup',
        seasonNumber,
        episodeNumber
      );
      return { success: true, action: 'skipped', message: 'Anti-loop dedup' };
    }

    // 3. Resolve the Jellyfin item ID from TMDB ID
    const jellyfinItemId = await resolveJellyfinItemId(
      config,
      mediaId,
      mediaType as 'movie' | 'tv',
      seasonNumber,
      episodeNumber
    );

    if (!jellyfinItemId) {
      // Item not in user's Jellyfin library — silently skip
      await logSyncEvent(
        userId,
        'to_jellyfin',
        mediaType,
        mediaId,
        'skipped',
        'Item not found in Jellyfin',
        seasonNumber,
        episodeNumber
      );
      return { success: true, action: 'skipped', message: 'Item not in Jellyfin library' };
    }

    // 4. Report progress to Jellyfin
    // We need a runtime estimate to convert percentage to ticks.
    // Use a reasonable default since we may not have TMDB data here.
    // For movies: avg ~120 min, for TV episodes: avg ~45 min.
    const estimatedRuntime = mediaType === 'movie' ? 120 : 45;
    const positionTicks = percentageToTicks(percentageWatched, estimatedRuntime);

    if (percentageWatched >= JELLYFIN_SYNC.MARK_PLAYED_THRESHOLD) {
      // Mark as fully played
      await markAsPlayed(config, jellyfinItemId);
    } else {
      // Report progress
      await reportPlaybackProgress(config, jellyfinItemId, positionTicks);
    }

    await logSyncEvent(
      userId,
      'to_jellyfin',
      mediaType,
      mediaId,
      'success',
      undefined,
      seasonNumber,
      episodeNumber
    );
    logger.info('Synced to Jellyfin', { userId, mediaType, mediaId, percentageWatched });

    return { success: true, action: 'synced', message: 'Synced to Jellyfin' };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to sync to Jellyfin:', { userId, mediaType, mediaId, error: errorMsg });
    await logSyncEvent(
      userId,
      'to_jellyfin',
      mediaType,
      mediaId,
      'error',
      errorMsg,
      seasonNumber,
      episodeNumber
    );
    return { success: false, action: 'error', message: errorMsg };
  }
}

// ============================================================
// Sync: Jellyfin → App
// ============================================================

/**
 * Sync a single watch event from Jellyfin into RottenBrains.
 *
 * Called by the webhook endpoint or poll logic. Inserts into watch_history with
 * sync_source='jellyfin' so it won't be synced back to Jellyfin.
 */
export async function syncFromJellyfin(params: SyncFromJellyfinParams): Promise<SyncResult> {
  const { userId, tmdbId, mediaType, seasonNumber, episodeNumber, percentageWatched, timeSpent } =
    params;

  try {
    // 1. Anti-loop: skip if we recently synced TO Jellyfin for this item
    const shouldSkip = await shouldSkipDueToRecentSync(userId, mediaType, tmdbId, 'to_jellyfin');
    if (shouldSkip) {
      logger.debug('Skipping from_jellyfin sync — recent to_jellyfin sync detected', {
        userId,
        mediaType,
        tmdbId,
      });
      await logSyncEvent(
        userId,
        'from_jellyfin',
        mediaType,
        tmdbId,
        'skipped',
        'Anti-loop dedup',
        seasonNumber,
        episodeNumber
      );
      return { success: true, action: 'skipped', message: 'Anti-loop dedup' };
    }

    // 2. Upsert into watch_history with sync_source='jellyfin'
    const supabase = createServiceClient();

    const normalizedSeason = seasonNumber ?? -1;
    const normalizedEpisode = episodeNumber ?? -1;

    const { error } = await supabase.rpc('upsert_watch_history_atomic', {
      p_user_id: userId,
      p_media_type: mediaType,
      p_media_id: tmdbId,
      p_new_time_spent: Math.round(timeSpent),
      p_new_percentage: percentageWatched,
      p_season_number: normalizedSeason,
      p_episode_number: normalizedEpisode,
      p_sync_source: 'jellyfin',
      p_playback_position: null,
    });

    if (error) {
      throw new Error(`Database upsert failed: ${error.message}`);
    }

    await logSyncEvent(
      userId,
      'from_jellyfin',
      mediaType,
      tmdbId,
      'success',
      undefined,
      seasonNumber,
      episodeNumber
    );
    logger.info('Synced from Jellyfin', { userId, mediaType, tmdbId, percentageWatched });

    return { success: true, action: 'synced', message: 'Synced from Jellyfin' };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to sync from Jellyfin', {
      userId,
      mediaType,
      tmdbId,
      seasonNumber,
      episodeNumber,
      error: errorMsg,
      stack: error instanceof Error ? error.stack : undefined,
    });
    await logSyncEvent(
      userId,
      'from_jellyfin',
      mediaType,
      tmdbId,
      'error',
      errorMsg,
      seasonNumber,
      episodeNumber
    );
    return { success: false, action: 'error', message: errorMsg };
  }
}

// ============================================================
// Poll: Jellyfin → App (alternative to webhooks)
// ============================================================

/**
 * Process a single Jellyfin item and sync it to the app's watch_history.
 * Extracts TMDB ID from ProviderIds and calculates watch percentage.
 * Returns 'synced', 'skipped', or 'error'.
 */
async function processJellyfinItem(
  config: JellyfinConfig,
  item: JellyfinItem
): Promise<{ action: 'synced' | 'skipped' | 'error'; error?: string }> {
  try {
    // Extract TMDB ID
    const tmdbId = extractTmdbId(item.ProviderIds);
    const mediaType = jellyfinTypeToMediaType(item.Type);

    // Extract season/episode for TV episodes
    let seasonNumber: number | null = null;
    let episodeNumber: number | null = null;
    let resolvedTmdbId = tmdbId;

    if (item.Type === 'Episode') {
      seasonNumber = item.ParentIndexNumber ?? null;
      episodeNumber = item.IndexNumber ?? null;

      // For episodes, we need the series TMDB ID, not the episode's.
      // Our watch_history stores the series TMDB ID + season/episode.
      if (item.SeriesId) {
        const seriesPath =
          `/Users/${config.jellyfin_user_id}/Items/${item.SeriesId}` + `?Fields=ProviderIds`;
        try {
          const response = await fetch(`${config.server_url.replace(/\/+$/, '')}${seriesPath}`, {
            headers: {
              'X-Emby-Token': config.api_key,
              Accept: 'application/json',
            },
            signal: AbortSignal.timeout(10000),
          });
          if (response.ok) {
            const seriesItem = (await response.json()) as { ProviderIds?: Record<string, string> };
            const seriesTmdbId = extractTmdbId(
              seriesItem.ProviderIds as Record<string, string> | undefined
            );
            if (seriesTmdbId) {
              resolvedTmdbId = seriesTmdbId;
            }
          }
        } catch {
          logger.warn('Failed to fetch series info for episode, using episode TMDB ID');
        }
      }
    }

    if (!resolvedTmdbId) {
      return { action: 'skipped', error: `No TMDB ID for "${item.Name}"` };
    }

    if (!mediaType) {
      return { action: 'skipped', error: `Unknown type "${item.Type}" for "${item.Name}"` };
    }

    return await syncSingleItemFromPoll(
      config.user_id,
      resolvedTmdbId,
      mediaType,
      seasonNumber,
      episodeNumber,
      item
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return { action: 'error', error: msg };
  }
}

/**
 * Sync a single resolved item from Jellyfin polling into watch_history.
 * Compares Jellyfin's percentage with local DB and only updates if Jellyfin is ahead.
 */
async function syncSingleItemFromPoll(
  userId: string,
  tmdbId: number,
  mediaType: 'movie' | 'tv',
  seasonNumber: number | null,
  episodeNumber: number | null,
  item: JellyfinItem
): Promise<{ action: 'synced' | 'skipped' | 'error'; error?: string }> {
  // Calculate percentage watched from Jellyfin UserData
  let percentageWatched = 0;
  let timeSpentSeconds = 0;

  if (item.UserData?.Played) {
    percentageWatched = 100;
    timeSpentSeconds = item.RunTimeTicks ? ticksToSeconds(item.RunTimeTicks) : 0;
  } else if (item.UserData?.PlaybackPositionTicks && item.RunTimeTicks) {
    percentageWatched = ticksToPercentage(item.UserData.PlaybackPositionTicks, item.RunTimeTicks);
    timeSpentSeconds = ticksToSeconds(item.UserData.PlaybackPositionTicks);
  } else if (item.UserData?.PlayedPercentage) {
    percentageWatched = item.UserData.PlayedPercentage;
  }

  if (percentageWatched <= 0) {
    return { action: 'skipped', error: 'No watch progress' };
  }

  // Check current local state — only sync if Jellyfin has more progress
  const supabase = createServiceClient();
  const normalizedSeason = seasonNumber ?? -1;
  const normalizedEpisode = episodeNumber ?? -1;

  const { data: existing } = await supabase
    .from('watch_history')
    .select('percentage_watched')
    .eq('user_id', userId)
    .eq('media_type', mediaType)
    .eq('media_id', tmdbId)
    .eq('season_number', normalizedSeason)
    .eq('episode_number', normalizedEpisode)
    .single();

  const localPercentage = existing ? parseFloat(String(existing.percentage_watched)) : 0;

  // Only sync if Jellyfin is meaningfully ahead (>2% difference to avoid noise)
  if (percentageWatched <= localPercentage + 2) {
    return { action: 'skipped', error: 'Local progress is equal or ahead' };
  }

  // Sync it — use syncFromJellyfin which handles anti-loop and logging
  const result = await syncFromJellyfin({
    userId,
    tmdbId,
    mediaType,
    seasonNumber,
    episodeNumber,
    percentageWatched,
    timeSpent: timeSpentSeconds > 0 ? timeSpentSeconds : 30,
  });

  if (result.success && result.action === 'synced') {
    return { action: 'synced' };
  }
  return { action: result.action === 'error' ? 'error' : 'skipped', error: result.message };
}

/**
 * Poll Jellyfin for recently played/in-progress items and sync them to the app.
 *
 * This is the primary Jellyfin → App sync mechanism, replacing unreliable webhooks.
 * Called by the /api/jellyfin/poll endpoint (authenticated via user session).
 *
 * Strategy:
 * 1. Fetch recently completed movies and episodes from Jellyfin
 * 2. Fetch in-progress (resume) items from Jellyfin
 * 3. For each item, extract TMDB ID and compare with local watch_history
 * 4. If Jellyfin has more progress, sync to local DB with sync_source='jellyfin'
 */
export async function pollJellyfinWatchHistory(userId: string): Promise<PollResult> {
  const result: PollResult = {
    success: true,
    itemsProcessed: 0,
    itemsSynced: 0,
    itemsSkipped: 0,
    errors: [],
  };

  try {
    // 1. Get user's Jellyfin config
    const config = await getJellyfinConfig(userId);
    if (!config) {
      return { ...result, success: true, errors: ['No Jellyfin config or sync disabled'] };
    }

    // 2. Fetch items from Jellyfin in parallel
    const [playedMovies, playedEpisodes, inProgressItems] = await Promise.all([
      getRecentlyPlayedMovies(config, 30),
      getRecentlyPlayedEpisodes(config, 30),
      getInProgressItems(config, 30),
    ]);

    // 3. Deduplicate — an item might appear in both played and in-progress
    const seen = new Set<string>();
    const allItems: JellyfinItem[] = [];

    for (const item of [...inProgressItems, ...playedMovies, ...playedEpisodes]) {
      if (!seen.has(item.Id)) {
        seen.add(item.Id);
        allItems.push(item);
      }
    }

    logger.info('Jellyfin poll: fetched items', {
      userId,
      playedMovies: playedMovies.length,
      playedEpisodes: playedEpisodes.length,
      inProgress: inProgressItems.length,
      deduplicated: allItems.length,
    });

    // 4. Process each item
    for (const item of allItems) {
      result.itemsProcessed++;

      const itemResult = await processJellyfinItem(config, item);

      switch (itemResult.action) {
        case 'synced':
          result.itemsSynced++;
          break;
        case 'skipped':
          result.itemsSkipped++;
          break;
        case 'error':
          result.errors.push(itemResult.error || `Error processing "${item.Name}"`);
          break;
      }
    }

    logger.info('Jellyfin poll complete', {
      userId,
      processed: result.itemsProcessed,
      synced: result.itemsSynced,
      skipped: result.itemsSkipped,
      errors: result.errors.length,
    });

    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Jellyfin poll failed:', { userId, error: errorMsg });
    return {
      success: false,
      itemsProcessed: result.itemsProcessed,
      itemsSynced: result.itemsSynced,
      itemsSkipped: result.itemsSkipped,
      errors: [...result.errors, errorMsg],
    };
  }
}
