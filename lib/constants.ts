/**
 * Application-wide constants
 * Centralizes magic numbers and strings for better maintainability
 */

/**
 * Pagination settings
 */
export const PAGINATION = {
  POSTS_PER_PAGE: 10,
  MEDIA_PER_PAGE: 12,
  COMMENTS_PER_PAGE: 10,
  SEARCH_RESULTS_PER_PAGE: 12,
  WATCH_HISTORY_PER_PAGE: 6,
  MAX_PAGES: 10,
  INFINITE_SCROLL_THRESHOLD: 0.1,
  INFINITE_SCROLL_ROOT_MARGIN: '200px',
} as const;

/**
 * Media types
 */
export const MEDIA_TYPES = {
  MOVIE: 'movie',
  TV: 'tv',
} as const;

export type MediaType = (typeof MEDIA_TYPES)[keyof typeof MEDIA_TYPES];

/**
 * API configuration
 */
export const API_CONFIG = {
  TMDB_IMAGE_BASE_URL: 'https://image.tmdb.org/',
  TMDB_IMAGE_SIZES: {
    POSTER_SMALL: 'w185',
    POSTER_MEDIUM: 'w342',
    POSTER_LARGE: 'w500',
    POSTER_XLARGE: 'w780',
    POSTER_ORIGINAL: 'original',
    BACKDROP_SMALL: 'w300',
    BACKDROP_MEDIUM: 'w780',
    BACKDROP_LARGE: 'w1280',
    BACKDROP_ORIGINAL: 'original',
  },
  REQUEST_TIMEOUT: 10000, // 10 seconds
} as const;

/**
 * Watch history constants
 */
export const WATCH_HISTORY = {
  MIN_PERCENTAGE_WATCHED: 0,
  MAX_PERCENTAGE_WATCHED: 100,
  CONTINUE_WATCHING_THRESHOLD: 5, // 5% watched minimum
  COMPLETED_THRESHOLD: 90, // 90% watched = completed
  HIDE_DURATION_DAYS: 30, // Days to hide from continue watching
} as const;

/**
 * Post constants
 */
export const POST = {
  MAX_CONTENT_LENGTH: 5000,
  MAX_TITLE_LENGTH: 200,
  PREVIEW_LENGTH: 150,
} as const;

/**
 * User constants
 */
export const USER = {
  MAX_USERNAME_LENGTH: 30,
  MIN_USERNAME_LENGTH: 3,
  MAX_BIO_LENGTH: 500,
  DEFAULT_AVATAR_API: 'https://ui-avatars.com/api/',
} as const;

/**
 * Rating constants
 */
export const RATING = {
  MIN: 0,
  MAX: 10,
  STEP: 0.5,
} as const;

/**
 * Cache durations (in seconds)
 */
export const CACHE = {
  TRENDING_MEDIA: 3600, // 1 hour
  MEDIA_DETAILS: 86400, // 24 hours
  USER_PROFILE: 300, // 5 minutes
  SEARCH_RESULTS: 1800, // 30 minutes
} as const;

/**
 * Error codes
 */
export const ERROR_CODES = {
  // Authentication errors
  AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',

  // Database errors
  DB_QUERY_FAILED: 'DB_QUERY_FAILED',
  DB_NOT_FOUND: 'DB_NOT_FOUND',
  DB_DUPLICATE: 'DB_DUPLICATE',
  DB_CONSTRAINT_VIOLATION: 'DB_CONSTRAINT_VIOLATION',

  // Validation errors
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_INPUT: 'INVALID_INPUT',

  // API errors
  API_REQUEST_FAILED: 'API_REQUEST_FAILED',
  API_RATE_LIMITED: 'API_RATE_LIMITED',

  // General errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * Routes
 */
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  EXPLORE: '/protected/explore',
  WATCH_HISTORY: '/protected/watch-history',
  PROFILE: '/protected/profile',
  WATCH_MOVIE: (movieId: number) => `/protected/watch/movie/${movieId}`,
  WATCH_TV: (tvId: number, season: number, episode: number) =>
    `/protected/watch/tv/${tvId}/${season}/${episode}`,
  MEDIA_DETAIL: (mediaType: string, mediaId: number) => `/protected/media/${mediaType}/${mediaId}`,
  USER_PROFILE: (username: string) => `/protected/user/${username}`,
} as const;

/**
 * Local storage keys
 */
export const STORAGE_KEYS = {
  THEME: 'theme',
  RECENT_SEARCHES: 'recent_searches',
  WATCH_PREFERENCES: 'watch_preferences',
} as const;

/**
 * Animation durations (in milliseconds)
 */
export const ANIMATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;

/**
 * Breakpoints (matches Tailwind defaults)
 */
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
} as const;
