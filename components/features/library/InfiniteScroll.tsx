"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useInView } from "react-intersection-observer";
import { useToast } from "@/components/ui/use-toast";
import {
  getWatchListSpecific,
  removeFromWatchList,
} from "@/lib/supabase/clientQueries";
import MediaCardClient from "../media/MediaCardClient";

interface WatchListInfiniteScrollProps {
  watchListType: string; // e.g. "watched", "planned", "watching"
  userId: string; // The user's ID
}

const WatchListInfiniteScroll: React.FC<WatchListInfiniteScrollProps> = ({
  watchListType,
  userId,
}) => {
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [page, setPage] = useState<number>(0);
  const limit = 10;

  const { ref, inView } = useInView();
  const { toast } = useToast();

  // ----- LOAD MORE DATA -----
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const offset = page * limit;
      const result = await getWatchListSpecific(
        userId,
        limit,
        offset,
        watchListType,
      );

      if (!result || result.length === 0) {
        setHasMore(false);
      } else {
        setMediaItems((prev) => [...prev, ...result]);
        setPage((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Error fetching watch list items:", error);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page, limit, userId, watchListType]);

  // ----- TRIGGER LOAD WHEN IN VIEW -----
  useEffect(() => {
    if (inView) {
      void loadMore();
    }
  }, [inView, loadMore]);

  // ----- HANDLE REMOVAL -----
  const handleRemove = async (mediaItem: any) => {
    // 1) Call the removal function (Supabase delete)
    console.log(mediaItem.id);
    try {
      await removeFromWatchList(mediaItem.id);
      // 2) Update local state so it's removed from the UI
    } catch (error) {
      console.error("Removal failed:", error);
    } finally {
      toast({
        title: `${mediaItem.id} removed from ${watchListType}`,
      });
      setMediaItems((prev) =>
        prev.filter(
          (item) =>
            !(
              item.media_type === mediaItem.media_type &&
              item.media_id === mediaItem.media_id
            ),
        ),
      );
    }
  };

  return (
    <div className="w-full">
      {/* Card Grid */}
      <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
        {mediaItems && mediaItems.length > 0 ? (
          mediaItems.map((mediaItem) => (
            <div
              key={`${mediaItem.media_type}-${mediaItem.media_id}`}
              className="relative max-w-[350px]"
            >
              {/* The card itself */}
              <MediaCardClient
                user_id={userId}
                media_type={mediaItem.media_type}
                media_id={mediaItem.media_id}
                rounded={true}
              />
              {/* 'X' button to remove the item */}
              <button
                onClick={(e) => {
                  e.stopPropagation(); // in case card is clickable
                  void handleRemove(mediaItem);
                }}
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                X
              </button>
            </div>
          ))
        ) : (
          <p>No media available for this genre at the moment.</p>
        )}
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(350px,1fr))] gap-4">
          {Array.from({ length: 20 }).map((_, index) => (
            <div key={index} className="flex flex-col gap-4">
              <div className="aspect-[16/9] w-full bg-foreground/10"></div>
              <div className="h-6 w-2/3 bg-foreground/10"></div>
              <div className="h-6 w-1/3 bg-foreground/10"></div>
            </div>
          ))}
        </div>
      )}

      {/* Intersection Observer Sentinel */}
      {!loading && hasMore && <div ref={ref} />}
    </div>
  );
};

export default WatchListInfiniteScroll;
