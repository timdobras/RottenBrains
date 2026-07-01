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
 * - Additional in-memory timestamp-based dedup as a safety net
 */

import { JELLYFIN_SYNC } from '@/lib/constants';
import { rpc } from '@/lib/db/rpc';
import { getOrCreatePrimaryFamily } from '@/lib/family/server';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
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
  JellyfinIntegration,
  JellyfinItem,
  SyncToJellyfinParams,
  SyncFromJellyfinParams,
  SyncResult,
  PollResult,
} from './types';

// ============================================================
// Config helpers
//
// A Jellyfin "config" is resolved by joining a family-owned integration
// (family_integrations, type='jellyfin') with the user's own member link
// (integration_member_links). The integration holds the shared server + webhook
// secret; the member link holds that user's Jellyfin account + personal token.
// ============================================================

/** Prisma include that resolves a member link + its shared integration. */
const MEMBER_LINK_INCLUDE = {
  family_integrations: {
    select: { id: true, server_url: true, api_key: true, webhook_secret: true, type: true },
  },
} as const;

/** Normalise a Prisma member-link row (Date fields → ISO strings) to MemberLinkRow. */
function rowToMemberLink(link: any): MemberLinkRow {
  return {
    id: link.id,
    user_id: link.user_id,
    external_user_id: link.external_user_id,
    external_username: link.external_username,
    access_token: link.access_token,
    sync_enabled: link.sync_enabled,
    created_at: link.created_at?.toISOString?.() ?? '',
    updated_at: link.updated_at?.toISOString?.() ?? '',
    family_integrations: link.family_integrations,
  };
}

interface MemberLinkRow {
  id: string;
  user_id: string;
  external_user_id: string | null;
  external_username: string | null;
  access_token: string | null;
  sync_enabled: boolean;
  created_at: string;
  updated_at: string;
  family_integrations: {
    id: string;
    server_url: string | null;
    api_key: string | null;
    webhook_secret: string;
    type: string;
  };
}

/** Map a joined member-link row into the resolved JellyfinConfig shape. */
function linkToConfig(link: MemberLinkRow): JellyfinConfig | null {
  const integ = link.family_integrations;
  if (!integ?.server_url || !link.external_user_id) return null;
  return {
    id: link.id,
    user_id: link.user_id,
    server_url: integ.server_url,
    // Prefer the member's own token; fall back to the integration's shared key.
    api_key: link.access_token ?? integ.api_key ?? '',
    jellyfin_user_id: link.external_user_id,
    jellyfin_username: link.external_username,
    sync_enabled: link.sync_enabled,
    webhook_secret: integ.webhook_secret,
    created_at: link.created_at,
    updated_at: link.updated_at,
  };
}

/**
 * Fetch a user's resolved Jellyfin config.
 * Returns null if the user hasn't connected Jellyfin or has sync disabled.
 */
export async function getJellyfinConfig(userId: string): Promise<JellyfinConfig | null> {
  try {
    const link = await prisma.integration_member_links.findFirst({
      where: { user_id: userId, sync_enabled: true, family_integrations: { type: 'jellyfin' } },
      orderBy: { created_at: 'asc' },
      include: MEMBER_LINK_INCLUDE,
    });
    if (!link) return null;
    return linkToConfig(rowToMemberLink(link));
  } catch (error) {
    logger.warn('Failed to fetch Jellyfin config:', error);
    return null;
  }
}

/**
 * Fetch a user's Jellyfin config for playback purposes.
 * Unlike getJellyfinConfig, this does NOT require sync_enabled to be true —
 * a user may want to play from Jellyfin without bidirectional sync.
 */
export async function getJellyfinConfigForPlayback(
  userId: string
): Promise<JellyfinConfig | null> {
  try {
    const link = await prisma.integration_member_links.findFirst({
      where: { user_id: userId, family_integrations: { type: 'jellyfin' } },
      orderBy: { created_at: 'asc' },
      include: MEMBER_LINK_INCLUDE,
    });
    if (!link) return null;
    return linkToConfig(rowToMemberLink(link));
  } catch (error) {
    logger.warn('Failed to fetch Jellyfin config for playback:', error);
    return null;
  }
}

/**
 * Look up the family Jellyfin integration by its webhook secret token.
 * Used by the webhook endpoint to authenticate the request source — the secret
 * identifies the *server/family*, and the payload's Jellyfin user id then
 * routes the event to the right member (see getMemberConfigByJellyfinUser).
 */
