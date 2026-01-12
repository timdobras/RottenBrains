'use client';
import React, { useMemo } from 'react';
import { useInView } from 'react-intersection-observer';
import { useInfiniteQuery } from '@tanstack/react-query';
import HomeMediaCardSkeleton from '@/components/features/media/MediaCardSkeleton';
import HomeMediaCardUI from '@/components/features/media/MediaCardUI';
import { fetchHomePageData } from '@/lib/client/fetchHomePageData';

interface InfiniteScrollHomeProps {
  user_id?: string;
  movie_genres?: { genre_code: string }[];
  tv_genres?: { genre_code: string }[];
}

const InfiniteScrollHome: React.FC<InfiniteScrollHomeProps> = ({
  user_id,
  movie_genres,
  tv_genres,
}) => {
  const { ref, inView } = useInView({ threshold: 0.1, rootMargin: '200px' });

  const {
    data,
    // error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    // status,
  } = useInfiniteQuery<{ results: any[]; nextPage: number | undefined }>({
    queryKey: ['homePageData', user_id, movie_genres, tv_genres],
    queryFn: ({ pageParam }) =>
      fetchHomePageData({
        pageParam: pageParam as number,
        userId: user_id,
        movieGenres: movie_genres,
        tvGenres: tv_genres,
      }),
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 1,
  });

  React.useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  // Memoize the flattened media items array to prevent unnecessary re-computations
  const mediaItems = useMemo(
    () => data?.pages.flatMap((page) => page.results) ?? [],
    [data?.pages]
  );

  return (
    <section className="flex w-full flex-col justify-center gap-4 px-4 md:p-0">
      <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(400px,1fr))] gap-8 md:gap-4">
        {mediaItems.map((mediaItem, index) => (
          <HomeMediaCardUI
            key={`${mediaItem.media_type}-${mediaItem.id}`}
            media={mediaItem}
            user_id={user_id}
            rounded
          />
        ))}
        {(isFetching || isFetchingNextPage) && (
          <>
            {Array.from({ length: 12 }).map((_, index) => (
              <HomeMediaCardSkeleton key={index}></HomeMediaCardSkeleton>
            ))}
          </>
        )}
      </div>
      {!isFetching && hasNextPage && <div ref={ref}></div>}
    </section>
  );
};

export default InfiniteScrollHome;
