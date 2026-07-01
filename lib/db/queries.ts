import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/server/current-user';
import { handleError as handleAppError, DatabaseError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { IUser } from '@/types';
import { rpc, rpcOne, jsonb, serializeRows } from '@/lib/db/rpc';
import { upsertWatchHistorySchema } from '@/lib/validations';
import {
  ensureAtLeastFiveGenres,
  type Episode,
  type WatchHistoryItem,
  type User,
  type WatchListItem,
  type UpdateGenreStatsParams,
} from '@/lib/supabase/utils';

/**
 * True when a caught error is Postgres "function does not exist" (SQLSTATE
 * 42883) — surfaced either directly or wrapped by Prisma's raw-query error.
 * Used to fall back when an RPC migration hasn't been applied yet.
 */
function isFunctionMissingError(error: unknown): boolean {
  const e = error as { code?: string; meta?: { code?: string }; message?: string } | null;
  return (
    e?.code === '42883' ||
    e?.meta?.code === '42883' ||
    (e?.message?.includes('does not exist') ?? false)
  );
}

/**
 * Prisma-backed data queries — the strangler replacements for
 * `lib/supabase/serverQueries.ts`. Same signatures, so call sites switch
 * imports one at a time. During coexistence these run against the SAME db the
 * supabase-js code uses (DATABASE_URL → Supabase); at the final flip
 * DATABASE_URL → the local Postgres. Identity comes from `getCurrentUserId()`.
 */

// The exact column set the old `users` selects used (kept identical).
const USER_PROFILE_SELECT = {
  id: true,
  name: true,
  username: true,
  email: true,
  image_url: true,
  backdrop_url: true,
  feed_genres: true,
  premium: true,
  bio: true,
  created_at: true,
} as const;

export async function getUserFromDB(id: string): Promise<{ user: IUser } | null> {
  try {
    const user = await prisma.users.findUnique({
      where: { id },
      select: USER_PROFILE_SELECT,
    });
    if (!user) throw new DatabaseError('Failed to fetch user from database');
    return { user: user as unknown as IUser };
  } catch (error) {
    handleAppError(error, 'getUserFromDB');
    return null;
  }
}

export const getCurrentUser = cache(async () => {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  try {
    return await prisma.users.findUnique({
      where: { id: userId },
      select: USER_PROFILE_SELECT,
    });
  } catch (error) {
    // Runs on nearly every request — fail soft rather than crash the render.
    handleAppError(error, 'getCurrentUser');
    return null;
  }
});

export async function getPostById(post_id: string): Promise<any | null> {
  try {
    const post = await prisma.posts.findUnique({
      where: { id: post_id },
      select: {
        id: true,
        created_at: true,
        creatorid: true,
        media_id: true,
        media_type: true,
        vote_user: true,
        review_user: true,
        total_likes: true,
        total_comments: true,
      },
    });
    if (!post) return null;
    // BigInt counts → number for the JSON/client boundary.
    return {
      ...post,
      total_likes: Number(post.total_likes ?? 0),
      total_comments: Number(post.total_comments ?? 0),
    };
  } catch (error) {
    handleAppError(error, 'getPostById');
    return null;
  }
}

export const signOut = async () => {
  // Better Auth server-side sign-out (Supabase auth fully retired).
  await auth.api.signOut({ headers: await headers() });
};

export const getPostsOfMedia = async (
  user_id: string,
  media_type: string,
  media_id: number,
  page: number
): Promise<any | null> => {
  try {
    // Call the RPC function to fetch posts with media type and ID
    const postsData = await rpc('fetch_posts_by_media', {
      current_user_id: user_id,
      media_type_param: media_type,
      media_id_param: media_id,
      result_limit: 6,
      result_offset: page * 6,
    });

    // bigint total_likes/total_comments → number for the JSON/client boundary.
    return serializeRows(postsData);
  } catch (error) {
    logger.warn('getPostsByMedia', error);
    return null;
  }
};

export const upsertWatchHistory = async (
  user_id: string,
  media_type: string,
  media_id: number,
  new_time_spent: number,
  new_percentage_watched: string,
  season_number: number | null,
  episode_number: number | null,
  sync_source: string = 'app',
  playback_position: number | null = null
) => {
  try {
    // Validate input using Zod schema
    const validatedInput = upsertWatchHistorySchema.parse({
      user_id,
      media_type,
      media_id,
      new_time_spent,
      new_percentage_watched,
      season_number,
      episode_number,
    });

    logger.debug('Starting upsertWatchHistory with validated input:', validatedInput);

    const normalizedSeasonNumber = season_number ?? -1;
    const normalizedEpisodeNumber = episode_number ?? -1;
    const newPercentageFloat = parseFloat(new_percentage_watched);

    let data: unknown;
    try {
      // Use atomic RPC — single round-trip, no read-then-write race condition
      const row = await rpcOne<{ upsert_watch_history_atomic: unknown }>(
        'upsert_watch_history_atomic',
        {
          p_user_id: user_id,
          p_media_type: media_type,
          p_media_id: media_id,
          p_new_time_spent: new_time_spent,
          p_new_percentage: newPercentageFloat,
          p_season_number: normalizedSeasonNumber,
          p_episode_number: normalizedEpisodeNumber,
          p_sync_source: sync_source,
          p_playback_position: playback_position ?? undefined,
        }
      );
      data = row?.upsert_watch_history_atomic ?? null;
    } catch (error) {
      // Fallback to manual upsert if the RPC doesn't exist yet (migration not applied)
      if (isFunctionMissingError(error)) {
        logger.warn('Atomic RPC not found, falling back to manual upsert');
        return await upsertWatchHistoryFallback(
          user_id,
          media_type,
          media_id,
          new_time_spent,
          newPercentageFloat,
          normalizedSeasonNumber,
          normalizedEpisodeNumber
        );
      }
      logger.error('Error in atomic upsert RPC:', error);
      throw new DatabaseError('Failed to upsert watch history');
    }

    logger.debug('Atomic upsert successful:', data);
    return { success: true, action: 'upserted', data };
  } catch (error) {
    handleAppError(error, 'upsertWatchHistory');
    throw error;
  }
};

/** Fallback for when the atomic RPC migration hasn't been applied yet */
async function upsertWatchHistoryFallback(
  user_id: string,
  media_type: string,
  media_id: number,
  new_time_spent: number,
  newPercentageFloat: number,
  normalizedSeasonNumber: number,
  normalizedEpisodeNumber: number
) {
  let existingData: { percentage_watched: string | null; time_spent: number | null } | null;
  try {
    existingData = await prisma.watch_history.findFirst({
      where: {
        user_id,
        media_type,
        media_id,
        season_number: normalizedSeasonNumber,
        episode_number: normalizedEpisodeNumber,
      },
      select: { percentage_watched: true, time_spent: true },
    });
  } catch (error) {
    logger.error('Error fetching existing watch history:', error);
    throw new DatabaseError('Failed to fetch existing watch history');
  }

  const existingPercentage = existingData?.percentage_watched || 0;
  const updatedPercentage = Math.min(
    Number(existingPercentage) + Number(newPercentageFloat),
    100
  ).toFixed(2);

  const existingTimeSpent = existingData?.time_spent || 0;
  const updatedTimeSpent = Number(existingTimeSpent) + Number(new_time_spent);

  try {
    const row = await prisma.watch_history.upsert({
      where: {
        user_id_media_type_media_id_season_number_episode_number: {
          user_id,
          media_type,
          media_id,
          season_number: normalizedSeasonNumber,
          episode_number: normalizedEpisodeNumber,
        },
      },
      create: {
        user_id,
        media_type,
        media_id,
        time_spent: updatedTimeSpent,
        percentage_watched: updatedPercentage,
        season_number: normalizedSeasonNumber,
        episode_number: normalizedEpisodeNumber,
        created_at: new Date(),
        hidden_until: null,
      },
      update: {
        time_spent: updatedTimeSpent,
        percentage_watched: updatedPercentage,
        created_at: new Date(),
        hidden_until: null,
      },
    });

    // `.select()` in the supabase fallback returned an array of affected rows.
    return { success: true, action: 'upserted', data: [row] };
  } catch (error) {
    logger.error('Error during fallback upsert:', error);
    throw new DatabaseError('Failed to upsert watch history');
  }
}

export const getWatchTime = async (
  user_id: string,
  media_type: string,
  media_id: number,
  season_number?: number | null,
  episode_number?: number | null
) => {
  try {
    const row = await rpcOne<{ get_percentage_watched: string | null }>('get_percentage_watched', {
      p_user_id: user_id,
      p_media_type: media_type,
      p_media_id: media_id,
      p_season_number: season_number ?? undefined,
      p_episode_number: episode_number ?? undefined,
    });

    return row?.get_percentage_watched ?? null;
  } catch (error) {
    logger.warn('Error in getWatchTime:', error);
    return null;
  }
};

/**
 * Get the playback position (in seconds) for a specific media item.
 * Used to resume playback in players that support it (e.g. Videasy's ?progress= param).
 * Returns the position in seconds, or null if not available.
 */
export const getPlaybackPosition = async (
  user_id: string,
  media_type: string,
  media_id: number,
  season_number?: number | null,
  episode_number?: number | null
): Promise<number | null> => {
  try {
    const row = await rpcOne<{ get_playback_position: number | null }>('get_playback_position', {
      p_user_id: user_id,
      p_media_type: media_type,
      p_media_id: media_id,
      p_season_number: season_number ?? undefined,
      p_episode_number: episode_number ?? undefined,
    });

    return (row?.get_playback_position ?? null) as number | null;
  } catch (error) {
    // RPC might not exist yet if migration hasn't been applied
    if (isFunctionMissingError(error)) {
      logger.debug('get_playback_position RPC not found, returning null');
      return null;
    }
    logger.warn('Error in getPlaybackPosition:', error);
    return null;
  }
};

/**
 * Batch fetch watch times for multiple media items.
 * Returns a Map keyed by composite string "media_type-media_id-season-episode"
 * with watch time percentages.
 * Uses a single RPC call instead of N separate calls for better performance.
 */
export const getBatchWatchTimes = async (
  user_id: string,
  media_items: Array<{
    media_type: string;
    media_id: number;
    season_number?: number | null;
    episode_number?: number | null;
  }>
): Promise<Map<string, number>> => {
  const watchTimeMap = new Map<string, number>();

  if (!user_id || media_items.length === 0) {
    return watchTimeMap;
  }

  try {
    // Convert items to JSONB format for the batch RPC call
    const itemsPayload = media_items.map((item) => ({
      media_type: item.media_type,
      media_id: item.media_id,
      season_number: item.season_number ?? -1,
      episode_number: item.episode_number ?? -1,
    }));

    // Single RPC call instead of N parallel calls
    const data = await rpc<{
      media_type: string;
      media_id: number;
      season_number: number;
      episode_number: number;
      percentage_watched: unknown;
    }>('get_batch_percentage_watched', {
      p_user_id: user_id,
      p_items: jsonb(itemsPayload),
    });

    // Build the result map with composite key to handle TV episodes
    // (same media_id but different season/episode)
    if (data) {
      data.forEach((row) => {
        const key = `${row.media_type}-${row.media_id}-${row.season_number}-${row.episode_number}`;
        // percentage_watched comes back as a Prisma Decimal — coerce to number.
        watchTimeMap.set(key, Number(row.percentage_watched ?? 0) || 0);
      });
    }

    return watchTimeMap;
  } catch (error) {
    logger.warn('Error in getBatchWatchTimes:', error);
    return watchTimeMap;
  }
};

/** Helper to build a composite key for getBatchWatchTimes lookups */
export async function watchTimeKey(
  media_type: string,
  media_id: number,
  season_number?: number | null,
  episode_number?: number | null
): Promise<string> {
  return `${media_type}-${media_id}-${season_number ?? -1}-${episode_number ?? -1}`;
}

export const getWatchListSpecific = async (
  user_id: string,
  limit: number,
  offset: number,
  watch_list_type: string
) => {
  try {
    let data;
    try {
      data = await rpc('get_watch_list_specific', {
        p_user_id: user_id,
        p_limit: limit,
        p_offset: offset,
        p_watch_list_type: watch_list_type,
      });
    } catch (error) {
      logger.error('Error fetching watch later:', error);
      throw new Error(error instanceof Error ? error.message : String(error));
    }

    // bigint media_id → number for the JSON/client boundary.
    return serializeRows(data);
  } catch (error) {
    logger.error('Error in getWatchListSpecific:', error);
    throw error;
  }
};

async function getTopGenresForUser(
  userId: string | undefined,
  user: IUser | undefined,
  mediaType: 'movie' | 'tv'
) {
  const user_id = user ? String(user.id) : userId;
  if (!user_id) return [];
  try {
    // Choose the appropriate RPC based on the media type
    const rpcName =
      mediaType === 'movie' ? 'get_top_movie_genres_for_user' : 'get_top_tv_genres_for_user';

    const recommendedRaw = await rpc<{ genre_code: string; value: bigint }>(rpcName, {
      p_user_id: user_id,
    });
    // bigint `value` → number so ensureAtLeastFiveGenres can sort numerically.
    const recommended = serializeRows(recommendedRaw) as unknown as {
      genre_code: string;
      value: number;
    }[];

    // Get the user's current feed genres
    const userFeedGenres = user?.feed_genres || [];
    const userMediaFeedGenres = userFeedGenres.filter((g) => g.media_type === mediaType);

    // Merge the feed genres with the recommended ones, ensuring at least five
    const final = ensureAtLeastFiveGenres(userMediaFeedGenres, recommended || [], mediaType);

    return final;
  } catch (error) {
    logger.error(`Error in getTopGenresForUser for ${mediaType}:`, error);
    return []; // Fallback to an empty array
  }
}

export const getTopMovieGenresForUser = async (userId?: string, user?: IUser) => {
  return getTopGenresForUser(userId, user, 'movie');
};

export const getTopTvGenresForUser = async (userId?: string, user?: IUser) => {
  return getTopGenresForUser(userId, user, 'tv');
};

export async function updateGenreStats({ genreIds, mediaType, userId }: UpdateGenreStatsParams) {
  try {
    const row = await rpcOne<{ update_genre_stats: unknown }>('update_genre_stats', {
      // genreIds is typed bigint[] in UpdateGenreStatsParams but the RPC expects
      // number[] (genre ids are small ints) — convert at the boundary.
      genre_ids: genreIds.map((id) => Number(id)),
      media_type: mediaType,
      user_id: userId,
    });

    return row?.update_genre_stats ?? null;
  } catch (error) {
    logger.error('Error updating genre stats:', error);
    throw new Error('Failed to update genre stats');
  }
}

export const getNextEpisodes = async (userId: string): Promise<Episode[]> => {
  try {
    const data = await rpc<Episode>('get_next_episodes', {
      user_id_input: userId,
    });
    return data as Episode[];
  } catch (error) {
    logger.error('Error fetching next episodes:', error);
    throw new Error('Failed to fetch next episodes');
  }
};

/**
 * Get in-progress items (movies and TV episodes watched < 75%).
 * Uses the dedicated `get_continue_watching` RPC with its own LIMIT 10.
 */
export const getContinueWatchingItems = async (userId: string): Promise<WatchHistoryItem[]> => {
  try {
    const data = await rpc<WatchHistoryItem>('get_continue_watching', {
      user_id_input: userId,
    });
    return data as WatchHistoryItem[];
  } catch (error) {
    logger.error('Error fetching continue watching items:', error);
    throw new Error('Failed to fetch continue watching items');
  }
};

/**
 * Get TV episodes where the user finished the previous episode (>= 75% watched).
 * These need episode advancement via TMDB data to determine the actual next episode.
 * Uses the dedicated `get_up_next_episodes` RPC with its own LIMIT 10.
 */
export const getUpNextItems = async (userId: string): Promise<WatchHistoryItem[]> => {
  try {
    const data = await rpc<WatchHistoryItem>('get_up_next_episodes', {
      user_id_input: userId,
    });
    return data as WatchHistoryItem[];
  } catch (error) {
    logger.error('Error fetching up next items:', error);
    throw new Error('Failed to fetch up next items');
  }
};

export async function getAllUsers(): Promise<User[]> {
  try {
    const users = await prisma.users.findMany({ select: { id: true } });
    return users;
  } catch (error) {
    logger.error('Error fetching users:', error);
    return [];
  }
}

export async function getTvWatchListForUser(userId: string): Promise<WatchListItem[]> {
  try {
    const data = await prisma.watch_list.findMany({
      where: { user_id: userId, media_type: 'tv' },
      select: { media_id: true },
    });
    // media_id is nullable (and BigInt) in the column but WatchListItem requires a
    // number — drop rows without one rather than asserting.
    return data
      .filter((row): row is { media_id: bigint } => row.media_id !== null)
      .map((row) => ({ media_id: Number(row.media_id) }));
  } catch (error) {
    logger.error(`Error fetching watch_list for user=${userId}:`, error);
    return [];
  }
}

export async function upsertNewEpisodeRecord(
  userId: string,
  tvId: number,
  lastAirDate: string,
  season_number: number,
  episode_number: number
): Promise<void> {
  try {
    await prisma.new_episodes.upsert({
      where: { user_id_tv_id: { user_id: userId, tv_id: BigInt(tvId) } },
      create: {
        user_id: userId,
        tv_id: BigInt(tvId),
        last_air_date: new Date(lastAirDate),
        season_number,
        episode_number,
        updated_at: new Date(),
      },
      update: {
        last_air_date: new Date(lastAirDate),
        season_number,
        episode_number,
        updated_at: new Date(),
      },
    });
  } catch (error) {
    logger.error(`new_episodes upsert error (user=${userId}, tvId=${tvId}):`, error);
  }
}

export async function getLatestNewEpisodes(userId: string): Promise<any[] | null> {
  // Query the `new_episodes` table:
  try {
    const data = await prisma.new_episodes.findMany({
      where: { user_id: userId },
      select: {
        id: true,
        user_id: true,
        tv_id: true,
        last_air_date: true,
        season_number: true,
        episode_number: true,
        updated_at: true,
      },
      orderBy: { last_air_date: 'desc' },
      take: 10,
    });

    // bigint tv_id → number, Date columns → ISO strings (JSON boundary).
    return serializeRows(data);
  } catch (error) {
    logger.error('Error fetching latest new episodes:', error);
    return null;
  }
}

export const fetchBlogPostById = async (id: string) => {
  try {
    const data = await prisma.dev_blog.findUnique({ where: { id } });
    if (!data) {
      logger.error('Error fetching blog post:', 'No blog post found');
      return null;
    }
    return data;
  } catch (error) {
    logger.error('Error fetching blog post:', error instanceof Error ? error.message : error);
    return null;
  }
};

export const fetchBlogPosts = async () => {
  try {
    const data = await prisma.dev_blog.findMany({
      take: 6,
      orderBy: { created_at: 'desc' },
    });
    return data;
  } catch (error) {
    logger.error('Error fetching blog posts:', error instanceof Error ? error.message : error);
    return null;
  }
};

export const getPostsFromFollowedUsers = async (
  userId: string,
  page: number = 0
): Promise<any | null> => {
  try {
    // Call the RPC function to fetch posts with creator details and like/save status
    const rows = await rpc<{ fetch_posts_from_followed_users: any }>(
      'fetch_posts_from_followed_users',
      {
        current_user_id: userId,
        result_limit: 10,
        result_offset: page * 10,
      }
    );

    // SETOF json → unwrap each row's json payload to match the supabase array shape.
    return rows.map((row) => row.fetch_posts_from_followed_users);
  } catch (error) {
    logger.warn('getPostsFromFollowedUsers', error);
    return null;
  }
};

export const getPostByIdNew = async (
  post_id: string,
  current_user_id?: string
): Promise<any | null> => {
  try {
    const row = await rpcOne<{ fetch_post_with_comments_by_id: any }>(
      'fetch_post_with_comments_by_id',
      {
        p_post_id: post_id,
        current_user_id: current_user_id,
      }
    );
    return row?.fetch_post_with_comments_by_id ?? null;
  } catch (error) {
    logger.warn('getPostByIdNew', error);
    return null;
  }
};

export const getCommentsByPostId = async (post_id: string, current_user_id?: string) => {
  try {
    const row = await rpcOne<{ fetch_comments_by_post_id: any }>('fetch_comments_by_post_id', {
      p_post_id: post_id,
      current_user_id: current_user_id,
    });
    return row?.fetch_comments_by_post_id ?? null;
  } catch (error) {
    logger.warn('getCommentsByPostId', error);
    return null;
  }
};

export const getRepliesByCommentId = async (comment_id: string, current_user_id?: string) => {
  try {
    const row = await rpcOne<{ fetch_replies_by_comment_id: any }>('fetch_replies_by_comment_id', {
      p_comment_id: comment_id,
      current_user_id: current_user_id,
    });
    return row?.fetch_replies_by_comment_id ?? null;
  } catch (error) {
    logger.warn('getRepliesByCommentId', error);
    return null;
  }
};
