'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface JellyfinPlaybackState {
  isConfigured: boolean;
  isLoading: boolean;
  jellyfinUrl: string | null;
  isInLibrary: boolean;
}

/**
 * Hook to resolve Jellyfin details page URLs for a given media item.
 *
 * 1. Checks if the user has a Jellyfin config (lightweight client query).
 * 2. If configured, calls /api/jellyfin/resolve to get the URL.
 * 3. Caches results in a ref to avoid redundant API calls.
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

  // Cache resolved URLs: "movie-123" or "tv-456-1-2" → url | null
  const cacheRef = useRef<Map<string, string | null>>(new Map());

  useEffect(() => {
    if (!mediaType || !mediaId) {
      setState({ isConfigured: false, isLoading: false, jellyfinUrl: null, isInLibrary: false });
      return;
    }

    let cancelled = false;

    async function resolve() {
      setState((prev) => ({ ...prev, isLoading: true }));

      // Step 1: Check if user has Jellyfin configured
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (!user) {
        setState({ isConfigured: false, isLoading: false, jellyfinUrl: null, isInLibrary: false });
        return;
      }

      const { data: config } = await supabase
        .from('user_jellyfin_config')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (cancelled) return;

      if (!config) {
        setState({ isConfigured: false, isLoading: false, jellyfinUrl: null, isInLibrary: false });
        return;
      }

      // User has Jellyfin configured
      const cacheKey = `${mediaType}-${mediaId}${seasonNumber ? `-${seasonNumber}` : ''}${episodeNumber ? `-${episodeNumber}` : ''}`;

      // Check cache
      if (cacheRef.current.has(cacheKey)) {
        const cached = cacheRef.current.get(cacheKey)!;
        setState({
          isConfigured: true,
          isLoading: false,
          jellyfinUrl: cached,
          isInLibrary: cached !== null,
        });
        return;
      }

      // Step 2: Resolve via API
      try {
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

        if (cancelled) return;

        const data = await res.json();

        if (data.found) {
          cacheRef.current.set(cacheKey, data.jellyfin_url);
          setState({
            isConfigured: true,
            isLoading: false,
            jellyfinUrl: data.jellyfin_url,
            isInLibrary: true,
          });
        } else {
          cacheRef.current.set(cacheKey, null);
          setState({
            isConfigured: true,
            isLoading: false,
            jellyfinUrl: null,
            isInLibrary: false,
          });
        }
      } catch {
        if (cancelled) return;
        setState({
          isConfigured: true,
          isLoading: false,
          jellyfinUrl: null,
          isInLibrary: false,
        });
      }
    }

    resolve();

    return () => {
      cancelled = true;
    };
  }, [mediaType, mediaId, seasonNumber, episodeNumber]);

  return state;
}
