/**
 * TMDB <-> Jellyfin ID mapping utilities
 *
 * Jellyfin items store TMDB IDs in their ProviderIds field:
 *   { "Tmdb": "12345", "Imdb": "tt1234567" }
 *
 * This module handles resolving between the two systems.
 */

import { logger } from '@/lib/logger';
import { getItemByTmdbId, getEpisode } from './client';
import type { JellyfinConfig, JellyfinProviderIds } from './types';

/**
 * Extract the TMDB ID from a Jellyfin item's provider IDs.
 * Returns null if no TMDB ID is found.
 */
export function extractTmdbId(providerIds: JellyfinProviderIds | undefined): number | null {
  if (!providerIds?.Tmdb) return null;
  const parsed = parseInt(providerIds.Tmdb, 10);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Map a Jellyfin item type to RottenBrains media_type.
 */
export function jellyfinTypeToMediaType(jellyfinType: string): 'movie' | 'tv' | null {
  switch (jellyfinType) {
    case 'Movie':
      return 'movie';
    case 'Series':
    case 'Episode':
    case 'Season':
      return 'tv';
    default:
      return null;
  }
}

/**
 * Resolve a TMDB ID + media type to a Jellyfin item.
 *
 * For movies: directly searches by TMDB provider ID.
 * For TV episodes: first finds the series, then the specific episode.
 *
 * Returns the Jellyfin item ID or null if not found in the user's library.
 */
export async function resolveJellyfinItemId(
  config: JellyfinConfig,
  tmdbId: number,
  mediaType: 'movie' | 'tv',
  seasonNumber?: number | null,
  episodeNumber?: number | null
): Promise<string | null> {
  try {
    if (mediaType === 'movie') {
      const item = await getItemByTmdbId(config, tmdbId, 'movie');
      return item?.Id || null;
    }

    // For TV: find the series first, then the episode
    const series = await getItemByTmdbId(config, tmdbId, 'tv');
    if (!series) return null;

    // If no specific episode requested, return the series ID
    if (!seasonNumber || !episodeNumber) {
      return series.Id;
    }

    // Find the specific episode
    const episode = await getEpisode(config, series.Id, seasonNumber, episodeNumber);
    return episode?.Id || null;
  } catch (error) {
    logger.warn('Failed to resolve Jellyfin item ID:', {
      tmdbId,
      mediaType,
      seasonNumber,
      episodeNumber,
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return null;
  }
}

/**
 * Extract media info from a Jellyfin webhook item payload.
 * Returns the TMDB ID, media type, season, and episode numbers.
 */
export function extractMediaInfoFromWebhook(item: {
  Type: string;
  ProviderIds?: JellyfinProviderIds;
  ParentIndexNumber?: number;
  IndexNumber?: number;
  SeriesId?: string;
}): {
  tmdbId: number | null;
  mediaType: 'movie' | 'tv' | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
} {
  const tmdbId = extractTmdbId(item.ProviderIds);
  const mediaType = jellyfinTypeToMediaType(item.Type);

  let seasonNumber: number | null = null;
  let episodeNumber: number | null = null;

  if (item.Type === 'Episode') {
    seasonNumber = item.ParentIndexNumber ?? null;
    episodeNumber = item.IndexNumber ?? null;
  }

  return { tmdbId, mediaType, seasonNumber, episodeNumber };
}
