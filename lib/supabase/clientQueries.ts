import { redirect } from 'next/navigation';
import { PAGINATION } from '@/lib/constants';
import { handleError as handleAppError, DatabaseError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { FeedGenre, IPost, IUser } from '@/types';
import { fetchMediaData } from '../client/fetchMediaData';
import { getMediaDetails } from '../tmdb';
import { createClient } from './client';

// Re-export types and utility functions from utils for backwards compatibility
export type { Episode, User, WatchListItem, UpdateGenreStatsParams, NewEpisode } from './utils';
export { ensureAtLeastFiveGenres } from './utils';

// Re-export server functions that client components may need
export {
  getWatchTime,
  getWatchListSpecific,
  getTopMovieGenresForUser,
  getTopTvGenresForUser,
  updateGenreStats,
} from './serverQueries';

const supabase = createClient();

export const getUserPosts = async (
  creator_id: string,
  page: number,
  user_id?: string
): Promise<IPost[] | null> => {
  try {
    const supabase = createClient();

    // Call the new RPC function to fetch posts with creator details and like/save status
    const { data: postsData, error: postsError } = await supabase.rpc('fetch_user_posts', {
      creator_id: creator_id,
      current_user_id: user_id,
      result_limit: PAGINATION.POSTS_PER_PAGE,
      result_offset: page * PAGINATION.POSTS_PER_PAGE,
    });

    if (postsError) {
      logger.error('Database error in getUserPosts:', postsError);
      throw new DatabaseError('Failed to fetch user posts');
    }

    return postsData as IPost[];
  } catch (error) {
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
    const supabase = createClient();

    // Call the new RPC function to fetch posts with creator details and like/save status
    const { data: postsData, error: postsError } = await supabase.rpc('fetch_user_posts_type', {
      creator_id: creator_id,
      current_user_id: user_id,
      media_type_filter: media_type,
      result_limit: PAGINATION.POSTS_PER_PAGE,
      result_offset: page * PAGINATION.POSTS_PER_PAGE,
    });

    if (postsError) {
      logger.error('Database error in getUserPostsType:', postsError);
      throw new DatabaseError('Failed to fetch user posts by type');
    }

    return postsData as IPost[];
  } catch (error) {
    handleAppError(error, 'getUserPostsType');
    return null;
  }
};

export const getPostComments = async (postId: string): Promise<any | null> => {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select(
        `
                *,
                users (
                    id,
                    username,
                    name,
                    email,
                    image_url
                )
            `
      )
      .eq('post_id', postId)
      .order('created_at', { ascending: false })
      .limit(PAGINATION.COMMENTS_PER_PAGE);

    if (error) {
      logger.error('Database error in getPostComments:', error);
      throw new DatabaseError('Failed to fetch post comments');
    }

    return data;
  } catch (error) {
    handleAppError(error, 'getPostComments');
    return null;
  }
};

export const getCommentReplies = async (comment_id: string): Promise<any | null> => {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select(
        `
                *,
                users (
                    id,
                    username,
                    name,
                    email,
                    image_url
                )
            `
      )
      .eq('parent_id', comment_id)
      .order('created_at', { ascending: false })
      .limit(10);
    if (error) throw error;
    return data;
  } catch (error) {
    handleAppError(error, 'getPostComments');
    return null;
  }
};

export const uploadProfilePicture = async (file: File, userId: string | undefined) => {
  if (!userId) {
    logger.error('User not found or not authenticated');
    return false;
  }

  // Validate MIME type
  const validMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
  if (!validMimeTypes.includes(file.type)) {
    logger.error(`Unsupported MIME type: ${file.type}`);
    return false;
  }

  try {
    const fileName = `${userId}/${Date.now()}`;
    const { data, error } = await supabase.storage.from('profile_pictures').upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

    if (error) {
      throw error;
    }

    const { data: publicURL } = supabase.storage.from('profile_pictures').getPublicUrl(fileName);

    const { data: updateData, error: updateError } = await supabase
      .from('users')
      .update({ image_url: publicURL.publicUrl })
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    return true;
  } catch (error) {
    logger.error('Error uploading profile picture:', error);
    return false;
  }
};

