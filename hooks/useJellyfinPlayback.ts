'use client';

import { useEffect, useState } from 'react';

interface JellyfinPlaybackState {
  isConfigured: boolean;
  isLoading: boolean;
  jellyfinUrl: string | null;
  isInLibrary: boolean;
}

type ResolveResult = Omit<JellyfinPlaybackState, 'isLoading'>;

// MODULE-level cache + in-flight dedupe (shared across every hook instance) so
// multiple components resolving the SAME title — e.g. the watch page renders
// both <JellyfinButton> and <JellyfinPlayButton> — issue a SINGLE
// /api/jellyfin/resolve request instead of one each. Previously each hook
// instance had its own ref-cache, so identical resolves fired in parallel.
const resultCache = new Map<string, ResolveResult>();
const inflight = new Map<string, Promise<ResolveResult>>();

function cacheKeyOf(
  mediaType: string,
  mediaId: number,
  seasonNumber?: number,
  episodeNumber?: number
): string {
  return `${mediaType}-${mediaId}${seasonNumber ? `-${seasonNumber}` : ''}${episodeNumber ? `-${episodeNumber}` : ''}`;
}

async function resolveJellyfin(
  mediaType: string,
  mediaId: number,
  seasonNumber?: number,
  episodeNumber?: number
): Promise<ResolveResult> {
  const key = cacheKeyOf(mediaType, mediaId, seasonNumber, episodeNumber);
  const cached = resultCache.get(key);
  if (cached) return cached;
  const pending = inflight.get(key);
  if (pending) return pending;

  const notConfigured: ResolveResult = {
    isConfigured: false,
    jellyfinUrl: null,
    isInLibrary: false,
  };

  const promise = (async (): Promise<ResolveResult> => {
    try {
      // The API checks auth + Jellyfin config server-side (Better Auth session +
      // db-server) and reports `configured` in the response.
      const res = await fetch('/api/jellyfin/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdb_id: mediaId,
          media_type: mediaType,
          season_number: seasonNumber,
          episode_number: episodeNumber,
        }),
      });

      // 401 (no session) or any non-OK → treat as not configured. Not cached so
      // a transient failure doesn't stick.
      if (!res.ok) return notConfigured;
      const data = await res.json();
      if (data.configured === false) return notConfigured;

      const result: ResolveResult = data.found
        ? { isConfigured: true, jellyfinUrl: data.jellyfin_url, isInLibrary: true }
        : { isConfigured: true, jellyfinUrl: null, isInLibrary: false };
      // Only cache configured outcomes (found / not-found), like the original.
      resultCache.set(key, result);
      return result;
    } catch {
      return notConfigured;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}

/**
 * Hook to resolve Jellyfin details page URLs for a given media item. Backed by a
 * shared module cache + in-flight dedupe (see above).
 */
export function useJellyfinPlayback(
  mediaType?: string,
  mediaId?: number,
  seasonNumber?: number,
  episodeNumber?: number
): JellyfinPlaybackState {
  const [state, setState] = useState<JellyfinPlaybackState>({
    isConfigured: false,
    isLoading: true,
    jellyfinUrl: null,
    isInLibrary: false,
  });

  useEffect(() => {
    if (!mediaType || !mediaId) {
      setState({ isConfigured: false, isLoading: false, jellyfinUrl: null, isInLibrary: false });
      return;
    }

    let cancelled = false;
    setState((prev) => ({ ...prev, isLoading: true }));
    resolveJellyfin(mediaType, mediaId, seasonNumber, episodeNumber).then((result) => {
      if (cancelled) return;
      setState({ ...result, isLoading: false });
    });

    return () => {
      cancelled = true;
    };
  }, [mediaType, mediaId, seasonNumber, episodeNumber]);

  return state;
}
