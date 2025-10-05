'use client';

import { useEffect, useRef, useCallback } from 'react';

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
  const retryQueueRef = useRef<any[]>([]);
  const isRetryingRef = useRef<boolean>(false);

  const processRetryQueue = useCallback(async () => {
    if (isRetryingRef.current || retryQueueRef.current.length === 0) return;

    isRetryingRef.current = true;

    while (retryQueueRef.current.length > 0) {
      const payload = retryQueueRef.current[0];
      try {
        const response = await fetch('/api/saveWatchTime', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          retryQueueRef.current.shift();
        } else {
          break;
        }
      } catch (error) {
        break;
      }
    }

    isRetryingRef.current = false;
  }, []);

  const sendWatchData = useCallback(() => {
    const currentTime = Date.now();
    const sessionTime = Math.floor((currentTime - startTimeRef.current) / 1000);

    if (sessionTime > 0) {
      accumulatedTimeRef.current += sessionTime;
    }

    // Lowered threshold from 60s to 10s to capture shorter sessions
    if (accumulatedTimeRef.current >= 10) {
      const totalMediaSeconds = media_duration * 60;
      const percentageWatched = Math.min(
        (accumulatedTimeRef.current / totalMediaSeconds) * 100,
        100
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

      const sent = navigator.sendBeacon('/api/saveWatchTime', JSON.stringify(payload));

      if (!sent) {
        retryQueueRef.current.push(payload);
        processRetryQueue();
      }

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
    processRetryQueue,
  ]);

  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'hidden') {
      sendWatchData();
    } else if (document.visibilityState === 'visible') {
      startTimeRef.current = Date.now();
    }
  }, [sendWatchData]);

  const handlePageHide = useCallback(() => {
    sendWatchData();
  }, [sendWatchData]);

  useEffect(() => {
    startTimeRef.current = Date.now();
    accumulatedTimeRef.current = 0;

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', sendWatchData);
    window.addEventListener('pagehide', handlePageHide);

    // Reduced interval from 5 minutes to 2 minutes for more frequent saves
    const intervalId = setInterval(
      () => {
        sendWatchData();
      },
      2 * 60 * 1000
    );

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', sendWatchData);
      window.removeEventListener('pagehide', handlePageHide);
      clearInterval(intervalId);

      sendWatchData();
    };
  }, [
    handleVisibilityChange,
    handlePageHide,
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
