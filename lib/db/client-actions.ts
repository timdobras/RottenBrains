'use server';

import { Prisma } from '@prisma/client';
import { rpc, rpcOne, jsonb, serializeRows } from '@/lib/db/rpc';
import { prisma } from '@/lib/prisma';
import { PAGINATION } from '@/lib/constants';
import { handleError as handleAppError, DatabaseError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { FeedGenre, IPost } from '@/types';
import { getMediaDetails } from '../tmdb';

/**
 * Server-action ports of the *data* functions in `lib/supabase/clientQueries.ts`.
 *
 * These were called from client components via supabase-js (browser). Moving
 * them behind `'use server'` lets them run Prisma server-side while keeping the
 * SAME names and signatures, so each call site only swaps its import.
 *
 * Conventions mirror `lib/db/queries.ts`: `supabase.rpc()` → `rpc()`/`rpcOne()`
 * (pass the same named args; `undefined` args are dropped so DEFAULTs apply),
 * SETOF-json RPCs are unwrapped per-row, bigint columns are coerced to number
 * via `serializeRows()`, and identity (where used) comes from `getCurrentUserId()`.
 *
 * Deferred (NOT ported, still in clientQueries.ts): `uploadProfilePicture`,
 * `uploadBackdropPicture` (Storage → MinIO, later phase) and `signOut` (auth cutover).
 */

// Columns the old `users (...)` embed selected — kept identical.
const EMBEDDED_USER_SELECT = {
  id: true,
  username: true,
  name: true,
  email: true,
  image_url: true,
} as const;

export const getUserPosts = async (
  creator_id: string,
  page: number,
  user_id?: string
): Promise<IPost[] | null> => {
  try {
    // fetch_user_posts returns SETOF json — unwrap each row's json payload.
    const rows = await rpc<{ fetch_user_posts: any }>('fetch_user_posts', {
      creator_id: creator_id,
      current_user_id: user_id,
      result_limit: PAGINATION.POSTS_PER_PAGE,
      result_offset: page * PAGINATION.POSTS_PER_PAGE,
    });

    return rows.map((row) => row.fetch_user_posts) as IPost[];
  } catch (error) {
    logger.error('Database error in getUserPosts:', error);
    handleAppError(error, 'getUserPosts');
    return null;
  }
};

export const getUserPostsType = async (
  creator_id: string,
  media_type: string,
  page: number,
  user_id?: string
): Promise<IPost[] | null> => {
  try {
    // With media_type_filter present, this resolves to the SETOF json overload —
    // unwrap each row's json payload.
    const rows = await rpc<{ fetch_user_posts_type: any }>('fetch_user_posts_type', {
      creator_id: creator_id,
      current_user_id: user_id,
      media_type_filter: media_type,
      result_limit: PAGINATION.POSTS_PER_PAGE,
      result_offset: page * PAGINATION.POSTS_PER_PAGE,
    });

    return rows.map((row) => row.fetch_user_posts_type) as IPost[];
  } catch (error) {
    logger.error('Database error in getUserPostsType:', error);
    handleAppError(error, 'getUserPostsType');
    return null;
  }
};

export const getFollowedUsersPosts = async (
  userId: string,
  page: number
): Promise<IPost[] | null> => {
  try {
    // fetch_posts_from_followed_users returns SETOF json — unwrap each row.
    const rows = await rpc<{ fetch_posts_from_followed_users: any }>(
      'fetch_posts_from_followed_users',
      {
        current_user_id: userId,
        result_limit: PAGINATION.POSTS_PER_PAGE,
        result_offset: page * PAGINATION.POSTS_PER_PAGE,
      }
    );

    return rows.map((row) => row.fetch_posts_from_followed_users) as IPost[];
  } catch (error) {
    logger.error('Database error in getFollowedUsersPosts:', error);
    handleAppError(error, 'getFollowedUsersPosts');
    return null;
  }
};

export const getPostComments = async (postId: string): Promise<any | null> => {
  try {
    const data = await prisma.comments.findMany({
      where: { post_id: postId },
      include: { users: { select: EMBEDDED_USER_SELECT } },
      orderBy: { created_at: 'desc' },
      take: PAGINATION.COMMENTS_PER_PAGE,
    });

    // comments.total_likes is BigInt → number for the JSON/client boundary.
    return serializeRows(data);
  } catch (error) {
    logger.error('Database error in getPostComments:', error);
    handleAppError(error, 'getPostComments');
    return null;
  }
};

export const getCommentReplies = async (comment_id: string): Promise<any | null> => {
  try {
    const data = await prisma.comments.findMany({
      where: { parent_id: comment_id },
      include: { users: { select: EMBEDDED_USER_SELECT } },
      orderBy: { created_at: 'desc' },
      take: 10,
    });

    return serializeRows(data);
  } catch (error) {
    handleAppError(error, 'getPostComments');
    return null;
  }
};

export async function getFollowers(id: string): Promise<any | null> {
  try {
    const [rows, followers_count] = await Promise.all([
      prisma.follows.findMany({
        where: { following_id: id },
        include: { users_follows_user_idTousers: { select: EMBEDDED_USER_SELECT } },
        take: 100,
      }),
      // supabase used count: 'exact' → total count, not capped by the limit.
      prisma.follows.count({ where: { following_id: id } }),
    ]);

    // supabase aliased the embed as `users:user_id (...)` → expose it under `users`.
    const followers = rows.map(({ users_follows_user_idTousers, ...rest }) => ({
      ...rest,
      users: users_follows_user_idTousers,
    }));

    return { followers_count, followers: serializeRows(followers) };
  } catch (error) {
    logger.error('Error in getFollowers:', error);
    return null;
  }
}

export async function getFollowing(id: string): Promise<any | null> {
  try {
    const [rows, following_count] = await Promise.all([
      prisma.follows.findMany({
        where: { user_id: id },
        include: { users_follows_following_idTousers: { select: EMBEDDED_USER_SELECT } },
        take: 100,
      }),
      prisma.follows.count({ where: { user_id: id } }),
    ]);

    // supabase aliased the embed as `users:following_id (...)` → expose as `users`.
    const following = rows.map(({ users_follows_following_idTousers, ...rest }) => ({
      ...rest,
      users: users_follows_following_idTousers,
    }));

    return { following_count, following: serializeRows(following) };
  } catch (error) {
    logger.error('Error in getFollowing:', error);
    return null;
  }
}

export async function getPostCount(id: string): Promise<any | null> {
  try {
    const post_count = await prisma.posts.count({ where: { creatorid: id } });
    return { post_count };
  } catch (error) {
    logger.error('Error in getPostCount:', error);
    return null;
  }
}

export const getWatchHistoryForUser = async (user_id: string, limit: number, offset: number) => {
  try {
    // 3-arg overload returns a TABLE — rows map directly to the supabase shape.
    const data = await rpc('get_watch_history_for_user', {
      p_user_id: user_id,
      p_limit: limit,
      p_offset: offset,
    });

    return serializeRows(data);
  } catch (error) {
    logger.error('Error in getWatchHistoryForUser:', error);
    throw error;
  }
};

export async function getBatchWatchedItemsForUser(userId: string, batch: any[]) {
  try {
    // Create the batch payload in the format { media_type, media_id }
    const batchPayload = batch.map((item) => ({
      media_type: item.media_type || 'tv',
      media_id: item.tv_id || item.media_id || item.id,
    }));

    // input_items is a jsonb arg → wrap with jsonb(...). Returns TABLE(media_type, media_id bigint).
    const data = await rpc('get_batch_watched_items', {
      input_user_id: userId,
      input_items: jsonb(batchPayload),
    });

    // media_id is bigint → number for the JSON/client boundary.
    return serializeRows(data);
  } catch (err) {
    logger.error('Error fetching batch watched items:', err);
    return [];
  }
}

export const addToWatchList = async (
  user_id: string,
  media_type: string,
  media_id: number,
  watch_list_type: string
) => {
  try {
    // add_to_watch_list returns a scalar text — extract the function-named column.
    const row = await rpcOne<{ add_to_watch_list: string }>('add_to_watch_list', {
      p_user_id: user_id,
      p_media_type: media_type,
      p_media_id: media_id,
      p_watch_list_type: watch_list_type,
    });
    return row?.add_to_watch_list ?? null;
  } catch (error) {
    logger.warn('Error in addToWatchList:', error);
  }
};

export async function removeFromWatchList(id: string) {
  try {
    // deleteMany (not delete) so a missing id is a no-op, matching supabase's
    // delete-by-filter (which doesn't error on zero matches).
    await prisma.watch_list.deleteMany({ where: { id } });
    return null;
  } catch (error) {
    logger.error(
      'Error removing watch list item:',
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
}

export interface LastEpisodeInfo {
  lastAirDate: string;
  season: number;
  episode: number;
}

export async function updateUserFeedGenres(userId: string, feedGenres: FeedGenre[]) {
  try {
    const data = await prisma.users.update({
      where: { id: userId },
      // feed_genres is a jsonb[] column (typed Json[]); FeedGenre is JSON-shaped.
      data: { feed_genres: feedGenres as unknown as Prisma.InputJsonValue[] },
    });
    return { data: serializeRows(data), error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function fetchUserNotifications(
  user_id: string,
  page: number = 0,
  notifications_per_page: number = 10
) {
  // get_user_notifications returns a TABLE — rows map directly to the supabase shape.
  const rawData = await rpc('get_user_notifications', {
    _recipient_id: user_id,
    _limit: notifications_per_page,
    _offset: page * notifications_per_page,
  });

  // Coerce bigint/Date values to JSON-safe primitives (jsonb columns stay objects).
  const data = serializeRows(rawData) as any[];
  if (!data || data.length === 0) return [];

  // Extract unique media items to batch fetch (deduplicates API calls)
  const mediaMap = new Map<string, { media_type: string; media_id: number }>();
  const episodeMap = new Map<
    string,
    { media_type: string; media_id: number; season_number: number; episode_number: number }
  >();

  data.forEach((notification: any) => {
    if (['like', 'comment', 'new_post', 'new_episode'].includes(notification.notification_type)) {
      const mediaType = notification.post?.media_type || notification.media_type;
      const mediaId = notification.post?.media_id || notification.media_id;
      const mediaKey = `${mediaType}-${mediaId}`;

      if (!mediaMap.has(mediaKey)) {
        mediaMap.set(mediaKey, { media_type: mediaType, media_id: mediaId });
      }

      // Track episode data for TV notifications
      if (
        notification.media_type === 'tv' &&
        notification.season_number != null &&
        notification.episode_number != null
      ) {
        const episodeKey = `${notification.media_type}-${notification.media_id}-${notification.season_number}-${notification.episode_number}`;
        if (!episodeMap.has(episodeKey)) {
          episodeMap.set(episodeKey, {
            media_type: notification.media_type,
            media_id: notification.media_id,
            season_number: notification.season_number,
            episode_number: notification.episode_number,
          });
        }
      }
    }
  });

  // Batch fetch media and episode data in parallel
  const [mediaResults, episodeResults] = await Promise.all([
    Promise.all(
      Array.from(mediaMap.entries()).map(async ([key, item]) => {
        try {
          const mediaData = await getMediaDetails(item.media_type, item.media_id);
          return { key, data: mediaData };
        } catch (err) {
          logger.warn('Error fetching media for notification:', key);
          return { key, data: null };
        }
      })
    ),
    Promise.all(
      Array.from(episodeMap.entries()).map(async ([key, item]) => {
        try {
          const epData = await getMediaDetails(
            item.media_type,
            item.media_id,
            item.season_number,
            item.episode_number
          );
          return { key, data: epData };
        } catch (err) {
          logger.warn('Error fetching episode for notification:', key);
          return { key, data: null };
        }
      })
    ),
  ]);

  // Build lookup maps
  const mediaDataMap = new Map<string, any>();
  mediaResults.forEach(({ key, data }) => {
    if (data) mediaDataMap.set(key, data);
  });

  const episodeDataMap = new Map<string, any>();
  episodeResults.forEach(({ key, data }) => {
    if (data) episodeDataMap.set(key, data);
  });

  // Map notifications with their media data
  return data.map((notification: any) => {
    if (['like', 'comment', 'new_post', 'new_episode'].includes(notification.notification_type)) {
      const mediaType = notification.post?.media_type || notification.media_type;
      const mediaId = notification.post?.media_id || notification.media_id;
      const mediaKey = `${mediaType}-${mediaId}`;
      const media_data = mediaDataMap.get(mediaKey);

      if (
        notification.media_type === 'tv' &&
        notification.season_number != null &&
        notification.episode_number != null
      ) {
        const episodeKey = `${notification.media_type}-${notification.media_id}-${notification.season_number}-${notification.episode_number}`;
        const episode_data = episodeDataMap.get(episodeKey);
        return { ...notification, media_data, episode_data };
      }

      return { ...notification, media_data };
    }
    return notification;
  });
}
