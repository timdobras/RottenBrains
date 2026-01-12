'use client';

import { useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { useInfiniteQuery } from '@tanstack/react-query';
import HomePostCardUI from '@/components/features/posts/HomePostCardUI';
import { useUser } from '@/hooks/UserContext';
import { fetchPostsDataForUser } from '@/lib/client/fetchPostData';
import { queryKeys } from '@/lib/queryKeys';
import { logger } from '@/lib/logger';

interface UserPostsProps {
  userId: string;
  initialPage?: number; // Optional prop for the initial page
  pageSize?: number; // Optional prop for the number of posts per page
  onPostsLoaded?: (posts: any[]) => void; // Callback when posts are loaded
}

const UserPosts: React.FC<UserPostsProps> = ({
  userId,
  initialPage = 0,
  pageSize = 10,
  onPostsLoaded,
}) => {
  const { ref: refPosts, inView: inViewPosts } = useInView();
  const { user: currentUser } = useUser();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: queryKeys.posts.infinite(userId),
    queryFn: async ({ pageParam }) => {
      const posts = await fetchPostsDataForUser(userId, pageParam, currentUser?.id.toString());
      return posts;
    },
    initialPageParam: initialPage,
    getNextPageParam: (lastPage, allPages) => {
      // If last page has fewer items than pageSize, no more pages
      if (!lastPage || lastPage.length < pageSize) {
        return undefined;
      }
      return allPages.length;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Flatten all pages into single array
  const userPosts = data?.pages.flat() ?? [];

  // Trigger callback when posts are loaded
  useEffect(() => {
    if (data?.pages && onPostsLoaded) {
      const latestPage = data.pages[data.pages.length - 1];
      if (latestPage && latestPage.length > 0) {
        onPostsLoaded(latestPage);
      }
    }
  }, [data?.pages, onPostsLoaded]);

  // Fetch next page when intersection observer triggers
  useEffect(() => {
    if (inViewPosts && hasNextPage && !isFetchingNextPage) {
      fetchNextPage().catch((error) => {
        logger.error('Error fetching next page of posts:', error);
      });
    }
  }, [inViewPosts, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isError) {
    return (
      <div className="flex w-full flex-col items-center justify-center gap-4 p-4">
        <p className="text-foreground/50">Error loading posts</p>
      </div>
    );
  }

  return (
    <div
      className="grid w-full gap-4 p-4 md:p-0"
      style={{
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      }}
    >
      {userPosts.map((post) => (
        <div key={post.post_data?.post?.id} className="w-full">
          <HomePostCardUI post_media_data={post} user_id={currentUser?.id.toString()} />
        </div>
      ))}
      {(isLoading || isFetchingNextPage) && <div></div>}
      {!isLoading && !isFetchingNextPage && hasNextPage && (
        <div ref={refPosts} className="h-[100px] w-[100px]"></div>
      )}
      {!hasNextPage && userPosts.length > 0 && (
        <div
          className="flex w-full flex-col items-center justify-center gap-4 rounded-[8px] bg-foreground/10 p-4"
          key={'loader'}
        >
          <img
            src="/assets/images/logo_new_black.svg"
            alt="No more posts"
            className="invert-on-dark h-8 w-8 opacity-50"
          />
          <p className="text-foreground/50">No more posts</p>
        </div>
      )}
    </div>
  );
};

export default UserPosts;
