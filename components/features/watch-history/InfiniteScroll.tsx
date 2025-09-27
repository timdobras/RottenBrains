"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useInView } from "react-intersection-observer";
import { format, isToday, isYesterday } from "date-fns";
import { useUser } from "@/hooks/UserContext";
import MediaCardClient from "../media/MediaCardClient";
import { getWatchHistoryForUser } from "@/lib/supabase/clientQueries";

const WatchHistoryWithInfiniteScroll = () => {
  const { user } = useUser();

  // ----------------------------
  // Local State
  // ----------------------------
  const [watchHistory, setWatchHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [page, setPage] = useState<number>(0); // We'll use page * limit as offset
  const limit = 20;

  // Intersection Observer “sentinel”
  const { ref, inView } = useInView();

  // ----------------------------
  // Load More Data
  // ----------------------------
  const loadMore = useCallback(async () => {
    // Only load if we have a user, not already loading, and still have data
    if (!user || loading || !hasMore) return;

    setLoading(true);
    try {
      const offset = page * limit;
      // Make sure getWatchHistoryForUser is client-compatible
      // (i.e., it can be called from client side).
      const newHistory = await getWatchHistoryForUser(
        user.id.toString(),
        limit,
        offset,
      );

      if (!newHistory || newHistory.length === 0) {
        setHasMore(false);
      } else {
        setWatchHistory((prev) => [...prev, ...newHistory]);
        setPage((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Error fetching watch history:", error);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [user, loading, hasMore, page, limit]);

  // ----------------------------
  // Trigger Load More on InView
  // ----------------------------
  useEffect(() => {
    if (inView) {
      void loadMore();
    }
  }, [inView, loadMore]);

  // ----------------------------
  // If no user, show fallback
  // ----------------------------
  if (!user) {
    return (
      <div className="flex w-full justify-center py-4">
        <span>Loading user...</span>
      </div>
    );
  }

  // ----------------------------
  // Group Watch History by Date
  // ----------------------------
  const groupedByDate = watchHistory.reduce<Record<string, any[]>>(
    (acc, item) => {
      const watchedDate = new Date(item.created_at);
      const dateKey = format(watchedDate, "yyyy-MM-dd");
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(item);
      return acc;
    },
    {},
  );

  // Sort dates descending
  const sortedDates = Object.keys(groupedByDate).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
  );

  // Helper to label the date
  const getDateLabel = (dateString: string) => {
    const d = new Date(dateString);
    const formattedDate = format(d, "dd MMM yyyy");
    if (isToday(d)) return `Today - ${formattedDate}`;
    if (isYesterday(d)) return `Yesterday - ${formattedDate}`;
    return formattedDate;
  };

  return (
    <div className="w-full">
      {watchHistory.length === 0 && !loading && !hasMore && (
        <div className="flex w-full flex-col items-center justify-center gap-4 rounded-[8px] bg-foreground/10 p-4">
          <img
            src="/assets/images/logo_new_black.svg"
            alt="No watch history"
            className="invert-on-dark h-8 w-8 opacity-50"
          />
          <p className="text-foreground/50">No watch history found.</p>
        </div>
      )}

      {/* Grouped display by date */}
      {sortedDates.map((dateKey) => {
        const items = groupedByDate[dateKey];
        return (
          <div key={dateKey} className="flex flex-col">
            <div className="flex flex-row items-center gap-4 py-2">
              <div className="h-1 w-1 rounded-full bg-accent"></div>
              <h2 className="text-lg font-semibold">{getDateLabel(dateKey)}</h2>
            </div>
            <div className="mb-4 flex flex-row flex-wrap gap-4 border-l-2 border-foreground/20 pb-4 pl-4">
              {items.map((media) => {
                // Convert -1 to null, if that’s how your DB denotes "no episode or season"
                const season_number =
                  media.season_number === -1 ? null : media.season_number;
                const episode_number =
                  media.episode_number === -1 ? null : media.episode_number;

                return (
                  <MediaCardClient
                    key={media.id /* or media.media_id if needed */}
                    user_id={user.id.toString()}
                    media_type={media.media_type}
                    media_id={
                      media.media_id /* or media.media_id if that's TMDB ID */
                    }
                    season_number={season_number}
                    episode_number={episode_number}
                    rounded
                  />
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Loading skeleton while fetching */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="flex flex-col gap-4">
              <div className="aspect-[16/9] w-full bg-foreground/10" />
              <div className="h-6 w-2/3 bg-foreground/10" />
              <div className="h-6 w-1/3 bg-foreground/10" />
            </div>
          ))}
        </div>
      )}

      {/* Intersection Observer sentinel */}
      {!loading && hasMore && <div ref={ref} className="h-10" />}

      {/* “No more history” message */}
      {!hasMore && watchHistory.length > 0 && (
        <div className="mt-4 flex w-full flex-col items-center justify-center gap-4 rounded-[8px] bg-foreground/10 p-4">
          <img
            src="/assets/images/logo_new_black.svg"
            alt="No more history"
            className="invert-on-dark h-8 w-8 opacity-50"
          />
          <p className="text-foreground/50">No more watch history</p>
        </div>
      )}
    </div>
  );
};

export default WatchHistoryWithInfiniteScroll;