export async function getJellyfinIntegrationByWebhookSecret(
  webhookSecret: string
): Promise<JellyfinIntegration | null> {
  try {
    const integ = await prisma.family_integrations.findFirst({
      where: { webhook_secret: webhookSecret, type: 'jellyfin' },
      select: { id: true, family_id: true, server_url: true, api_key: true, webhook_secret: true },
    });
    if (!integ) return null;
    return integ as unknown as JellyfinIntegration;
  } catch (error) {
    logger.warn('Failed to look up Jellyfin integration by webhook secret:', error);
    return null;
  }
}

/**
 * Resolve the member config for a given Jellyfin user id on a specific
 * integration. One webhook URL (per family server) serves every connected
 * member — the payload's Jellyfin user id selects whose history to sync.
 */
export async function getMemberConfigByJellyfinUser(
  integrationId: string,
  jellyfinUserId: string
): Promise<JellyfinConfig | null> {
  try {
    const link = await prisma.integration_member_links.findFirst({
      where: { integration_id: integrationId, external_user_id: jellyfinUserId, sync_enabled: true },
      include: MEMBER_LINK_INCLUDE,
    });
    if (!link) return null;
    return linkToConfig(rowToMemberLink(link));
  } catch (error) {
    logger.warn('Failed to resolve member by Jellyfin user id:', error);
    return null;
  }
}

/**
 * Connect (or re-connect) a user's Jellyfin account.
 *
 * Attaches a family-owned Jellyfin integration for the user's primary family
 * (creating the family and/or the integration if needed) and upserts the user's
 * personal member link. Multiple members pointing at the same server within a
 * family share one integration — and therefore one webhook URL.
 */
export async function linkJellyfinAccount(params: {
  userId: string;
  serverUrl: string;
  apiKey: string;
  jellyfinUserId: string;
  jellyfinUsername?: string | null;
}): Promise<{ integrationId: string; webhookSecret: string }> {
  const serverUrl = params.serverUrl.replace(/\/+$/, '');

  // Prefer an EXISTING Jellyfin integration for this server in ANY family the
  // user belongs to — that's how an invited member links onto the family's
  // shared server rather than spinning up their own. Only create a new
  // integration (in their primary family) if none exists yet.
  let integration: { id: string; webhook_secret: string } | null = null;

  const memberships = await prisma.family_members.findMany({
    where: { user_id: params.userId },
    select: { family_id: true },
  });
  const familyIds = memberships.map((m) => m.family_id);

  if (familyIds.length > 0) {
    integration = await prisma.family_integrations.findFirst({
      where: { family_id: { in: familyIds }, type: 'jellyfin', server_url: serverUrl },
      select: { id: true, webhook_secret: true },
    });
  }

  if (!integration) {
    const familyId = await getOrCreatePrimaryFamily(params.userId);
    try {
      integration = await prisma.family_integrations.create({
        data: {
          family_id: familyId,
          type: 'jellyfin',
          server_url: serverUrl,
          api_key: params.apiKey,
          created_by: params.userId,
        },
        select: { id: true, webhook_secret: true },
      });
    } catch (error) {
      throw new Error(
        `Failed to create Jellyfin integration: ${error instanceof Error ? error.message : 'unknown error'}`
      );
    }
  }

  try {
    await prisma.integration_member_links.upsert({
      where: {
        integration_id_user_id: { integration_id: integration.id, user_id: params.userId },
      },
      create: {
        integration_id: integration.id,
        user_id: params.userId,
        external_user_id: params.jellyfinUserId,
        external_username: params.jellyfinUsername ?? null,
        access_token: params.apiKey,
        sync_enabled: true,
      },
      update: {
        external_user_id: params.jellyfinUserId,
        external_username: params.jellyfinUsername ?? null,
        access_token: params.apiKey,
        sync_enabled: true,
        updated_at: new Date(),
      },
    });
  } catch (error) {
    throw new Error(
      `Failed to link Jellyfin account: ${error instanceof Error ? error.message : 'unknown error'}`
    );
  }

  return { integrationId: integration.id, webhookSecret: integration.webhook_secret };
}

// ============================================================
// In-memory anti-loop dedup
// ============================================================

/**
 * In-memory map to track recent sync events and prevent sync loops.
 * Key: "userId:direction:mediaType:mediaId" → timestamp of last successful sync.
 *
 * This replaces the database-backed jellyfin_sync_log table to avoid
 * unnecessary storage usage on Supabase.
 */
const recentSyncTimestamps = new Map<string, number>();

/** Max entries before pruning old ones */
const MAX_DEDUP_ENTRIES = 500;

function makeDedupKey(
  userId: string,
  direction: 'to_jellyfin' | 'from_jellyfin',
  mediaType: string,
  mediaId: number
): string {
  return `${userId}:${direction}:${mediaType}:${mediaId}`;
}

/**
 * Record a successful sync event for anti-loop dedup.
 */
