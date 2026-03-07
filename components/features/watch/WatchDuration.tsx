'use client';

import { useEffect, useRef, useState } from 'react';
import { logger } from '@/lib/logger';
import { videasyPlayback } from '@/lib/videasyTracker';

interface WatchDurationProps {
  media_type: string;
  media_id: number;
  season_number?: number;
  episode_number?: number;
  media_duration: number; // Duration of the media in minutes
}

const WatchDuration: React.FC<WatchDurationProps> = ({
  media_type,
  media_id,
  season_number,
  episode_number,
  media_duration,
}) => {
  const startTimeRef = useRef<number>(Date.now());
  const accumulatedTimeRef = useRef<number>(0);
  const retryQueueRef = useRef<any[]>([]);
  const isRetryingRef = useRef<boolean>(false);
  const lastVideasyPositionRef = useRef<number>(0);
  // Track provider in a ref so the send function always has the current value
  // without needing to re-mount the effect when provider changes.
  const providerRef = useRef<string>('');

  // Read provider from localStorage (same source as VideoShell)
  useEffect(() => {
    const stored = localStorage.getItem('video_provider');
    providerRef.current = stored || '';

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'video_provider') {
        providerRef.current = e.newValue || '';
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Store props in refs to avoid dependency issues
  const propsRef = useRef({
    media_type,
    media_id,
    season_number,
    episode_number,
    media_duration,
  });

  // Update props ref when props change
  useEffect(() => {
    propsRef.current = {
      media_type,
      media_id,
      season_number,
      episode_number,
      media_duration,
    };
  }, [media_type, media_id, season_number, episode_number, media_duration]);

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

    /**
     * Send watch data using Videasy's real playback position from postMessage.
     * Uses absolute percentage (based on actual video position / duration)
     * and includes the playback_position for resume support.
     */
    const sendVideasyWatchData = async () => {
      const props = propsRef.current;

      // Only send if Videasy has reported data
      if (!videasyPlayback.hasData || videasyPlayback.currentTime <= 0) {
        logger.debug('Videasy: No playback data yet, skipping save');
        return;
      }

      // Skip if position hasn't changed since last save
      if (videasyPlayback.currentTime === lastVideasyPositionRef.current) {
        logger.debug('Videasy: Position unchanged, skipping save');
        return;
      }

      // Calculate percentage from actual playback position
      // Use Videasy-reported duration if available, otherwise fall back to TMDB duration
      const totalSeconds =
        videasyPlayback.duration > 0 ? videasyPlayback.duration : props.media_duration * 60;

      const percentageWatched = Math.min((videasyPlayback.currentTime / totalSeconds) * 100, 100);

      const payload = {
        media_type: props.media_type,
        media_id: props.media_id,
        season_number: props.season_number ?? null,
        episode_number: props.episode_number ?? null,
        time_spent: videasyPlayback.currentTime,
        percentage_watched: percentageWatched.toFixed(2),
        playback_position: videasyPlayback.currentTime,
      };

      lastVideasyPositionRef.current = videasyPlayback.currentTime;

      try {
        logger.debug('Videasy: Sending watch data:', {
          media_id: props.media_id,
          currentTime: videasyPlayback.currentTime,
          duration: videasyPlayback.duration || totalSeconds,
          percentage: percentageWatched.toFixed(2),
        });

        const response = await fetch('/api/saveWatchTime', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        });

        if (!response.ok) {
          const errorText = await response.text();
          logger.error('Videasy: Failed to save watch time:', {
            status: response.status,
            error: errorText,
          });
          retryQueueRef.current.push(payload);
          processRetryQueue();
        } else {
          const result = await response.json();
          logger.debug('Videasy: Watch time saved successfully:', result);
        }
      } catch (error) {
        logger.error('Videasy: Network error saving watch time:', {
          error: error instanceof Error ? error.message : String(error),
        });
        retryQueueRef.current.push(payload);
        processRetryQueue();
      }
    };

    /**
     * Send watch data using wall-clock time (original approach for non-Videasy providers).
     * Accumulates time spent on the page and estimates percentage from TMDB runtime.
     */
    const sendWallClockWatchData = async () => {
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
          return;
        }

        const totalMediaSeconds = props.media_duration * 60;
        const percentageWatched = Math.min(
          (accumulatedTimeRef.current / totalMediaSeconds) * 100,
          100
        );

        const payload = {
          media_type: props.media_type,
          media_id: props.media_id,
          season_number: props.season_number ?? null,
          episode_number: props.episode_number ?? null,
          time_spent: accumulatedTimeRef.current,
          percentage_watched: percentageWatched.toFixed(2),
        };

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
            keepalive: true,
          });

          if (!response.ok) {
            const errorText = await response.text();
            logger.error('Failed to save watch time:', {
              status: response.status,
              statusText: response.statusText,
              error: errorText,
              payload,
            });
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
          retryQueueRef.current.push(payload);
          processRetryQueue();
        }

        accumulatedTimeRef.current = 0;
      }

      startTimeRef.current = currentTime;
    };

    // Choose the appropriate send function based on provider.
    // Reads providerRef at call time so it always uses the current provider,
    // even if the provider changed after this effect was set up.
    const sendWatchData = () => {
      if (providerRef.current === 'Videasy') {
        sendVideasyWatchData();
      } else {
        sendWallClockWatchData();
      }
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
      media_duration,
    });

    startTimeRef.current = Date.now();
    accumulatedTimeRef.current = 0;
    lastVideasyPositionRef.current = 0;

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', sendWatchData);
    window.addEventListener('pagehide', handlePageHide);

    // Check and send every 30 seconds for more frequent updates
    const intervalId = setInterval(() => {
      sendWatchData();
    }, 30 * 1000);

    return () => {
      logger.debug('WatchDuration component unmounting, sending final data');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', sendWatchData);
      window.removeEventListener('pagehide', handlePageHide);
      clearInterval(intervalId);

      sendWatchData();
    };
    // Only re-run if media changes. Provider is tracked via ref, not state.
  }, [media_type, media_id, season_number, episode_number]);

  return <></>;
};

export default WatchDuration;
