/**
 * Shared TypeScript types for TMDB media data.
 * Used across the hero carousel, media rows, and other components.
 */

export interface TMDBLogo {
  file_path: string;
  iso_639_1: string;
  vote_average: number;
  width: number;
}

export interface TMDBGenre {
  id: number;
  name: string;
}

/**
 * Enriched media item — a TMDB result augmented with detail data
 * (images, genres, runtime, etc.) from getMovieDetails/getTVDetails.
 */
export interface EnrichedMediaItem {
  id: number;
  title?: string;
  name?: string;
  backdrop_path: string | null;
  poster_path: string | null;
  overview: string;
  media_type: string;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  runtime?: number;
  number_of_episodes?: number;
  number_of_seasons?: number;
  genres?: TMDBGenre[];
  images?: {
    logos?: TMDBLogo[];
    backdrops?: { file_path: string }[];
  };
}

export interface TMDBBrand {
  id: number;
  name: string;
  logo_path: string | null;
}