function recordSyncEvent(
  userId: string,
  direction: 'to_jellyfin' | 'from_jellyfin',
  mediaType: string,
  mediaId: number
): void {
  const key = makeDedupKey(userId, direction, mediaType, mediaId);
  recentSyncTimestamps.set(key, Date.now());

  // Prune old entries to prevent memory leak
  if (recentSyncTimestamps.size > MAX_DEDUP_ENTRIES) {
    const cutoff = Date.now() - JELLYFIN_SYNC.DEDUP_WINDOW_SECONDS * 1000 * 2;
    for (const [k, ts] of recentSyncTimestamps) {
      if (ts < cutoff) recentSyncTimestamps.delete(k);
    }
  }
}

/**
 * Check if a recent sync in the opposite direction happened for the same item.
 * Used as a secondary anti-loop safety net alongside sync_source.
 *
 * Returns true if sync should be SKIPPED (recent opposite sync found).
 */
function shouldSkipDueToRecentSync(
  userId: string,
  mediaType: string,
  mediaId: number,
  oppositeDirection: 'to_jellyfin' | 'from_jellyfin'
): boolean {
  const key = makeDedupKey(userId, oppositeDirection, mediaType, mediaId);
  const lastSync = recentSyncTimestamps.get(key);
  if (!lastSync) return false;
  return Date.now() - lastSync < JELLYFIN_SYNC.DEDUP_WINDOW_SECONDS * 1000;
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
    if (shouldSkipDueToRecentSync(userId, mediaType, mediaId, 'from_jellyfin')) {
      logger.debug('Skipping to_jellyfin sync — recent from_jellyfin sync detected', {
        userId,
        mediaType,
        mediaId,
      });
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

    recordSyncEvent(userId, 'to_jellyfin', mediaType, mediaId);
    logger.info('Synced to Jellyfin', { userId, mediaType, mediaId, percentageWatched });

    return { success: true, action: 'synced', message: 'Synced to Jellyfin' };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to sync to Jellyfin:', { userId, mediaType, mediaId, error: errorMsg });
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
  const {
    userId,
    tmdbId,
    mediaType,
    seasonNumber,
    episodeNumber,
    percentageWatched,
    timeSpent,
    playbackPosition,
  } = params;

  try {
    // 1. Anti-loop: skip if we recently synced TO Jellyfin for this item
    if (shouldSkipDueToRecentSync(userId, mediaType, tmdbId, 'to_jellyfin')) {
      logger.debug('Skipping from_jellyfin sync — recent to_jellyfin sync detected', {
        userId,
        mediaType,
        tmdbId,
      });
      return { success: true, action: 'skipped', message: 'Anti-loop dedup' };
    }

    // 2. Upsert into watch_history with sync_source='jellyfin'
    const normalizedSeason = seasonNumber ?? -1;
    const normalizedEpisode = episodeNumber ?? -1;

    // Store the playback position (in seconds) so the Videasy player
    // can resume from where the user left off on Jellyfin.
    const positionSeconds =
      playbackPosition != null && playbackPosition > 0 ? Math.floor(playbackPosition) : null;

    await rpc('upsert_watch_history_atomic', {
      p_user_id: userId,
      p_media_type: mediaType,
      p_media_id: tmdbId,
      p_new_time_spent: Math.round(timeSpent),
      p_new_percentage: percentageWatched,
      p_season_number: normalizedSeason,
      p_episode_number: normalizedEpisode,
      p_sync_source: 'jellyfin',
      p_playback_position: positionSeconds,
    });

    recordSyncEvent(userId, 'from_jellyfin', mediaType, tmdbId);
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

  // Check current local state — only sync if percentage actually differs
  const normalizedSeason = seasonNumber ?? -1;
  const normalizedEpisode = episodeNumber ?? -1;

  const existing = await prisma.watch_history.findFirst({
    where: {
      user_id: userId,
      media_type: mediaType,
      media_id: tmdbId,
      season_number: normalizedSeason,
      episode_number: normalizedEpisode,
    },
    select: { percentage_watched: true },
  });

  const localPercentage = existing ? parseFloat(String(existing.percentage_watched)) : 0;

  // Only sync if there's a meaningful difference (>2% to avoid noise)
  if (Math.abs(percentageWatched - localPercentage) < 2) {
    return { action: 'skipped', error: 'Local progress is already in sync' };
  }

  // Sync it — overwrites local percentage with Jellyfin's current value
  const result = await syncFromJellyfin({
    userId,
    tmdbId,
    mediaType,
    seasonNumber,
    episodeNumber,
    percentageWatched,
    timeSpent: timeSpentSeconds > 0 ? timeSpentSeconds : 30,
    playbackPosition: timeSpentSeconds > 0 ? timeSpentSeconds : null,
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
