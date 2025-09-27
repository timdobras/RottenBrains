import { fetchMediaData } from "../server/fetchMediaData";
import { getUserPosts, getUserPostsType } from "../supabase/clientQueries";

export async function fetchPostsDataForUser(
  user_id: string,
  page: number = 0,
  current_user_id?: string,
) {
  const posts = await getUserPosts(user_id, page, current_user_id);
  const posts_media_data = await Promise.all(
    posts.map(async (post: any) => {
      console.log(post.post.media_id);
      const media_data = await fetchMediaData(
        post.post.media_id,
        post.post.media_type,
      );
      return { post_data: post, media_data: media_data };
    }),
  );
  return posts_media_data;
}

export async function fetchPostsDataForUserByType(
  user_id: string,
  media_type: string,
  page: number = 0,
  current_user_id?: string,
) {
  const posts = await getUserPostsType(
    user_id,
    media_type,
    page,
    current_user_id,
  );
  const posts_media_data = await Promise.all(
    posts.map(async (post: any) => {
      const media_data = await fetchMediaData(
        post.post.media_id,
        post.post.media_type,
      );
      return { post_data: post, media_data: media_data };
    }),
  );
  return posts_media_data;
}
