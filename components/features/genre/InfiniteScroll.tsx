"use client";

import { getFromGenres } from "@/lib/tmdb";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useInView } from "react-intersection-observer";
import { useUser } from "@/hooks/UserContext";
import HomeMediaCardSkeleton from "@/components/features/media/MediaCardSkeleton";
import HomeMediaCardClient from "@/components/features/media/MediaCardClient";
import AdBanner from "../ads/GoogleDisplayAd";

interface InfiniteScrollByGenreProps {
  genre_id: number;
  media_type: "movie" | "tv";
}

const InfiniteScrollByGenre: React.FC<InfiniteScrollByGenreProps> = ({
  genre_id,
  media_type,
}) => {
  const { user } = useUser();

  const [loading, setLoading] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [page, setPage] = useState<number>(1);
  const { ref, inView } = useInView();
  const targetRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (inView && hasMore && !loading) {
      setLoading(true);
      try {
        const result = await getFromGenres(
          media_type,
          page,
          genre_id.toString(),
        );
        const resultsWithMediaType = result.results.map((item: any) => ({
          ...item,
          media_type,
        }));

        if (resultsWithMediaType.length === 0 || page === 10) {
          setHasMore(false);
        } else {
          setMediaItems((prevMediaItems) => [
            ...prevMediaItems,
            ...resultsWithMediaType,
          ]);
          setPage((prevPage) => prevPage + 1);
        }
      } catch (error) {
        console.error("Error fetching media:", error);
      } finally {
        setLoading(false);
      }
    }
  }, [inView, hasMore, loading, media_type, page, genre_id]);

  useEffect(() => {
    loadMore();
  }, [loadMore]);

  return (
    <div
      className="flex w-full flex-col justify-center gap-4 p-4 md:p-0"
      ref={targetRef}
    >
      <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
        {mediaItems && mediaItems.length > 0 ? (
          mediaItems.map((mediaItem, index) => {
            if (index === 2 || (index % 30 === 0 && index !== 0)) {
              console.log(mediaItem);
              return (
                <>
                  <HomeMediaCardClient
                    user_id={user?.id.toString()}
                    key={`${mediaItem.media_type}-${mediaItem.id}`}
                    media_type={mediaItem.media_type}
                    media_id={mediaItem.id}
                    rounded={true}
                  />
                </>
              );
            }
            return (
              <HomeMediaCardClient
                user_id={user?.id.toString()}
                key={`${mediaItem.media_type}-${mediaItem.id}`}
                media_type={mediaItem.media_type}
                media_id={mediaItem.id}
                rounded={true}
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
    </div>
  );
};

export default InfiniteScrollByGenre;
