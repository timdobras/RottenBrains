import PostModalClient from '@/components/features/posts/PostModalClient';

type Params = Promise<{ post_id: string }>;

// Intercepting route: when a post is opened via a soft navigation from anywhere
// in the app (homepage, feed, profile, notifications…), render it as a modal
// overlay (reusing in-memory card data) instead of navigating to the full
// /post/[post_id] page. The slot lives at the root layout so it intercepts
// navigations originating outside /protected too.
export default async function InterceptedPostModal({ params }: { params: Params }) {
  const { post_id } = await params;
  return <PostModalClient postId={post_id} />;
}
