'use client';

import { useEffect } from 'react';
import { LogoMark } from '@/components/ui/Logo';
import { useInView } from 'react-intersection-observer';
import { useInfiniteQuery } from '@tanstack/react-query';
import HomePostCardUI from '@/components/features/posts/HomePostCardUI';
import PostSkeleton from '@/components/features/posts/PostSkeleton';
import { useUser } from '@/hooks/UserContext';
import { fetchFeedPosts } from '@/lib/client/fetchFeedData';
import { queryKeys } from '@/lib/queryKeys';
import { PAGINATION } from '@/lib/constants';
import { logger } from '@/lib/logger';

export default function FeedList() {
  const { ref, inView } = useInView();
  const { user } = useUser();
  const userId = user?.id?.toString();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: queryKeys.feed.infinite(userId ?? ''),
    queryFn: async ({ pageParam }) => {
      return fetchFeedPosts(userId!, pageParam);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage || lastPage.length < PAGINATION.POSTS_PER_PAGE) {
        return undefined;
      }
      return allPages.length;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });

  const posts = data?.pages.flat() ?? [];

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage().catch((error) => {
        logger.error('Error fetching next feed page:', error);
      });
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isError) {
    return (
      <div className="flex w-full flex-col items-center justify-center gap-4 p-4">
        <p className="text-foreground/50">Error loading feed</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex w-full flex-col items-center gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="w-full max-w-[500px]">
            <PostSkeleton />
          </div>
        ))}
      </div>
    );
  }

  if (posts.length === 0 && !hasNextPage) {
    return (
      <div className="flex w-full flex-col items-center justify-center gap-4 p-8">
        <LogoMark className="h-10 w-10 text-foreground opacity-50" />
        <p className="text-foreground/50 text-center">
          Your feed is empty. Follow people to see their posts here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-4">
      {posts.map((post: any) => (
        <div key={post.post_data?.post?.id} className="w-full max-w-[500px]">
          <HomePostCardUI
            post_media_data={post}
            user_id={userId}
            variant="feed"
          />
        </div>
      ))}
      {isFetchingNextPage && (
        <div className="w-full max-w-[500px]">
          <PostSkeleton />
        </div>
      )}
      {!isLoading && !isFetchingNextPage && hasNextPage && (
        <div ref={ref} className="h-[100px] w-full" />
      )}
      {!hasNextPage && posts.length > 0 && (
        <div className="flex w-full max-w-[500px] flex-col items-center justify-center gap-4 rounded-[8px] bg-foreground/10 p-4">
          <LogoMark className="h-8 w-8 text-foreground opacity-50" />
          <p className="text-foreground/50">No more posts</p>
        </div>
      )}
    </div>
  );
}
