"use client";

import { useEffect, useRef, useCallback } from "react";

interface WatchDurationProps {
  media_type: string;
  media_id: number;
  season_number?: number;
  episode_number?: number;
  user_id: string;
  media_duration: number; // Duration of the media in minutes
}

const WatchDuration: React.FC<WatchDurationProps> = ({
  media_type,
  media_id,
  season_number,
  episode_number,
  user_id,
  media_duration,
}) => {
  const startTimeRef = useRef<number>(Date.now());
  const accumulatedTimeRef = useRef<number>(0);

  const sendWatchData = useCallback(() => {
    const currentTime = Date.now();
    // Calculate how much time (in seconds) has elapsed since the last checkpoint
    const sessionTime = Math.floor((currentTime - startTimeRef.current) / 1000);

    if (sessionTime > 0) {
      accumulatedTimeRef.current += sessionTime;
    }

    // Only send data if there's meaningful accumulated time
    if (accumulatedTimeRef.current > 60) {
      const totalMediaSeconds = media_duration * 60;
      const percentageWatched = Math.min(
        (accumulatedTimeRef.current / totalMediaSeconds) * 100,
        100,
      );

      const payload = {
        user_id,
        media_type,
        media_id,
        season_number: season_number ?? null,
        episode_number: episode_number ?? null,
        time_spent: accumulatedTimeRef.current,
        percentage_watched: percentageWatched.toFixed(2),
      };

      // Use sendBeacon to send data reliably during unload or visibility change
      navigator.sendBeacon("/api/saveWatchTime", JSON.stringify(payload));

      // Reset after sending
      accumulatedTimeRef.current = 0;
    }

    startTimeRef.current = currentTime;
  }, [
    user_id,
    media_type,
    media_id,
    season_number,
    episode_number,
    media_duration,
  ]);

  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === "hidden") {
      // When the tab goes hidden, send data if we have any
      sendWatchData();
    } else if (document.visibilityState === "visible") {
      // When the tab becomes visible again, reset startTime for a fresh session
      startTimeRef.current = Date.now();
    }
  }, [sendWatchData]);

  useEffect(() => {
    // Start tracking as soon as component mounts or media changes
    startTimeRef.current = Date.now();
    accumulatedTimeRef.current = 0;

    // Handle tab visibility changes
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Handle page unload to send last chunk of data
    window.addEventListener("beforeunload", sendWatchData);

    // Also send data every 5 minutes (300000 ms)
    const intervalId = setInterval(
      () => {
        sendWatchData();
      },
      5 * 60 * 1000,
    );

    return () => {
      // Cleanup: remove event listeners
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", sendWatchData);
      clearInterval(intervalId);

      // Send last data chunk if any before unmounting
      sendWatchData();
    };
  }, [
    handleVisibilityChange,
    sendWatchData,
    media_type,
    media_id,
    season_number,
    episode_number,
    media_duration,
  ]);

  return <></>;
};

export default WatchDuration;
