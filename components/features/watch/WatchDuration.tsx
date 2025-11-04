'use client';

import { useEffect, useRef } from 'react';
import { logger } from '@/lib/logger';

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

  // Store props in refs to avoid dependency issues
  const propsRef = useRef({
    media_type,
    media_id,
    season_number,
    episode_number,
    user_id,
    media_duration,
  });

  // Update props ref when props change
  useEffect(() => {
    propsRef.current = {
      media_type,
      media_id,
      season_number,
      episode_number,
      user_id,
      media_duration,
    };
  }, [media_type, media_id, season_number, episode_number, user_id, media_duration]);

  useEffect(() => {
    // Define all functions inside useEffect to avoid dependency issues
    const processRetryQueue = async () => {
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
    };

    const sendWatchData = async () => {
      const props = propsRef.current;
      const currentTime = Date.now();
      const sessionTime = Math.floor((currentTime - startTimeRef.current) / 1000);

      if (sessionTime > 0) {
        accumulatedTimeRef.current += sessionTime;
      }

      logger.debug('Watch time check:', {
        sessionTime,
        accumulatedTime: accumulatedTimeRef.current,
        threshold: 10,
      });

      // Lowered threshold from 60s to 10s to capture shorter sessions
      if (accumulatedTimeRef.current >= 10) {
        // Validate media_duration
        if (!props.media_duration || props.media_duration <= 0) {
          logger.error('Invalid media_duration:', {
            media_duration: props.media_duration,
            media_type: props.media_type,
            media_id: props.media_id,
          });
          return; // Don't send data if duration is invalid
        }

        const totalMediaSeconds = props.media_duration * 60;
        const percentageWatched = Math.min(
          (accumulatedTimeRef.current / totalMediaSeconds) * 100,
          100
        );

        const payload = {
          user_id: props.user_id,
          media_type: props.media_type,
          media_id: props.media_id,
          season_number: props.season_number ?? null,
          episode_number: props.episode_number ?? null,
          time_spent: accumulatedTimeRef.current,
          percentage_watched: percentageWatched.toFixed(2),
        };

        // Use fetch with keepalive instead of sendBeacon for proper JSON handling
        try {
          logger.debug('Sending watch time data:', {
            media_type: props.media_type,
            media_id: props.media_id,
            time_spent: accumulatedTimeRef.current,
            percentage: percentageWatched.toFixed(2),
          });

          const response = await fetch('/api/saveWatchTime', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true, // Ensures request completes even if page is closing
          });

          if (!response.ok) {
            const errorText = await response.text();
            logger.error('Failed to save watch time:', {
              status: response.status,
              statusText: response.statusText,
              error: errorText,
              payload,
            });
            // If request fails, add to retry queue
            retryQueueRef.current.push(payload);
            processRetryQueue();
          } else {
            const result = await response.json();
            logger.debug('Watch time saved successfully:', result);
          }
        } catch (error) {
          logger.error('Network error while saving watch time:', {
            error: error instanceof Error ? error.message : String(error),
            payload,
            retryQueueLength: retryQueueRef.current.length,
          });
          // Network error - add to retry queue
          retryQueueRef.current.push(payload);
          processRetryQueue();
        }

        accumulatedTimeRef.current = 0;
      }

      startTimeRef.current = currentTime;
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        sendWatchData();
      } else if (document.visibilityState === 'visible') {
        startTimeRef.current = Date.now();
      }
    };

    const handlePageHide = () => {
      sendWatchData();
    };

    logger.debug('WatchDuration component mounted/updated', {
      media_type,
      media_id,
      season_number,
      episode_number,
      user_id,
      media_duration,
    });

    startTimeRef.current = Date.now();
    accumulatedTimeRef.current = 0;

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', sendWatchData);
    window.addEventListener('pagehide', handlePageHide);

    // Check and send every 30 seconds for more frequent updates
    const intervalId = setInterval(() => {
      sendWatchData();
    }, 30 * 1000); // 30 seconds

    return () => {
      logger.debug('WatchDuration component unmounting, sending final data');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', sendWatchData);
      window.removeEventListener('pagehide', handlePageHide);
      clearInterval(intervalId);

      sendWatchData();
    };
    // Only re-run if media changes (intentionally sparse dependencies)
  }, [media_type, media_id, season_number, episode_number]);

  return <></>;
};

export default WatchDuration;
