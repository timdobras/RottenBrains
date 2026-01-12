'use server';
import { cache } from 'react';
import { handleError as handleAppError, DatabaseError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { upsertWatchHistorySchema } from '@/lib/validations';
import { IUser } from '@/types';
import { createClient } from './server';
import {
  ensureAtLeastFiveGenres,
  type Episode,
  type User,
  type WatchListItem,
  type UpdateGenreStatsParams,
  type NewEpisode,
} from './utils';

// Re-export types and utility functions from utils
export type { Episode, User, WatchListItem, UpdateGenreStatsParams, NewEpisode };
export { ensureAtLeastFiveGenres };

const getSupabaseClient = cache(async () => {
  return await createClient();
});

export async function getUserFromDB(id: string): Promise<{ user: IUser } | null> {
  const supabase = await getSupabaseClient();
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, username, email, image_url, backdrop_url, feed_genres, premium, bio, created_at')
      .eq('id', id)
      .single();

    if (error) {
      logger.error('Database error in getUserFromDB:', error);
      throw new DatabaseError('Failed to fetch user from database');
    }

    return { user: user as IUser };
  } catch (error) {
    const errorInfo = handleAppError(error, 'getUserFromDB');
    return null;
  }
}

export const getCurrentUser = cache(async () => {
  const supabase = await getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: userData } = await supabase
    .from('users')
    .select('id, name, username, email, image_url, backdrop_url, feed_genres, premium, bio, created_at')
    .eq('id', user.id)
    .single();

  return userData;
});

export const signOut = async () => {
  const supabase = await getSupabaseClient();
  // sign out from the current session only
  await supabase.auth.signOut();
};

export const getPostById = async (post_id: string): Promise<any | null> => {
  const supabase = await getSupabaseClient();
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('id, created_at, creatorid, media_id, media_type, vote_user, review_user, total_likes, total_comments')
      .eq('id', post_id)
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    handleAppError(error, 'getPostById');
  }
};

export const getPostsOfMedia = async (
  user_id: string,
  media_type: string,
  media_id: number,
  page: number
): Promise<any | null> => {
  try {
    const supabase = await getSupabaseClient();
    // Call the RPC function to fetch posts with media type and ID
    const { data: postsData, error: postsError } = await supabase.rpc('fetch_posts_by_media', {
      current_user_id: user_id,
      media_type_param: media_type,
      media_id_param: media_id,
      result_limit: 6,
      result_offset: page * 6,
    });

    if (postsError) throw postsError;

    return postsData;
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
  episode_number: number | null
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

    // Replace NULL with -1 for season_number and episode_number
    const normalizedSeasonNumber = season_number ?? -1;
    const normalizedEpisodeNumber = episode_number ?? -1;

    // Parse new_percentage_watched to a float (already validated by Zod)
    const newPercentageFloat = parseFloat(new_percentage_watched);

    // Step 1: Retrieve existing percentage_watched and time_spent
    const supabase = await getSupabaseClient();
    const { data: existingData, error: fetchError } = await supabase
      .from('watch_history')
      .select('percentage_watched, time_spent')
      .eq('user_id', user_id)
      .eq('media_type', media_type)
      .eq('media_id', media_id)
      .eq('season_number', normalizedSeasonNumber)
      .eq('episode_number', normalizedEpisodeNumber)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      logger.error('Error fetching existing watch history:', fetchError);
      throw new DatabaseError('Failed to fetch existing watch history');
    }

    // Calculate the total percentage watched
    const existingPercentage = existingData?.percentage_watched || 0;
    const updatedPercentage = Math.min(
      Number(existingPercentage) + Number(newPercentageFloat),
      100
    ).toFixed(2);

    // Calculate the total time spent (accumulate, don't replace)
    const existingTimeSpent = existingData?.time_spent || 0;
    const updatedTimeSpent = Number(existingTimeSpent) + Number(new_time_spent);

    logger.debug('Accumulating watch time:', {
      existingTimeSpent,
      newTimeSpent: new_time_spent,
      updatedTimeSpent,
      existingPercentage,
      newPercentage: newPercentageFloat,
      updatedPercentage,
    });

    const updatedCreatedAt = new Date().toISOString();

    // Step 2: Prepare the data to upsert
    const watchHistoryData = {
      user_id,
      media_type,
      media_id,
      time_spent: updatedTimeSpent, // Use accumulated time, not just new time
      percentage_watched: updatedPercentage,
      season_number: normalizedSeasonNumber,
      episode_number: normalizedEpisodeNumber,
      created_at: updatedCreatedAt,
      hidden_until: null, // Reset hidden_until when user watches again (column added via migration)
    };

    // Step 3: Perform the upsert operation
    logger.debug('Performing upsert operation...');
    const { data, error } = await supabase
      .from('watch_history')
      .upsert(watchHistoryData, {
        onConflict: 'user_id,media_type,media_id,season_number,episode_number',
      })
      .select();

    if (error) {
      logger.error('Error during upsert operation:', error);
      throw new DatabaseError('Failed to upsert watch history');
    }

    logger.debug('Upsert successful. Returned data:', data);

    return { success: true, action: 'upserted', data };
  } catch (error) {
    const errorInfo = handleAppError(error, 'upsertWatchHistory');
    throw error;
  }
};

