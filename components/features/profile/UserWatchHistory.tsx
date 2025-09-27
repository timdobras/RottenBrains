"use client";

import React, { useEffect, useState } from "react";
import { useInView } from "react-intersection-observer";
import { useUser } from "@/hooks/UserContext";
import { getWatchHistoryForUser } from "@/lib/supabase/clientQueries";
import MediaCardClient from "../media/MediaCardClient";

interface UserWatchHistoryProps {
  userId: string;
  initialPage?: number; // Optional initial page number
  pageSize?: number; // Optional number of items per page
  onHistoryLoaded?: (historyItems: any[]) => void; // Callback when history items are loaded
}

const UserWatchHistory: React.FC<UserWatchHistoryProps> = ({
  userId,
  initialPage = 0, // Default to page 0
  pageSize = 20, // Default to 20 items per page
  onHistoryLoaded,
}) => {
  const [watchHistory, setWatchHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [hasMoreHistory, setHasMoreHistory] = useState<boolean>(true);
  const [historyPage, setHistoryPage] = useState<number>(initialPage);
  const { ref: refHistory, inView: inViewHistory } = useInView();
  const { user: currentUser } = useUser();

  useEffect(() => {
    const loadMoreHistory = async () => {
      if (inViewHistory && hasMoreHistory && !loadingHistory) {
        setLoadingHistory(true);
        try {
          const offset = historyPage * pageSize;
          const res = await getWatchHistoryForUser(userId, pageSize, offset);
          if (res.length === 0) {
            setHasMoreHistory(false);
          } else {
            setWatchHistory((prevData) => [...prevData, ...res]);
            setHistoryPage((prevPage) => prevPage + 1);
            if (onHistoryLoaded) {
              onHistoryLoaded(res);
            }
          }
        } catch (error) {
          console.error("Error fetching watch history:", error);
        } finally {
          setLoadingHistory(false);
        }
      }
    };

    loadMoreHistory();
  }, [
    inViewHistory,
    hasMoreHistory,
    loadingHistory,
    userId,
    historyPage,
    pageSize,
    onHistoryLoaded,
  ]);

  return (
    <>
      <div className="w-full">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-8 px-4 md:gap-4 md:px-0">
          <>
            {watchHistory.map((item) => (
              <MediaCardClient
                media_type={item.media_type}
                media_id={item.media_id}
                season_number={item.season_number}
                episode_number={item.episode_number}
                user_id={currentUser?.id.toString()}
                rounded={true}
              />
            ))}
          </>
          {loadingHistory && !currentUser && <></>}
          {!loadingHistory && hasMoreHistory && (
            <div ref={refHistory} className="h-[100px] w-[100px]"></div>
          )}
          {!hasMoreHistory && (
            <div className="flex w-full flex-col items-center justify-center gap-4 rounded-[8px] bg-foreground/10 p-4">
              <img
                src="/assets/images/logo_new_black.svg"
                alt="No more history"
                className="invert-on-dark h-8 w-8 opacity-50"
              />
              <p className="text-foreground/50">No more watch history</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UserWatchHistory;
