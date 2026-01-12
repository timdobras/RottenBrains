import { Suspense } from 'react';
import HomePostCardUI from '@/components/features/posts/HomePostCardUI';
import { fetchPostsData } from '@/lib/server/fetchPostsData';

interface FollowedPostsSectionProps {
  userId: string;
}

async function FollowedPostsList({ userId }: FollowedPostsSectionProps) {
  const followedPosts = await fetchPostsData(userId);

  if (!followedPosts || followedPosts.length === 0) {
    return (
      <div className="flex h-52 w-full flex-col items-center justify-center gap-4 rounded-[16px] bg-foreground/10">
        <img
          src="/assets/images/logo_new_black.svg"
          alt=""
          className="invert-on-dark aspect-square h-12 opacity-50"
        />
        <p className="text-foreground/50">Start following your friends to see posts.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="gradient-edge absolute right-0 top-0 z-20 h-full w-[5%]" />
      <div
        className="hidden-scrollbar flex snap-x snap-mandatory flex-row gap-4 overflow-x-auto px-4 md:px-0 md:pr-4"
        id="rotten-posts-one"
      >
        {followedPosts.map((post: any) => (
          <div
            key={post.id || post.post_data?.post?.id}
            className="flex w-[80vw] flex-shrink-0 snap-start scroll-ml-4 md:w-fit"
          >
            <HomePostCardUI post_media_data={post} user_id={userId} />
          </div>
        ))}
      </div>
    </div>
  );
}

function FollowedPostsSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden px-4 md:px-0">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="flex h-[300px] w-[80vw] flex-shrink-0 animate-pulse rounded-[8px] bg-foreground/10 md:w-[250px]"
        />
      ))}
    </div>
  );
}

export default function FollowedPostsSection({ userId }: FollowedPostsSectionProps) {
  return (
    <section>
      <Suspense fallback={<FollowedPostsSkeleton />}>
        <FollowedPostsList userId={userId} />
      </Suspense>
    </section>
  );
}
