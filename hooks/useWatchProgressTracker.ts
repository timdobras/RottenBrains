'use client';

import { useCallback, useEffect, useRef } from 'react';

import { WATCH_HISTORY } from '@/lib/constants';

/**
 * Precise watch-history tracking driven by the real player.
 *
 * Returns an `onProgress` callback to hand to <CustomPlayer onProgress>. It
 * persists to /api/saveWatchTime using the exact `playback_position` (seconds)
 * — the precise path — throttled to ~FLUSH_INTERVAL while playing, plus on
 * pause, on end, and on tab-hide/pagehide (keepalive). Percentage is computed
 * from the real duration and snapped to 100 once past COMPLETED_THRESHOLD.
 *
 * Lives in the always-mounted shell, so tracking continues in mini mode too.
 * Replaces the old WatchDuration + videasyTracker (wall-clock + postMessage).
 */

const FLUSH_INTERVAL_MS = 15_000;

export interface TrackCoords {
  media_type: string;
  media_id: number;
  season_number?: number | null;
  episode_number?: number | null;
}

interface ProgressState {
  currentTime: number;
  duration: number;
  paused: boolean;
  ended: boolean;
}

interface SavePayload {
  media_type: string;
  media_id: number;
  season_number: number | null;
  episode_number: number | null;
  time_spent: number;
  percentage_watched: string;
  playback_position: number;
}

export function useWatchProgressTracker(
  coords: TrackCoords,
  opts: { enabled: boolean },
): (s: ProgressState) => void {
  const coordsRef = useRef(coords);
  coordsRef.current = coords;
  const enabledRef = useRef(opts.enabled);
  enabledRef.current = opts.enabled;

  const latestRef = useRef<ProgressState | null>(null);
  const lastFlushAtRef = useRef(0);
  const lastSavedPosRef = useRef(-1);
  const retryQueueRef = useRef<SavePayload[]>([]);
  const retryingRef = useRef(false);

  // Reset throttle/dedup state whenever the title (coords) changes.
  const coordKey = `${coords.media_type}:${coords.media_id}:${coords.season_number ?? ''}:${coords.episode_number ?? ''}`;
  useEffect(() => {
    latestRef.current = null;
    lastFlushAtRef.current = 0;
    lastSavedPosRef.current = -1;
  }, [coordKey]);

  const processRetry = useCallback(async () => {
    if (retryingRef.current || retryQueueRef.current.length === 0) return;
    retryingRef.current = true;
    while (retryQueueRef.current.length > 0) {
      const payload = retryQueueRef.current[0];
      try {
        const r = await fetch('/api/saveWatchTime', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (r.ok) retryQueueRef.current.shift();
        else break;
      } catch {
        break;
      }
    }
    retryingRef.current = false;
  }, []);

  const flush = useCallback(
    (state: ProgressState | null, keepalive = false) => {
      if (!enabledRef.current) return;
      const s = state ?? latestRef.current;
      if (!s || !(s.duration > 0)) return;
      const pos = Math.floor(s.currentTime);
      // nothing new since the last save (and not an end event)
      if (pos === lastSavedPosRef.current && !s.ended) return;
      lastSavedPosRef.current = pos;
      lastFlushAtRef.current = Date.now();

      let percentage = Math.min(Math.max((s.currentTime / s.duration) * 100, 0), 100);
      if (s.ended || percentage >= WATCH_HISTORY.COMPLETED_THRESHOLD) percentage = 100;

      const c = coordsRef.current;
      const payload: SavePayload = {
        media_type: c.media_type,
        media_id: c.media_id,
        season_number: c.season_number ?? null,
        episode_number: c.episode_number ?? null,
        time_spent: pos,
        percentage_watched: percentage.toFixed(2),
        playback_position: pos,
      };

      fetch('/api/saveWatchTime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive,
      })
        .then((r) => {
          if (!r.ok) {
            retryQueueRef.current.push(payload);
            processRetry();
          }
        })
        .catch(() => {
          retryQueueRef.current.push(payload);
          processRetry();
        });
    },
    [processRetry],
  );

  const onProgress = useCallback(
    (s: ProgressState) => {
      latestRef.current = s;
      if (!enabledRef.current || !(s.duration > 0)) return;
      // pause / end → flush immediately; otherwise throttle by wall-clock.
      if (s.ended || s.paused) {
        flush(s);
        return;
      }
      if (Date.now() - lastFlushAtRef.current >= FLUSH_INTERVAL_MS) flush(s);
    },
    [flush],
  );

  // Final save when the tab is hidden or the page is being unloaded.
  useEffect(() => {
    const onHide = () => flush(latestRef.current, true);
    const onVis = () => {
      if (document.visibilityState === 'hidden') flush(latestRef.current, true);
    };
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [flush]);

  return onProgress;
}
