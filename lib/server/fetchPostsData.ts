import {
  getPostByIdNew,
  getPostsFromFollowedUsers,
} from "../supabase/serverQueries";
import { fetchMediaData } from "./fetchMediaData";

export async function fetchPostsData(user_id: string) {
  try {
    const posts = await getPostsFromFollowedUsers(user_id);
    const postsMediaData = await Promise.all(
      posts.map(async (post: any) => {
        try {
          const mediaData = await fetchMediaData(
            post.post.media_id,
            post.post.media_type,
          );
          return { post_data: post, media_data: mediaData };
        } catch (error) {
          console.error("Error fetching media data for post:", post, error);
          // Return null or a fallback object if one fetch fails
          return null;
        }
      }),
    );
    // Filter out any failed (null) results
    return postsMediaData.filter(Boolean);
  } catch (error) {
    console.error("Error in fetchPostsData:", error);
    return []; // fallback value so the page can still render
  }
}

export async function fetchPostById(post_id: string, current_user_id?: string) {
  const post = await getPostByIdNew(post_id, current_user_id);
  const posts_media_data = await fetchMediaData(
    post.post.media_id,
    post.post.media_type,
  );
  return { post_data: post, media_data: posts_media_data };
}
