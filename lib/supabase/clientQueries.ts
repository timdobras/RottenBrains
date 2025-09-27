import { redirect } from "next/navigation";
import { createClient } from "./client";
import { FeedGenre, IPost, IUser } from "@/types";
import { fetchMediaData } from "../client/fetchMediaData";
import { getMediaDetails } from "../tmdb";

const supabase = createClient();

const handleError = (operation: string, error: any) => {
  console.error(`Error during ${operation}:`, error.message);
};

export const getUserPosts = async (
  creator_id: string,
  page: number,
  user_id?: string,
): Promise<any | null> => {
  try {
    const supabase = createClient();

    // Call the new RPC function to fetch posts with creator details and like/save status
    const { data: postsData, error: postsError } = await supabase.rpc(
      "fetch_user_posts",
      {
        creator_id: creator_id,
        current_user_id: user_id,
        result_limit: 10,
        result_offset: page * 10,
      },
    );

    if (postsError) throw postsError;

    return postsData;
  } catch (error) {
    console.error("getUserPosts", error);
    return null;
  }
};

export const getUserPostsType = async (
  creator_id: string,
  media_type: string,
  page: number,
  user_id?: string,
): Promise<any | null> => {
  try {
    const supabase = createClient();

    // Call the new RPC function to fetch posts with creator details and like/save status
    const { data: postsData, error: postsError } = await supabase.rpc(
      "fetch_user_posts_type",
      {
        creator_id: creator_id,
        current_user_id: user_id,
        media_type_filter: media_type,
        result_limit: 10,
        result_offset: page * 10,
      },
    );

    if (postsError) throw postsError;

    return postsData;
  } catch (error) {
    console.error("getUserPosts", error);
    return null;
  }
};

export const getPostComments = async (postId: string): Promise<any | null> => {
  try {
    const { data, error } = await supabase
      .from("comments")
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
            `,
      )
      .eq("post_id", postId)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw error;
    return data;
  } catch (error) {
    handleError("getPostComments", error);
    return null;
  }
};

export const getCommentReplies = async (
  comment_id: string,
): Promise<any | null> => {
  try {
    const { data, error } = await supabase
      .from("comments")
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
            `,
      )
      .eq("parent_id", comment_id)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw error;
    return data;
  } catch (error) {
    handleError("getPostComments", error);
    return null;
  }
};

export const uploadProfilePicture = async (
  file: File,
  userId: string | undefined,
) => {
  if (!userId) {
    console.error("User not found or not authenticated");
    return false;
  }

  // Validate MIME type
  const validMimeTypes = ["image/jpeg", "image/png", "image/gif"];
  if (!validMimeTypes.includes(file.type)) {
    console.error(`Unsupported MIME type: ${file.type}`);
    return false;
  }

  try {
    const fileName = `${userId}/${Date.now()}`;
    const { data, error } = await supabase.storage
      .from("profile_pictures")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw error;
    }

    const { data: publicURL } = supabase.storage
      .from("profile_pictures")
      .getPublicUrl(fileName);

    const { data: updateData, error: updateError } = await supabase
      .from("users")
      .update({ image_url: publicURL.publicUrl })
      .eq("id", userId);

    if (updateError) {
      throw updateError;
    }

    return true;
  } catch (error) {
    console.error("Error uploading profile picture:", error);
    return false;
  }
};

export const uploadBackdropPicture = async (
  file: File,
  userId: string | undefined,
) => {
  if (!userId) {
    console.error("User not found or not authenticated");
    return false;
  }

  // Validate MIME type
  const validMimeTypes = ["image/jpeg", "image/png", "image/gif"];
  if (!validMimeTypes.includes(file.type)) {
    console.error(`Unsupported MIME type: ${file.type}`);
    return false;
  }

  try {
    const fileName = `${userId}/${Date.now()}`;
    const { data, error } = await supabase.storage
      .from("backdrop_pictures")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw error;
    }

    const { data: publicURL } = supabase.storage
      .from("backdrop_pictures")
      .getPublicUrl(fileName);

    const { data: updateData, error: updateError } = await supabase
      .from("users")
      .update({ backdrop_url: publicURL.publicUrl })
      .eq("id", userId);

    if (updateError) {
      throw updateError;
    }

    return true;
  } catch (error) {
    console.error("Error uploading profile picture:", error);
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
      .from("follows")
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
        { count: "exact" },
      )
      .eq("following_id", id);

    if (error) throw error;

    return { followers_count, followers };
  } catch (error) {
    console.error("Error in getFollowers:", error);
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
      .from("follows")
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
        { count: "exact" },
      )
      .eq("user_id", id);

    if (error) throw error;

    return { following_count, following };
  } catch (error) {
    console.error("Error in getFollowing:", error);
    return null;
  }
}

