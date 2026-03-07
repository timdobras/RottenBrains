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

// ─── Discover API Types ──────────────────────────────────────────────

/**
 * Sort options for the Movie Discover endpoint
 */
export type MovieSortBy =
  | 'popularity.asc'
  | 'popularity.desc'
  | 'revenue.asc'
  | 'revenue.desc'
  | 'primary_release_date.asc'
  | 'primary_release_date.desc'
  | 'title.asc'
  | 'title.desc'
  | 'original_title.asc'
  | 'original_title.desc'
  | 'vote_average.asc'
  | 'vote_average.desc'
  | 'vote_count.asc'
  | 'vote_count.desc';

/**
 * Sort options for the TV Discover endpoint
 */
export type TVSortBy =
  | 'popularity.asc'
  | 'popularity.desc'
  | 'first_air_date.asc'
  | 'first_air_date.desc'
  | 'name.asc'
  | 'name.desc'
  | 'original_name.asc'
  | 'original_name.desc'
  | 'vote_average.asc'
  | 'vote_average.desc'
  | 'vote_count.asc'
  | 'vote_count.desc';

/**
 * Movie release types (can be combined with pipe | for OR)
 * 1=Premiere, 2=Theatrical Limited, 3=Theatrical, 4=Digital, 5=Physical, 6=TV
 */
export type MovieReleaseType = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * TV show status values
 * 0=Returning Series, 1=Planned, 2=In Production, 3=Ended, 4=Cancelled, 5=Pilot
 */
export type TVStatus = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * TV show type values
 * 0=Documentary, 1=News, 2=Miniseries, 3=Reality, 4=Scripted, 5=Talk Show, 6=Video
 */
export type TVType = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Watch monetization types
 */
export type WatchMonetizationType = 'flatrate' | 'free' | 'ads' | 'rent' | 'buy';

/**
 * Shared discover parameters (used by both movie and TV)
 */
export interface DiscoverParamsBase {
  page?: number;
  language?: string;
  sort_by?: string;
  include_adult?: boolean;

  // Vote / Rating
  'vote_average.gte'?: number;
  'vote_average.lte'?: number;
  'vote_count.gte'?: number;
  'vote_count.lte'?: number;

  // Genres
  with_genres?: string; // Comma (AND) or pipe (OR) separated IDs
  without_genres?: string;

  // Keywords
  with_keywords?: string;
  without_keywords?: string;

  // Companies
  with_companies?: string;
  without_companies?: string;

  // Origin / Language
  with_origin_country?: string;
  with_original_language?: string;

  // Runtime
  'with_runtime.gte'?: number;
  'with_runtime.lte'?: number;

  // Watch Providers
  watch_region?: string;
  with_watch_providers?: string;
  without_watch_providers?: string;
  with_watch_monetization_types?: string;
}

/**
 * Movie-specific discover parameters
 */
export interface DiscoverMovieParams extends DiscoverParamsBase {
  sort_by?: MovieSortBy;
  include_video?: boolean;
  region?: string;

  // Certification
  certification?: string;
  'certification.gte'?: string;
  'certification.lte'?: string;
  certification_country?: string;

  // Release dates
  primary_release_year?: number;
  'primary_release_date.gte'?: string;
  'primary_release_date.lte'?: string;
  'release_date.gte'?: string;
  'release_date.lte'?: string;
  year?: number;

  // Release type
  with_release_type?: string; // Pipe-separated MovieReleaseType values

  // People
  with_cast?: string;
  with_crew?: string;
  with_people?: string;
}

/**
 * TV-specific discover parameters
 */
export interface DiscoverTVParams extends DiscoverParamsBase {
  sort_by?: TVSortBy;
  include_null_first_air_dates?: boolean;
  screened_theatrically?: boolean;
  timezone?: string;

  // Air dates
  first_air_date_year?: number;
  'first_air_date.gte'?: string;
  'first_air_date.lte'?: string;
  'air_date.gte'?: string;
  'air_date.lte'?: string;

  // TV-specific
  with_networks?: string;
  with_status?: string; // Pipe-separated TVStatus values
  with_type?: string; // Pipe-separated TVType values
}

/**
 * Union of movie and TV discover params for the generic discover function
 */
export type DiscoverParams = DiscoverMovieParams | DiscoverTVParams;

/**
 * TMDB paginated response wrapper
 */
export interface TMDBPaginatedResponse<T = any> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

/**
 * TMDB keyword object (from /search/keyword)
 */
export interface TMDBKeyword {
  id: number;
  name: string;
}

/**
 * Discover filter state as used in the URL / UI
 * Uses string values for URL compatibility
 */
export interface DiscoverFilterState {
  type: 'movie' | 'tv';
  sort_by: string;
  with_genres: string;
  year_gte: string;
  year_lte: string;
  'vote_average.gte': string;
  'vote_average.lte': string;
  'vote_count.gte': string;
  'with_runtime.gte': string;
  'with_runtime.lte': string;
  with_original_language: string;
  with_origin_country: string;
  with_keywords: string;
  // Movie-only
  certification: string;
  with_release_type: string;
  // TV-only
  with_status: string;
  with_type: string;
  with_networks: string;
}
