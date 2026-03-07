import Image from 'next/image';
import { Suspense } from 'react';
import HomePostCardUI from '@/components/features/posts/HomePostCardUI';
import { fetchPostsData } from '@/lib/server/fetchPostsData';
import { cn } from '@/lib/utils';
import HorizontalScroll from './HorizontalScroll';

interface FollowedPostsSectionProps {
  userId: string;
  /**
   * "default" — standard home page layout.
   * "full-bleed" — fixed card widths for full-width landing page layout.
   */
  variant?: 'default' | 'full-bleed';
}

async function FollowedPostsList({ userId, variant = 'default' }: FollowedPostsSectionProps) {
  const followedPosts = await fetchPostsData(userId);

  if (!followedPosts || followedPosts.length === 0) {
    return (
      <div className="flex h-52 w-full flex-col items-center justify-center gap-4 rounded-[16px] bg-foreground/10">
        <Image
          src="/assets/images/logo_new_black.svg"
          alt=""
          width={48}
          height={48}
          className="invert-on-dark aspect-square h-12 opacity-50"
        />
        <p className="text-foreground/50">Start following your friends to see posts.</p>
      </div>
    );
  }

  return (
    <HorizontalScroll className={cn('-my-4 py-4', variant === 'full-bleed' && 'md:pl-8')}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- fetchPostsData returns untyped Supabase/TMDB data */}
      {followedPosts.map((post: any) => (
        <div
          key={post.id || post.post_data?.post?.id}
          className={cn(
            'flex flex-shrink-0',
            variant === 'default' && 'w-[80vw] md:w-fit',
            variant === 'full-bleed' &&
              'w-[300px] [&>div]:w-full [&>div]:min-w-full [&>div]:max-w-full'
          )}
        >
          <HomePostCardUI post_media_data={post} user_id={userId} />
        </div>
      ))}
    </HorizontalScroll>
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

export default function FollowedPostsSection({
  userId,
  variant = 'default',
}: FollowedPostsSectionProps) {
  return (
    <section>
      <Suspense fallback={<FollowedPostsSkeleton />}>
        <FollowedPostsList userId={userId} variant={variant} />
      </Suspense>
    </section>
  );
}
