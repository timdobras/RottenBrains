import { redirect } from 'next/navigation';
import PostModalContent from '@/components/features/posts/PostModalContent';
import { fetchPostById } from '@/lib/server/fetchPostsData';
import { getCurrentUser } from '@/lib/db/queries';

type Params = Promise<{ post_id: string }>;

// Standalone post page — the canonical/deep-link target for a single post.
// Soft navigations from a post card are intercepted by app/@modal/(.)post/[post_id]
// and shown as a modal instead; this page renders on a hard load / direct visit.
export default async function PostPage({ params }: { params: Params }) {
  const { post_id } = await params;
  const current_user = await getCurrentUser();
  if (!current_user) {
    redirect('/login');
  }

  const post_media_data = await fetchPostById(post_id, current_user.id);
  if (!post_media_data?.post_data?.post) {
    return <div className="p-8 text-center opacity-60">Post not found.</div>;
  }

  return (
    <div className="mx-auto w-full max-w-4xl p-2 md:p-6">
      <div className="overflow-hidden rounded-[16px]">
        <PostModalContent post_media_data={post_media_data} user_id={current_user.id} />
      </div>
    </div>
  );
}
