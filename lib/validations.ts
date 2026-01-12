/**
 * Zod validation schemas for database operations and API inputs
 */

import { z } from 'zod';
import { WATCH_HISTORY, RATING, USER, POST } from './constants';

/**
 * User validation schemas
 */
export const userSchema = z.object({
  id: z.number().int().positive(), // Changed to number to match IUser type
  name: z.string().min(1).max(100),
  username: z
    .string()
    .min(USER.MIN_USERNAME_LENGTH)
    .max(USER.MAX_USERNAME_LENGTH)
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string().email(),
  image_url: z.string().url(),
  postsId: z.array(z.number().int().positive()),
  likes: z.array(z.string()),
  saves: z.array(z.string()),
  backdrop_url: z.string().url(),
  feed_genres: z.array(
    z.object({
      genre_code: z.string(),
      media_type: z.enum(['movie', 'tv']),
    })
  ),
  premium: z.boolean(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export const updateUserSchema = userSchema.partial().required({ id: true });

export type User = z.infer<typeof userSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;

/**
 * Feed genre schema
 */
export const feedGenreSchema = z.object({
  genre_code: z.string().min(1),
  media_type: z.enum(['movie', 'tv']),
});

export type FeedGenre = z.infer<typeof feedGenreSchema>;

/**
 * Watch history validation schemas
 */
export const watchHistorySchema = z.object({
  user_id: z.string().uuid(),
  media_type: z.enum(['movie', 'tv']),
  media_id: z.number().int().positive(),
  time_spent: z.number().nonnegative(),
  percentage_watched: z
    .number()
    .min(WATCH_HISTORY.MIN_PERCENTAGE_WATCHED)
    .max(WATCH_HISTORY.MAX_PERCENTAGE_WATCHED),
  season_number: z.number().int().positive().nullable(),
  episode_number: z.number().int().positive().nullable(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  hidden_until: z.string().datetime().nullable().optional(),
});

export const upsertWatchHistorySchema = z.object({
  user_id: z.string().uuid(),
  media_type: z.enum(['movie', 'tv']),
  media_id: z.number().int().positive(),
  new_time_spent: z.number().nonnegative(),
  new_percentage_watched: z.string().regex(/^\d+(\.\d+)?$/, 'Must be a valid number string'),
  season_number: z.number().int().positive().nullable(),
  episode_number: z.number().int().positive().nullable(),
});

export const getWatchTimeSchema = z.object({
  user_id: z.string().uuid(),
  media_type: z.enum(['movie', 'tv']),
  media_id: z.number().int().positive(),
  season_number: z.number().int().positive().nullable().optional(),
  episode_number: z.number().int().positive().nullable().optional(),
});

export type WatchHistory = z.infer<typeof watchHistorySchema>;
export type UpsertWatchHistory = z.infer<typeof upsertWatchHistorySchema>;
export type GetWatchTime = z.infer<typeof getWatchTimeSchema>;

/**
 * Post validation schemas
 */
export const postSchema = z.object({
  id: z.string().uuid(),
  created_at: z.string().datetime(),
  media_id: z.number().int().positive(),
  media_type: z.enum(['movie', 'tv']),
  vote_user: z.number().min(RATING.MIN).max(RATING.MAX),
  review_user: z.string().max(POST.MAX_CONTENT_LENGTH),
  creatorId: z.string().uuid(),
  comments: z.array(z.string().uuid()),
  likes: z.array(z.string().uuid()),
  saves: z.array(z.string().uuid()),
  updated_at: z.string().datetime().optional(),
});

export const createPostSchema = postSchema.omit({
  id: true,
  created_at: true,
  comments: true,
  likes: true,
  saves: true,
});

export const updatePostSchema = postSchema.partial().required({ id: true });

export type Post = z.infer<typeof postSchema>;
export type CreatePost = z.infer<typeof createPostSchema>;
export type UpdatePost = z.infer<typeof updatePostSchema>;

/**
 * Media validation schemas
 */
export const mediaSchema = z.object({
  id: z.number().int().positive(),
  created_at: z.string().datetime().optional(),
  creator: z.string().optional(),
  rating: z.number().min(RATING.MIN).max(RATING.MAX).optional(),
  title: z.string().optional(),
  name: z.string().optional(),
  vote_average: z.number().min(0).max(10),
  poster_path: z.string().nullable(),
  overview: z.string(),
  release_date: z.string().optional(),
  media_type: z.enum(['movie', 'tv']),
  first_air_date: z.string().optional(),
});

export type Media = z.infer<typeof mediaSchema>;

/**
 * Comment validation schemas
 */
export const commentSchema = z.object({
  id: z.string().uuid(),
  post_id: z.string().uuid(),
  user_id: z.string().uuid(),
  content: z.string().min(1).max(1000),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().optional(),
});

export const createCommentSchema = commentSchema.omit({
  id: true,
  created_at: true,
});

export type Comment = z.infer<typeof commentSchema>;
export type CreateComment = z.infer<typeof createCommentSchema>;

/**
 * Like/Save validation schemas
 */
export const likeSchema = z.object({
  user_id: z.string().uuid(),
  post_id: z.string().uuid(),
});

export const saveSchema = z.object({
  user_id: z.string().uuid(),
  post_id: z.string().uuid(),
});

export type Like = z.infer<typeof likeSchema>;
export type Save = z.infer<typeof saveSchema>;

/**
 * Search validation schemas
 */
export const searchQuerySchema = z.object({
  query: z.string().min(1).max(100),
  media_type: z.enum(['movie', 'tv', 'all']).optional(),
  page: z.number().int().positive().optional().default(1),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;

/**
 * Pagination schema
 */
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  offset: z.number().int().nonnegative().optional(),
});

export type Pagination = z.infer<typeof paginationSchema>;

/**
 * Genre stats schema
 */
export const genreStatsSchema = z.object({
  user_id: z.string().uuid(),
  genre_code: z.string(),
  media_type: z.enum(['movie', 'tv']),
  watch_count: z.number().int().nonnegative().default(0),
  total_watch_time: z.number().nonnegative().default(0),
});

export type GenreStats = z.infer<typeof genreStatsSchema>;

/**
 * Hide from continue watching schema
 */
export const hideFromContinueWatchingSchema = z.object({
  user_id: z.string().uuid(),
  media_type: z.enum(['movie', 'tv']),
  media_id: z.number().int().positive(),
  season_number: z.number().int().positive().nullable().optional(),
  episode_number: z.number().int().positive().nullable().optional(),
  hide_duration_days: z.number().int().positive().default(WATCH_HISTORY.HIDE_DURATION_DAYS),
});

export type HideFromContinueWatching = z.infer<typeof hideFromContinueWatchingSchema>;

/**
 * API Request validation schemas
 */

/**
 * Update genres schema - for /api/updateGenres endpoint
 */
export const updateGenresSchema = z.object({
  genreIds: z
    .array(z.number().int().positive())
    .min(1, 'At least one genre is required')
    .max(50, 'Maximum 50 genres allowed'),
  mediaType: z.enum(['movie', 'tv']),
});

export type UpdateGenres = z.infer<typeof updateGenresSchema>;

/**
 * IP address validation schema - for /api/check-ip endpoint
 * Uses Zod's built-in IP validation
 */
export const ipAddressSchema = z.object({
  ip: z.string().ip({ message: 'Invalid IP address format' }),
});

export type IPAddress = z.infer<typeof ipAddressSchema>;

/**
 * Save watch time schema - for /api/saveWatchTime endpoint
 */
export const saveWatchTimeSchema = z.object({
  time_spent: z.number().nonnegative(),
  percentage_watched: z.string().regex(/^\d+(\.\d+)?$/, 'Must be a valid number string'),
  media_type: z.enum(['movie', 'tv']),
  media_id: z.number().int().positive(),
  season_number: z.number().int().positive().nullable().optional(),
  episode_number: z.number().int().positive().nullable().optional(),
});

export type SaveWatchTime = z.infer<typeof saveWatchTimeSchema>;
