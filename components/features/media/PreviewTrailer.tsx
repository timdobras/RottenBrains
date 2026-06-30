'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import ImageWithFallback from './ImageWithFallback';
import { getVideos } from '@/lib/tmdb';
import { queryKeys } from '@/lib/queryKeys';
import { extractTrailerInfo } from './TrailerDisplayOnHover';

interface PreviewTrailerProps {
  media_type: string;
  media_id: number;
  imageUrl?: string | null;
  altText: string;
}

// How long to keep the poster covering the (already-playing) trailer.
const REVEAL_DELAY_MS = 300;

// Persist the user's mute choice across cards and sessions.
const MUTE_PREF_KEY = 'rb:trailer-muted';
function getSavedMuted(): boolean {
  if (typeof window === 'undefined') return true; // default muted
  try {
    return window.localStorage.getItem(MUTE_PREF_KEY) !== 'false';
  } catch {
    return true;
  }
}
function saveMuted(muted: boolean): void {
  try {
    window.localStorage.setItem(MUTE_PREF_KEY, muted ? 'true' : 'false');
  } catch {
    /* ignore (private mode, etc.) */
  }
}

/**
 * Full media surface for the hover pop-out. The trailer iframe sits underneath
 * and autoplays immediately; the poster image covers it on top and fades away
 * after REVEAL_DELAY_MS, so the video is already running by the time it's shown.
 * Includes a mute/unmute toggle driven by the YouTube IFrame API (postMessage).
 */
const PreviewTrailer: React.FC<PreviewTrailerProps> = ({
  media_type,
  media_id,
  imageUrl,
  altText,
}) => {
  const [revealed, setRevealed] = useState(false); // poster has faded away
  const [loaded, setLoaded] = useState(false); // iframe finished loading (player ready)
  const [muted, setMuted] = useState(getSavedMuted); // remembered preference
  const [paused, setPaused] = useState(false); // optimistic local play state (autoplays on mount)
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { data } = useQuery({
    queryKey: queryKeys.media.videos(media_type, media_id),
    queryFn: () => getVideos(media_type, media_id),
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });

  const trailerInfo = useMemo(() => extractTrailerInfo(data), [data]);

  // Build a preview-specific embed URL with the JS API enabled so we can
  // toggle mute at runtime via postMessage (no reload needed).
  const src = useMemo(() => {
    if (!trailerInfo?.key) return null;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const params = new URLSearchParams({
      autoplay: '1',
      mute: '1', // must start muted for autoplay to be allowed
      controls: '0', // hides the whole control bar (still works)
      rel: '0',
      cc_load_policy: '1',
      cc_lang_pref: 'en',
      enablejsapi: '1',
      playsinline: '1',
      iv_load_policy: '3', // hide annotations
      disablekb: '1', // no keyboard control
      fs: '0', // no fullscreen button
      // NOTE: modestbranding / showinfo are deprecated no-ops — the title bar
      // can't be hidden via params, so we crop it off with CSS below instead.
    });
    if (origin) params.set('origin', origin);
    return `https://www.youtube.com/embed/${trailerInfo.key}?${params.toString()}`;
  }, [trailerInfo]);

  // Send a command to the YouTube player via the IFrame API.
  const command = useCallback((func: string, args: unknown[] = []) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args }),
      'https://www.youtube.com'
    );
  }, []);

  // Once the player has loaded: honor a remembered "unmuted" preference (the
  // iframe always loads muted so autoplay is allowed), then drop the poster.
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleLoad = useCallback(() => {
    setLoaded(true);
    if (!muted) {
      command('unMute');
      command('setVolume', [100]);
    }
    revealTimer.current = setTimeout(() => setRevealed(true), REVEAL_DELAY_MS);
  }, [muted, command]);
  useEffect(
    () => () => {
      if (revealTimer.current) clearTimeout(revealTimer.current);
    },
    []
  );

  // Play / pause the trailer via the IFrame API. Local optimistic state — the
  // player starts playing (autoplay) so the first tap pauses.
  const togglePlay = useCallback(
    (e: React.MouseEvent) => {
      // We're inside the card's <Link>; don't navigate when toggling playback.
      e.preventDefault();
      e.stopPropagation();
      setPaused((p) => {
        const next = !p;
        command(next ? 'pauseVideo' : 'playVideo');
        return next;
      });
    },
    [command]
  );

  const toggleMute = useCallback(
    (e: React.MouseEvent) => {
      // We're inside the card's <Link>; don't navigate when toggling sound.
      e.preventDefault();
      e.stopPropagation();
      setMuted((m) => {
        const next = !m;
        if (next) {
          command('mute');
        } else {
          command('unMute');
          command('setVolume', [100]);
        }
        saveMuted(next);
        return next;
      });
    },
    [command]
  );

  return (
    <>
      {/* Trailer underneath — autoplays as soon as it mounts. */}
      {src && (
        <iframe
          ref={iframeRef}
          width="100%"
          height="100%"
          src={src}
          title="Media Trailer"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          onLoad={handleLoad}
          className="pointer-events-none absolute inset-0 z-0 h-full w-full"
        ></iframe>
      )}

      {/* Poster cover on top — fades away once the trailer is ready. */}
      <div
        className={`pointer-events-none absolute inset-0 z-10 transition-opacity duration-700 ease-out ${
          revealed ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <ImageWithFallback imageUrl={imageUrl} altText={altText} quality="w780" progressive={false} />
      </div>

      {/* Loading bar while the trailer is still hidden behind the poster. Its
          sweep is tied to the reveal delay so it fills up just as the poster
          lifts, instead of the default 2s sweep barely starting. */}
      {src && !revealed && (
        <div
          className="animate-loading absolute left-0 top-0 z-20 h-[3px] w-full bg-white/70"
          style={{ animationDuration: `${REVEAL_DELAY_MS}ms` }}
        />
      )}

      {/* Play / pause toggle (bottom-left). */}
      {src && loaded && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label={paused ? 'Play trailer' : 'Pause trailer'}
          className="absolute bottom-2 left-2 z-30 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:bg-black/80"
        >
          {paused ? (
            <svg viewBox="0 0 24 24" fill="currentColor" className="ml-0.5 h-4 w-4" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          )}
        </button>
      )}

      {/* Mute / unmute toggle (bottom-right, clear of YouTube's own UI and of
          the mobile close button which sits top-right). */}
      {src && loaded && (
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? 'Unmute trailer' : 'Mute trailer'}
          className="absolute bottom-2 right-2 z-30 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:bg-black/80"
        >
          {muted ? (
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.8 8.8 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
            </svg>
          )}
        </button>
      )}
    </>
  );
};

export default PreviewTrailer;
