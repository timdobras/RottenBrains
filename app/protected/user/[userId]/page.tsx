import PostModalFull from "@/components/features/posts/PostModalFul";
import UserPosts from "@/components/features/profile/UserPosts";
import { fetchPostById } from "@/lib/server/fetchPostsData";
import { getCurrentUser } from "@/lib/supabase/serverQueries";

type Params = Promise<{ userId: string }>;
type SearchParams = Promise<{ post_id?: string }>;
export default async function ProtectedPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { userId } = await params;
  const { post_id } = await searchParams;
  const current_user = await getCurrentUser();
  const post_media_data = post_id
    ? await fetchPostById(post_id, current_user.id)
    : null;
  return (
    <>
      {post_id && (
        <>
          {post_media_data ? (
            <PostModalFull
              post_media_data={post_media_data}
              user_id={userId}
            ></PostModalFull>
          ) : (
            <div></div>
          )}
        </>
      )}
      <UserPosts userId={userId}></UserPosts>
    </>
  );
}