export const uploadBackdropPicture = async (file: File, userId: string | undefined) => {
  if (!userId) {
    logger.error('User not found or not authenticated');
    return false;
  }

  // Validate MIME type
  const validMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
  if (!validMimeTypes.includes(file.type)) {
    logger.error(`Unsupported MIME type: ${file.type}`);
    return false;
  }

  try {
    const fileName = `${userId}/${Date.now()}`;
    const { data, error } = await supabase.storage
      .from('backdrop_pictures')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      throw error;
    }

    const { data: publicURL } = supabase.storage.from('backdrop_pictures').getPublicUrl(fileName);

    const { data: updateData, error: updateError } = await supabase
      .from('users')
      .update({ backdrop_url: publicURL.publicUrl })
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    return true;
  } catch (error) {
    logger.error('Error uploading backdrop picture:', error);
    return false;
  }
};

export async function getFollowers(id: string): Promise<any | null> {
  try {
    const {
      data: followers,
      error,
      count: followers_count,
    } = await supabase
      .from('follows')
      .select(
        `
                *,
                users:user_id (
                    id,
                    username,
                    name,
                    email,
                    image_url
                )
            `,
        { count: 'exact' }
      )
      .eq('following_id', id);

    if (error) throw error;

    return { followers_count, followers };
  } catch (error) {
    logger.error('Error in getFollowers:', error);
    return null;
  }
}

export async function getFollowing(id: string): Promise<any | null> {
  try {
    const {
      data: following,
      error,
      count: following_count,
    } = await supabase
      .from('follows')
      .select(
        `
                *,
                users:following_id (
                    id,
                    username,
                    name,
                    email,
                    image_url
                )
            `,
        { count: 'exact' }
      )
      .eq('user_id', id);

    if (error) throw error;

    return { following_count, following };
  } catch (error) {
    logger.error('Error in getFollowing:', error);
    return null;
  }
}

export async function getPostCount(id: string): Promise<any | null> {
  try {
    // Use 'id' and head: true for efficient count-only query (no data fetched)
    const { error, count: post_count } = await supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('creatorid', id);

    if (error) throw error;

    return { post_count };
  } catch (error) {
    logger.error('Error in getPostCount:', error);
    return null;
  }
}

export const getWatchHistoryForUser = async (user_id: string, limit: number, offset: number) => {
  try {
    const { data, error } = await supabase.rpc('get_watch_history_for_user', {
      p_user_id: user_id,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      logger.error('Error fetching watch history:', error);
      throw new Error(error.message);
    }

    return data;
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
    // Call the Supabase function
    const { data, error } = await supabase.rpc('get_batch_watched_items', {
      input_user_id: userId,
      input_items: batchPayload,
    });

    if (error) {
      logger.error('Error fetching batch watched items:', error);
      return [];
    }
    return data; // Return the watched items array
  } catch (err) {
    logger.error('Unexpected error in getBatchWatchedItemsForUser:', err);
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
    // Call the PostgreSQL function instead of direct insert
    const { data, error } = await supabase.rpc('add_to_watch_list', {
      p_user_id: user_id,
      p_media_type: media_type,
      p_media_id: media_id,
      p_watch_list_type: watch_list_type,
    });
    return data;
  } catch (error) {
    logger.warn('Error in addToWatchList:', error);
  }
};

export async function removeFromWatchList(id: string) {
  const { data, error } = await supabase
    .from('watch_list') // your table name
    .delete()
    .eq('id', id);

  if (error) {
    logger.error('Error removing watch list item:', error.message);
    throw error;
  }
  return data;
}

export interface LastEpisodeInfo {
  lastAirDate: string;
  season: number;
  episode: number;
}

export async function updateUserFeedGenres(userId: string, feedGenres: FeedGenre[]) {
  const { data, error } = await supabase
    .from('users')
    .update({ feed_genres: feedGenres })
    .eq('id', userId)
    .single();

  return { data, error };
}

export const signOut = async () => {
  // sign out from the current session only
  await supabase.auth.signOut({ scope: 'local' });
};

export async function fetchUserNotifications(
  user_id: string,
  page: number = 0,
  notifications_per_page: number = 10
) {
  const { data, error } = await supabase.rpc('get_user_notifications', {
    _recipient_id: user_id,
    _limit: notifications_per_page,
    _offset: page * notifications_per_page,
  });

  if (error) throw error;
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