export async function getPostCount(id: string): Promise<any | null> {
  try {
    const { error, count: post_count } = await supabase
      .from("posts")
      .select("*", { count: "exact" })
      .eq("creatorid", id);

    if (error) throw error;

    return { post_count };
  } catch (error) {
    console.error("Error in getPostCount:", error);
    return null;
  }
}

export const getWatchHistoryForUser = async (
  user_id: string,
  limit: number,
  offset: number,
) => {
  try {
    const { data, error } = await supabase.rpc("get_watch_history_for_user", {
      p_user_id: user_id,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      console.error("Error fetching watch history:", error);
      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    console.error("Error in getWatchHistoryForUser:", error);
    throw error;
  }
};

export async function getBatchWatchedItemsForUser(
  userId: string,
  batch: any[],
) {
  try {
    // Create the batch payload in the format { media_type, media_id }
    const batchPayload = batch.map((item) => ({
      media_type: item.media_type || "tv",
      media_id: item.tv_id || item.media_id || item.id,
    }));
    // Call the Supabase function
    const { data, error } = await supabase.rpc("get_batch_watched_items", {
      input_user_id: userId,
      input_items: batchPayload,
    });

    if (error) {
      console.error("Error fetching batch watched items:", error);
      return [];
    }
    return data; // Return the watched items array
  } catch (err) {
    console.error("Unexpected error in getBatchWatchedItemsForUser:", err);
    return [];
  }
}

export const getWatchTime = async (
  user_id: string,
  media_type: string,
  media_id: number,
  season_number?: number | null,
  episode_number?: number | null,
) => {
  try {
    const { data, error } = await supabase.rpc("get_percentage_watched", {
      p_user_id: user_id,
      p_media_type: media_type,
      p_media_id: media_id,
      p_season_number: season_number || null,
      p_episode_number: episode_number || null,
    });

    return data;
  } catch (error) {
    console.log("Error in getWatchTime:", error);
  }
};

export const addToWatchList = async (
  user_id: string,
  media_type: string,
  media_id: number,
  watch_list_type: string,
) => {
  try {
    // Call the PostgreSQL function instead of direct insert
    const { data, error } = await supabase.rpc("add_to_watch_list", {
      p_user_id: user_id,
      p_media_type: media_type,
      p_media_id: media_id,
      p_watch_list_type: watch_list_type,
    });
    return data;
  } catch (error) {
    console.log("Catch Error:", error);
  }
};

export const getWatchListSpecific = async (
  user_id: string,
  limit: number,
  offset: number,
  watch_list_type: string,
) => {
  try {
    const { data, error } = await supabase.rpc("get_watch_list_specific", {
      p_user_id: user_id,
      p_limit: limit,
      p_offset: offset,
      p_watch_list_type: watch_list_type,
    });

    if (error) {
      console.error("Error fetching watch later:", error);
      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    console.error("Error in getWatchHistoryForUser:", error);
    throw error;
  }
};

/**
 * Combine user's feed genres with recommended to ensure at least 5 total.
 */
export function ensureAtLeastFiveGenres(
  userFeed: { genre_code: string; media_type: "movie" | "tv" }[],
  recommended: { genre_code: string; value: number }[],
  mediaType: "movie" | "tv",
) {
  // Sort recommended by highest value first (descending)
  recommended.sort((a, b) => b.value - a.value);

  // Start with the user’s feed genres
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

/**
 * Get Top Movie Genres for a User.
 * Returns at least 5 total (combining user feed_genres + recommended).
 */
export const getTopMovieGenresForUser = async (
  userId?: string,
  user?: IUser,
) => {
  const user_id = user ? user.id : userId;
  try {
    // 1. Get recommended from your Supabase RPC
    const { data: recommended, error } = await supabase.rpc(
      "get_top_movie_genres_for_user",
      { p_user_id: user_id },
    );

    if (error) throw new Error(error.message);

    // 2. Get user’s current movie feed_genres (if available)
    const userFeedGenres = user?.feed_genres || [];
    const userMovieFeedGenres = userFeedGenres.filter(
      (g) => g.media_type === "movie",
    );

    // 3. Combine user feed_genres with recommended to ensure at least 5
    const final = ensureAtLeastFiveGenres(
      userMovieFeedGenres,
      recommended || [],
      "movie",
    );

    // 4. Return the merged array
    return final;
  } catch (error) {
    console.error("Error in getTopMovieGenresForUser:", error);
    throw error;
  }
};

/**
 * Get Top TV Genres for a User.
 * Returns at least 5 total (combining user feed_genres + recommended).
 */
export const getTopTvGenresForUser = async (userId?: string, user?: IUser) => {
  const user_id = user ? user.id : userId;
  try {
    // 1. Get recommended from your Supabase RPC
    const { data: recommended, error } = await supabase.rpc(
      "get_top_tv_genres_for_user",
      { p_user_id: user_id },
    );

    if (error) throw new Error(error.message);

    // 2. Get user’s current tv feed_genres
    const userFeedGenres = user?.feed_genres || [];
    const userTvFeedGenres = userFeedGenres.filter(
      (g) => g.media_type === "tv",
    );

    // 3. Combine user feed_genres with recommended to ensure at least 5
    const final = ensureAtLeastFiveGenres(
      userTvFeedGenres,
      recommended || [],
      "tv",
    );

    return final;
  } catch (error) {
    console.error("Error in getTopTvGenresForUser:", error);
    throw error;
  }
};

export interface UpdateGenreStatsParams {
  genreIds: bigint[];
  mediaType: string;
  userId: string;
}

export async function updateGenreStats({
  genreIds,
  mediaType,
  userId,
}: UpdateGenreStatsParams) {
  const { data, error } = await supabase.rpc("update_genre_stats", {
    genre_ids: genreIds,
    media_type: mediaType,
    user_id: userId,
  });

  if (error) {
    console.error("Error updating genre stats:", error);
    throw new Error("Failed to update genre stats");
  } else {
    console.log("added genres");
  }

  return data;
}

export type Episode = {
  media_id: number;
  media_type: string;
  season_number: number;
  episode_number: number;
  next_episode: boolean; // Indicates if this is the next episode
  next_season_number?: number | null;
  next_episode_number?: number | null;
};

export async function removeFromWatchList(id: string) {
  const { data, error } = await supabase
    .from("watch_list") // your table name
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error removing watch list item:", error.message);
    throw error;
  }
  return data;
}

export interface User {
  id: string;
}
export interface WatchListItem {
  media_id: number;
}

export interface LastEpisodeInfo {
  lastAirDate: string;
  season: number;
  episode: number;
}

export interface NewEpisode {
  user_id: string;
  tv_id: number;
  last_air_date: string; // or Date, depending on how you store it
  season: number;
  episode: number;
  updated_at?: string;
  created_at?: string;
}

export async function updateUserFeedGenres(
  userId: string,
  feedGenres: FeedGenre[],
) {
  const { data, error } = await supabase
    .from("users")
    .update({ feed_genres: feedGenres })
    .eq("id", userId)
    .single();

  return { data, error };
}

export const signOut = async () => {
  // sign out from the current session only
  await supabase.auth.signOut({ scope: "local" });
};

export async function fetchUserNotifications(
  user_id: string,
  page: number = 0,
  notifications_per_page: number = 10,
) {
  const { data, error } = await supabase.rpc("get_user_notifications", {
    _recipient_id: user_id,
    _limit: notifications_per_page,
    _offset: page * notifications_per_page,
  });

  if (error) throw error;

  // Process notifications in parallel
  const notificationsWithMedia = await Promise.all(
    data.map(async (notification: any) => {
      // Check if notification requires media data
      if (
        ["like", "comment", "new_post", "new_episode"].includes(
          notification.notification_type,
        )
      ) {
        try {
          let episode_data;
          const media_data = await getMediaDetails(
            notification.post?.media_type || notification.media_type,
            notification.post?.media_id || notification.media_id,
          );
          console.log(notification.season_number, notification.episode_number);
          if (notification.media_type === "tv") {
            episode_data = await getMediaDetails(
              notification.media_type,
              notification.media_id,
              notification.season_number,
              notification.episode_number,
            );
            return { ...notification, media_data, episode_data };
          }
          return { ...notification, media_data };
        } catch (error) {
          console.error("Error fetching media data:", error);
          return notification; // Return original notification if media fetch fails
        }
      }
      return notification;
    }),
  );

  return notificationsWithMedia;
}
