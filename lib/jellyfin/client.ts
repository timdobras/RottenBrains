/**
 * Jellyfin API client
 * Server-side only — all Jellyfin API calls go through this module.
 * Handles authentication, item lookup, and playback reporting.
 */

import { API_CONFIG } from '@/lib/constants';
import { logger } from '@/lib/logger';
import type {
  JellyfinConfig,
  JellyfinItem,
  JellyfinItemsResponse,
  JellyfinUser,
  JellyfinServerInfo,
  ValidateConnectionResult,
} from './types';

// ============================================================
// Internal helpers
// ============================================================

/**
 * Normalize server URL — strip trailing slash, ensure http(s)
 */
function normalizeUrl(url: string): string {
  let normalized = url.trim().replace(/\/+$/, '');
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = `http://${normalized}`;
  }
  return normalized;
}

/**
 * Build headers for Jellyfin API requests
 */
function buildHeaders(apiKey: string): Record<string, string> {
  return {
    'X-Emby-Token': apiKey,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

/**
 * Make an authenticated request to the Jellyfin server
 */
async function jellyfinFetch<T>(
  config: Pick<JellyfinConfig, 'server_url' | 'api_key'>,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${normalizeUrl(config.server_url)}${path}`;
  const headers = buildHeaders(config.api_key);

  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
    signal: AbortSignal.timeout(API_CONFIG.REQUEST_TIMEOUT),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Jellyfin API error (${response.status}): ${errorText}`);
  }

  // Some endpoints return empty responses (204, etc.)
  const text = await response.text();
  if (!text) return {} as T;

  return JSON.parse(text) as T;
}

// ============================================================
// Public API
// ============================================================

/**
 * Validate that a Jellyfin connection is working.
 * Tests the server URL, API key, and user ID.
 */
export async function validateConnection(
  serverUrl: string,
  apiKey: string,
  jellyfinUserId: string
): Promise<ValidateConnectionResult> {
  try {
    const config = { server_url: serverUrl, api_key: apiKey };

    // Test 1: Get server info
    const serverInfo = await jellyfinFetch<JellyfinServerInfo>(config, '/System/Info/Public');
    if (!serverInfo.ServerName) {
      return { valid: false, error: 'Could not reach Jellyfin server' };
    }

    // Test 2: Validate the API key by fetching users
    const users = await jellyfinFetch<JellyfinUser[]>(config, '/Users');

    // Test 3: Verify the specified user exists
    const userExists = users.some((u) => u.Id === jellyfinUserId);
    if (!userExists) {
      return {
        valid: false,
        error: `User ID "${jellyfinUserId}" not found on this Jellyfin server`,
      };
    }

    return { valid: true, serverName: serverInfo.ServerName };
  } catch (error) {
    logger.error('Jellyfin connection validation failed:', error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

/**
 * List all users on a Jellyfin server.
 * Used in settings UI so the user can pick which Jellyfin account to sync with.
 */
export async function listUsers(serverUrl: string, apiKey: string): Promise<JellyfinUser[]> {
  const config = { server_url: serverUrl, api_key: apiKey };
  return jellyfinFetch<JellyfinUser[]>(config, '/Users');
}

/**
 * Search for a Jellyfin item by its TMDB provider ID.
 * Returns the first matching item, or null if not found.
 */
export async function getItemByTmdbId(
  config: JellyfinConfig,
  tmdbId: number,
  mediaType: 'movie' | 'tv'
): Promise<JellyfinItem | null> {
  try {
    // Jellyfin supports searching by provider ID
    const jellyfinType = mediaType === 'movie' ? 'Movie' : 'Series';
    const path =
      `/Users/${config.jellyfin_user_id}/Items` +
      `?AnyProviderIdEquals=tmdb.${tmdbId}` +
      `&IncludeItemTypes=${jellyfinType}` +
      `&Recursive=true` +
      `&Fields=ProviderIds,UserData`;

    const response = await jellyfinFetch<JellyfinItemsResponse>(config, path);

    if (response.Items && response.Items.length > 0) {
      return response.Items[0];
    }

    return null;
  } catch (error) {
    logger.warn('Failed to find Jellyfin item by TMDB ID:', {
      tmdbId,
      mediaType,
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return null;
  }
}

/**
 * Find a specific episode within a series on Jellyfin.
 * First finds the series by TMDB ID, then locates the specific episode.
 */
export async function getEpisode(
  config: JellyfinConfig,
  seriesItemId: string,
  seasonNumber: number,
  episodeNumber: number
): Promise<JellyfinItem | null> {
  try {
    // Get episodes for the series, filtered by season and episode number
    const path =
      `/Shows/${seriesItemId}/Episodes` +
      `?UserId=${config.jellyfin_user_id}` +
      `&Season=${seasonNumber}` +
      `&Fields=ProviderIds,UserData`;

    const response = await jellyfinFetch<JellyfinItemsResponse>(config, path);

    if (response.Items) {
      const episode = response.Items.find(
        (item) => item.IndexNumber === episodeNumber && item.ParentIndexNumber === seasonNumber
      );
      return episode || null;
    }

    return null;
  } catch (error) {
    logger.warn('Failed to find Jellyfin episode:', {
      seriesItemId,
      seasonNumber,
      episodeNumber,
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return null;
  }
}

/**
 * Report playback progress to Jellyfin.
 * Sends the current playback position so Jellyfin tracks "resume" state.
 *
 * @param positionTicks - Position in Jellyfin ticks (1 second = 10,000,000 ticks)
 */
export async function reportPlaybackProgress(
  config: JellyfinConfig,
  jellyfinItemId: string,
  positionTicks: number
): Promise<void> {
  await jellyfinFetch(config, '/Sessions/Playing/Progress', {
    method: 'POST',
    body: JSON.stringify({
      ItemId: jellyfinItemId,
      PositionTicks: Math.round(positionTicks),
      IsPaused: false,
      IsMuted: false,
      PlayMethod: 'DirectPlay',
    }),
  });
}

/**
 * Mark an item as fully played on Jellyfin.
 */
export async function markAsPlayed(config: JellyfinConfig, jellyfinItemId: string): Promise<void> {
  await jellyfinFetch(config, `/Users/${config.jellyfin_user_id}/PlayedItems/${jellyfinItemId}`, {
    method: 'POST',
  });
}

/**
 * Convert a percentage (0-100) and runtime (minutes) to Jellyfin ticks.
 * Jellyfin ticks: 1 second = 10,000,000 ticks
 */
export function percentageToTicks(percentage: number, runtimeMinutes: number): number {
  const totalSeconds = runtimeMinutes * 60;
  const watchedSeconds = (percentage / 100) * totalSeconds;
  return Math.round(watchedSeconds * 10_000_000);
}

/**
 * Convert Jellyfin ticks to seconds.
 */
export function ticksToSeconds(ticks: number): number {
  return Math.round(ticks / 10_000_000);
}

/**
 * Convert Jellyfin ticks to percentage given total runtime ticks.
 */
export function ticksToPercentage(positionTicks: number, runtimeTicks: number): number {
  if (runtimeTicks <= 0) return 0;
  return Math.min((positionTicks / runtimeTicks) * 100, 100);
}