export const getWatchTime = async (
  user_id: string,
  media_type: string,
  media_id: number,
  season_number?: number | null,
  episode_number?: number | null
) => {
  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.rpc('get_percentage_watched', {
      p_user_id: user_id,
      p_media_type: media_type,
      p_media_id: media_id,
      p_season_number: season_number || null,
      p_episode_number: episode_number || null,
    });

    return data;
  } catch (error) {
    logger.warn('Error in getWatchTime:', error);
  }
};

/**
 * Batch fetch watch times for multiple media items
 * Returns a Map keyed by media_id with watch time percentages
 * Uses a single RPC call instead of N separate calls for better performance
 */
export const getBatchWatchTimes = async (
  user_id: string,
  media_items: Array<{
    media_type: string;
    media_id: number;
    season_number?: number | null;
    episode_number?: number | null;
  }>
): Promise<Map<number, number>> => {
  const watchTimeMap = new Map<number, number>();

  if (!user_id || media_items.length === 0) {
    return watchTimeMap;
  }

  try {
    const supabase = await getSupabaseClient();

    // Convert items to JSONB format for the batch RPC call
    const itemsPayload = media_items.map((item) => ({
      media_type: item.media_type,
      media_id: item.media_id,
      season_number: item.season_number ?? -1,
      episode_number: item.episode_number ?? -1,
    }));

    // Single RPC call instead of N parallel calls
    const { data, error } = await supabase.rpc('get_batch_percentage_watched', {
      p_user_id: user_id,
      p_items: itemsPayload,
    });

    if (error) {
      logger.warn('Error in getBatchWatchTimes RPC:', error);
      return watchTimeMap;
    }

    // Build the result map
    if (data) {
      data.forEach((row: { media_id: number; percentage_watched: number }) => {
        watchTimeMap.set(row.media_id, row.percentage_watched || 0);
      });
    }

    return watchTimeMap;
  } catch (error) {
    logger.warn('Error in getBatchWatchTimes:', error);
    return watchTimeMap;
  }
};

