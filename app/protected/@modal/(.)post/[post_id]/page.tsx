import PostModalClient from '@/components/features/posts/PostModalClient';

type Params = Promise<{ post_id: string }>;

// Intercepting route: when a post is opened via a soft navigation from anywhere
// under /protected, render it as a modal overlay (reusing in-memory card data)
// instead of navigating to the full /protected/post/[post_id] page.
export default async function InterceptedPostModal({ params }: { params: Params }) {
  const { post_id } = await params;
  return <PostModalClient postId={post_id} />;
}
