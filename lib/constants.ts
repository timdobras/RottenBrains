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
  MINIPLAYER_STATE: 'miniplayer_state',
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
 * Jellyfin sync constants
 */
export const JELLYFIN_SYNC = {
  /** Percentage threshold at which an item is marked as "played" in Jellyfin */
  MARK_PLAYED_THRESHOLD: 90,
  /** Seconds within which a reverse-direction sync is considered a loop and skipped */
  DEDUP_WINDOW_SECONDS: 60,
  /** Jellyfin ticks per second (1 second = 10,000,000 ticks) */
  TICKS_PER_SECOND: 10_000_000,
  /** Default estimated runtime in minutes when TMDB data is unavailable */
  DEFAULT_MOVIE_RUNTIME: 120,
  DEFAULT_EPISODE_RUNTIME: 45,
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

/**
 * Major film studios for brand/studio row
 */
export const STUDIOS = [
  { id: 420, name: 'Marvel Studios', logo_path: '/hUzeosd33nzE5MCNsZxCGEKTXaQ.png' },
  { id: 174, name: 'Warner Bros. Pictures', logo_path: '/zhD3hhtKB5qyv7ZeL4uLpNxgMVU.png' },
  { id: 33, name: 'Universal Pictures', logo_path: '/8lvHyhjr8oUKOOy2dKXoALWKdp0.png' },
  { id: 2, name: 'Walt Disney Pictures', logo_path: '/wdrCwmRnLFJhEoH8GSfymY85KHT.png' },
  { id: 25, name: '20th Century Studios', logo_path: '/qZCc1lty5FzX30aOCVRBLzaVmcp.png' },
  { id: 4, name: 'Paramount Pictures', logo_path: '/gz66EfNoYPqHTYI4q9UEN4CbHRc.png' },
  { id: 34, name: 'Sony Pictures', logo_path: '/GagSvqWlyPdkFHMfQ3pNq6ix9P.png' },
  { id: 21, name: 'Metro-Goldwyn-Mayer', logo_path: '/usUnaYV6hQnlVAXP6r4HwrlLFPG.png' },
  { id: 7505, name: 'Lionsgate', logo_path: '/cisLn1YAUuptXVBa0xjq7ST9cH0.png' },
  { id: 3, name: 'Pixar', logo_path: '/1TjvGVDMYsj6JBxOAkUHpPEwLf7.png' },
  { id: 521, name: 'DreamWorks Animation', logo_path: '/kP7t6RwGz2AvvTkvnI1uteEwHet.png' },
  { id: 9993, name: 'DC Studios', logo_path: '/2Tc1P3Ac8M479naPp1kYT3izLS5.png' },
] as const;

/**
 * Major streaming/TV networks for brand/network row
 */
export const NETWORKS = [
  { id: 213, name: 'Netflix', logo_path: '/wwemzKWzjKYJFfCeiB57q3r4Bcm.png' },
  { id: 2739, name: 'Disney+', logo_path: '/gJ8VX6JSu3ciXHuC2dDGAo2lvwM.png' },
  { id: 49, name: 'HBO', logo_path: '/tuomPhY2UtuPTqqFnKMVHvSb724.png' },
  { id: 2552, name: 'Apple TV+', logo_path: '/4KAy34EHvRM25Ih8wb82AuGU7zJ.png' },
  { id: 1024, name: 'Amazon', logo_path: '/ifhbNuuVnlwYy5oXA5VIb2YR8AZ.png' },
  { id: 2, name: 'ABC', logo_path: '/ndAvF4JLsliGreX87jAc9GdjmJY.png' },
  { id: 6, name: 'NBC', logo_path: '/cm111bsDVlYaC1foL0itvEI4yLG.png' },
  { id: 16, name: 'CBS', logo_path: '/wju8KhOUsR5y4bH9p3Jc50hhaLO.png' },
  { id: 19, name: 'FOX', logo_path: '/1DSpHrWyOORkL9N2QHX7Adt31mQ.png' },
  { id: 67, name: 'Showtime', logo_path: '/Allse9kbjiP6ExaQrnSpIhkurEi.png' },
  { id: 453, name: 'Hulu', logo_path: '/pqUTCleNUiTLAVlelGxUgWn1ELh.png' },
  { id: 3186, name: 'Paramount+', logo_path: '/fi83B1oztoS47xxcemFdPMhIzK.png' },
] as const;
