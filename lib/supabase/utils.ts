/**
 * Shared utility functions for Supabase queries
 * These are pure functions that don't require 'use server'
 */

// Types used across server and client queries
export type Episode = {
  media_id: number;
  media_type: string;
  season_number: number;
  episode_number: number;
  next_episode: boolean;
  next_season_number?: number | null;
  next_episode_number?: number | null;
};

export interface User {
  id: string;
}

export interface WatchListItem {
  media_id: number;
}

export interface UpdateGenreStatsParams {
  genreIds: bigint[];
  mediaType: string;
  userId: string;
}

export interface NewEpisode {
  user_id: string;
  tv_id: number;
  last_air_date: string;
  season_number: number;
  episode_number: number;
  updated_at?: string;
  created_at?: string;
}

/**
 * Combine user's feed genres with recommended to ensure at least 5 total.
 */
export function ensureAtLeastFiveGenres(
  userFeed: { genre_code: string; media_type: 'movie' | 'tv' }[],
  recommended: { genre_code: string; value: number }[],
  mediaType: 'movie' | 'tv'
) {
  // Sort recommended by highest value first (descending)
  recommended.sort((a, b) => b.value - a.value);

  // Start with the user's feed genres
  const finalGenres = [...userFeed];

  // If user has fewer than 5, fill with recommended
  if (finalGenres.length < 5) {
    for (const rec of recommended) {
      // Avoid duplicates by checking genre_code
      if (!finalGenres.some((item) => item.genre_code === rec.genre_code)) {
        finalGenres.push({
          genre_code: rec.genre_code,
          media_type: mediaType,
        });
      }
      if (finalGenres.length >= 5) break;
    }
  }

  return finalGenres;
}
