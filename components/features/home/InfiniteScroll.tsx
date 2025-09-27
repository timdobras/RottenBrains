"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useInView } from "react-intersection-observer";
import { getPopular } from "@/lib/tmdb";
import { fetchInfiniteScrollHome } from "@/lib/server/fetchInfiniteScrollHome";
import HomeMediaCardSkeleton from "@/components/features/media/MediaCardSkeleton";
import HomeMediaCardUI from "@/components/features/media/MediaCardUI";
import { useUser } from "@/hooks/UserContext";
import FixedAd from "../ads/300x250Ad";
import MobileBannerExo from "../ads/MobileBannerExo";

interface InfiniteScrollHomeProps {
  user_id?: string;
  movie_genres?: any;
  tv_genres?: any;
}

const InfiniteScrollHome: React.FC<InfiniteScrollHomeProps> = ({
  user_id,
  movie_genres,
  tv_genres,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [page, setPage] = useState<number>(1);
  const { ref, inView } = useInView({ threshold: 0.1, rootMargin: "200px" });
  const targetRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();

  const loadMore = useCallback(async () => {
    if (inView && hasMore && !loading) {
      setLoading(true);
      try {
        // Fetch recommendations in parallel
        if (user_id) {
          const results = await fetchInfiniteScrollHome(
            movie_genres,
            tv_genres,
            page,
            user_id,
          );

          if (results.length === 0 || page === 10) {
            setHasMore(false);
          } else {
            setMediaItems((prev) => [...prev, ...results]);
            setPage((prevPage) => prevPage + 1);
          }
        } else {
          const combined_results = await getPopular(page);
          console.log(combined_results);
          if (combined_results.results.length === 0 || page === 10) {
            setHasMore(false);
          } else {
            setMediaItems((prev) => [...prev, ...combined_results.results]);
            setPage((prevPage) => prevPage + 1);
          }
        }
      } catch (error) {
        console.error("Error fetching posts:", error);
      } finally {
        setLoading(false);
      }
    }
  }, [inView, hasMore, loading, page, user_id]);

  useEffect(() => {
    loadMore();
  }, [loadMore]);

  return (
    <section
      className="flex w-full flex-col justify-center gap-4 px-4 md:p-0"
      ref={targetRef}
    >
      <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-8 md:gap-4">
        {mediaItems && mediaItems.length > 0 ? (
          mediaItems.map((mediaItem, index) => {
            if (index === 6 || (index % 24 === 0 && index !== 0)) {
              return (
                <>
                  <HomeMediaCardUI
                    key={`${mediaItem.media_type}-${mediaItem.id}`}
                    media={mediaItem}
                    user_id={user_id}
                    rounded
                  />
                </>
              );
            }
            return (
              <HomeMediaCardUI
                key={`${mediaItem.media_type}-${mediaItem.id}`}
                media={mediaItem}
                user_id={user_id}
                rounded
              />
            );
          })
        ) : (
          <></>
        )}
        {loading && (
          <>
            {Array.from({ length: 40 }).map((_, index) => (
              <HomeMediaCardSkeleton></HomeMediaCardSkeleton>
            ))}
          </>
        )}
      </div>
      {!loading && hasMore && <div ref={ref}></div>}
    </section>
  );
};

export default InfiniteScrollHome;