export const getWatchListSpecific = async (
  user_id: string,
  limit: number,
  offset: number,
  watch_list_type: string
) => {
  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.rpc('get_watch_list_specific', {
      p_user_id: user_id,
      p_limit: limit,
      p_offset: offset,
      p_watch_list_type: watch_list_type,
    });

    if (error) {
      logger.error('Error fetching watch later:', error);
      throw new Error(error.message);
    }

    return data;
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
  const user_id = user ? user.id : userId;
  try {
    const supabase = await getSupabaseClient();
    // Choose the appropriate RPC based on the media type
    const rpcName =
      mediaType === 'movie' ? 'get_top_movie_genres_for_user' : 'get_top_tv_genres_for_user';

    const { data: recommended, error } = await supabase.rpc(rpcName, {
      p_user_id: user_id,
    });

    if (error) {
      throw new Error(error.message);
    }

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
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.rpc('update_genre_stats', {
    genre_ids: genreIds,
    media_type: mediaType,
    user_id: userId,
  });

  if (error) {
    logger.error('Error updating genre stats:', error);
    throw new Error('Failed to update genre stats');
  }

  return data;
}

export const getNextEpisodes = async (userId: string): Promise<Episode[]> => {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.rpc('get_next_episodes', {
    user_id_input: userId,
  });

  if (error) {
    logger.error('Error fetching next episodes:', error);
    throw new Error('Failed to fetch next episodes');
  }

  return data as Episode[];
};

export async function getAllUsers(): Promise<User[]> {
  const supabase = await getSupabaseClient();
  const { data: users, error } = await supabase.from('users').select('id');

  if (error) {
    logger.error('Error fetching users:', error);
    return [];
  }
  return users ?? [];
}

export async function getTvWatchListForUser(userId: string): Promise<WatchListItem[]> {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from('watch_list')
    .select('media_id')
    .eq('user_id', userId)
    .eq('media_type', 'tv');

  if (error) {
    logger.error(`Error fetching watch_list for user=${userId}:`, error);
    return [];
  }
  return data ?? [];
}

export async function upsertNewEpisodeRecord(
  userId: string,
  tvId: number,
  lastAirDate: string,
  season_number: number,
  episode_number: number
): Promise<void> {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.from('new_episodes').upsert(
    {
      user_id: userId,
      tv_id: tvId,
      last_air_date: lastAirDate,
      season_number,
      episode_number,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,tv_id' }
  );

  if (error) {
    logger.error(`new_episodes upsert error (user=${userId}, tvId=${tvId}):`, error);
  }
}

export async function getLatestNewEpisodes(userId: string): Promise<any[] | null> {
  // Query the `new_episodes` table:
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from('new_episodes')
    .select('id, user_id, tv_id, last_air_date, season_number, episode_number, updated_at')
    .eq('user_id', userId)
    .order('last_air_date', { ascending: false })
    .limit(10);

  if (error) {
    logger.error('Error fetching latest new episodes:', error);
    return null;
  }

  return data;
}

export const fetchBlogPostById = async (id: string) => {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.from('dev_blog').select('*').eq('id', id).single();

  if (error) {
    logger.error('Error fetching blog post:', error.message);
    return null;
  }

  return data;
};

export const fetchBlogPosts = async () => {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from('dev_blog')
    .select('*')
    .limit(6)
    .order('created_at', { ascending: false });
  if (error) {
    logger.error('Error fetching blog posts:', error.message);
    return null;
  }

  return data;
};

export const getPostsFromFollowedUsers = async (
  userId: string,
  page: number = 0
): Promise<any | null> => {
  try {
    const supabase = await getSupabaseClient();
    // Call the new RPC function to fetch posts with creator details and like/save status
    const { data: postsData, error: postsError } = await supabase.rpc(
      'fetch_posts_from_followed_users',
      {
        current_user_id: userId,
        result_limit: 10,
        result_offset: page * 10,
      }
    );

    if (postsError) throw postsError;

    return postsData;
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
    const supabase = await getSupabaseClient();
    const { data: postsData, error: postsError } = await supabase.rpc(
      'fetch_post_with_comments_by_id',
      {
        p_post_id: post_id,
        current_user_id: current_user_id,
      }
    );
    if (postsError) throw postsError;
    return postsData;
  } catch (error) {
    logger.warn('getPostByIdNew', error);
    return null;
  }
};

export const getCommentsByPostId = async (post_id: string, current_user_id?: string) => {
  try {
    const supabase = await getSupabaseClient();
    const { data: commentData, error: commentError } = await supabase.rpc(
      'fetch_comments_by_post_id',
      {
        p_post_id: post_id,
        current_user_id: current_user_id,
      }
    );
    if (commentError) throw commentError;
    return commentData;
  } catch (error) {
    logger.warn('getCommentsByPostId', error);
    return null;
  }
};

export const getRepliesByCommentId = async (comment_id: string, current_user_id?: string) => {
  try {
    const supabase = await getSupabaseClient();
    const { data: commentData, error: commentError } = await supabase.rpc(
      'fetch_replies_by_comment_id',
      {
        p_comment_id: comment_id,
        current_user_id: current_user_id,
      }
    );
    if (commentError) throw commentError;
    return commentData;
  } catch (error) {
    logger.warn('getRepliesByCommentId', error);
    return null;
  }
};
