'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useVideo } from './VideoProvider';
import { useMiniplayerState } from './useMiniplayerState';
import { iframeLinks } from '@/lib/constants/links';
import { videasyPlayback } from '@/lib/videasyTracker';
import useIsMobile from '@/hooks/useIsMobile';
import { getHrefFromMedia } from '@/lib/utils';
import Link from 'next/link';
import { useUser } from './UserContext';

// Loading skeleton component
const MiniplayerSkeleton = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-black">
    <div className="flex flex-col items-center gap-2">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground/20 border-t-primary" />
      <span className="text-xs text-foreground/50">Loading player...</span>
    </div>
  </div>
);

export default function VideoShell() {
  const { state, setState } = useVideo();
  const {
    media_type,
    media_id,
    season_number,
    episode_number,
    mode,
    provider: ctxProvider,
    resumePosition,
  } = state;

  const isMobile = useIsMobile();
  const [provider, setProvider] = useState(ctxProvider);
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Tracked placeholder rect for full mode positioning.
  // Updated continuously via ResizeObserver + scroll listener so the portal
  // iframe stays aligned with the placeholder even on resize/orientation change.
  const [placeholderRect, setPlaceholderRect] = useState<DOMRect | null>(null);
  const rafRef = useRef<number>(0);

  // Videasy playback position tracking via postMessage uses the shared
  // videasyPlayback store (lib/videasyTracker.ts) so WatchDuration can read it.

  const { user } = useUser();
  const {
    position,
    size,
    isDragging,
    setIsDragging,
    setIsResizing,
    setTempPosition,
    handleDragEnd,
    handleResize,
  } = useMiniplayerState();

  // Drag state refs
  const dragStartRef = useRef<{
    mouseX: number;
    mouseY: number;
    posX: number;
    posY: number;
  } | null>(null);
  const resizeStartRef = useRef<{ mouseX: number; startWidth: number } | null>(null);

  // Mount check for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Continuously track the placeholder position so the portal stays aligned.
  // Uses ResizeObserver for size changes and a scroll listener for position shifts.
  // Re-runs when theaterMode changes since that alters the placeholder's layout.
  useEffect(() => {
    if (!mounted || mode !== 'full') {
      setPlaceholderRect(null);
      return;
    }

    const placeholder = document.getElementById('video-inline-placeholder');
    if (!placeholder) return;

    const measure = () => {
      rafRef.current = requestAnimationFrame(() => {
        const rect = placeholder.getBoundingClientRect();
        setPlaceholderRect((prev) => {
          // Only update state when values actually change to avoid unnecessary re-renders
          if (
            prev &&
            prev.top === rect.top &&
            prev.left === rect.left &&
            prev.width === rect.width &&
            prev.height === rect.height
          ) {
            return prev;
          }
          return rect;
        });
      });
    };

    // Initial measurement
    measure();

    // Delayed re-measure to catch multi-frame layout shifts (e.g. theater mode toggle
    // changes CSS classes + inline styles which may settle over several frames)
    const settleTimer = setTimeout(measure, 100);

    // Re-measure on resize (handles window resize, orientation change, zoom)
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(placeholder);

    // Re-measure on scroll (handles sticky/relative position shifts)
    window.addEventListener('scroll', measure, { passive: true });

    // Re-measure on window resize (catches edge cases ResizeObserver misses)
    window.addEventListener('resize', measure, { passive: true });

    return () => {
      clearTimeout(settleTimer);
      cancelAnimationFrame(rafRef.current);
      resizeObserver.disconnect();
      window.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [mounted, mode, state.theaterMode]);

  // Reset iframe loaded state when media changes
  useEffect(() => {
    setIsIframeLoaded(false);
  }, [media_id, media_type, season_number, episode_number, provider]);

  // Sync local provider state when VideoContext provider changes
  // (e.g. from ProviderDropdown updating context)
  useEffect(() => {
    if (ctxProvider && ctxProvider !== provider) {
      setProvider(ctxProvider);
    }
  }, [ctxProvider]);

  // Watch localStorage for provider changes (fires from other tabs)
  useEffect(() => {
    const valid = (n: string | null) => n !== null && iframeLinks.some((l) => l.name === n);

    const stored = localStorage.getItem('video_provider');
    if (valid(stored)) setProvider(stored!);

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'video_provider') {
        if (valid(e.newValue)) setProvider(e.newValue!);
        else setProvider(iframeLinks[0].name);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Listen for Videasy postMessage events to track real playback position.
  // The Videasy player sends JSON messages with playback progress data.
  // We store the position in the shared videasyPlayback store so WatchDuration can read it.
  useEffect(() => {
    if (provider !== 'Videasy') {
      videasyPlayback.reset();
      return;
    }

    // Reset position when media or provider changes
    videasyPlayback.reset();

    const handleMessage = (event: MessageEvent) => {
      // Accept messages from Videasy origins
      if (!event.origin.includes('videasy')) return;

      try {
        const message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

        // Videasy sends { type: "MEDIA_DATA", data: "<JSON string>" }
        // Inside data, each media is keyed like "movie-123" or "tv-456" with:
        //   { progress: { duration: number, watched: number } }
        // For TV: also has show_progress with per-episode data
        if (message.type !== 'MEDIA_DATA' || !message.data) return;

        const mediaData =
          typeof message.data === 'string' ? JSON.parse(message.data) : message.data;

        // Build the key for the current media
        const currentKey = `${media_type}-${media_id}`;
        const entry = mediaData[currentKey];

        if (!entry?.progress) return;

        const { watched, duration } = entry.progress;

        // For TV shows, try to get episode-specific progress
        let episodeWatched = watched;
        let episodeDuration = duration;

        if (media_type === 'tv' && season_number && episode_number && entry.show_progress) {
          const epKey = `s${season_number}e${episode_number}`;
          const epProgress = entry.show_progress[epKey]?.progress;
          if (epProgress) {
            episodeWatched = epProgress.watched;
            episodeDuration = epProgress.duration;
          }
        }

        if (typeof episodeWatched === 'number' && episodeWatched >= 0) {
          videasyPlayback.update(
            Math.floor(episodeWatched),
            typeof episodeDuration === 'number' && episodeDuration > 0
              ? Math.floor(episodeDuration)
              : undefined
          );
        }

        if (process.env.NODE_ENV === 'development') {
          console.log(
            '[Videasy] position:',
            videasyPlayback.currentTime,
            '/',
            videasyPlayback.duration,
            's'
          );
        }
      } catch {
        // Non-JSON or unexpected messages are ignored
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [provider, media_id, media_type, season_number, episode_number]);

  // Drag handlers - start drag immediately from edge zones
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('button, a')) return;
      e.preventDefault();

      dragStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        posX: position.x,
        posY: position.y,
      };
      setIsDragging(true);
    },
    [position, setIsDragging]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if ((e.target as HTMLElement).closest('button, a')) return;

      const touch = e.touches[0];
      dragStartRef.current = {
        mouseX: touch.clientX,
        mouseY: touch.clientY,
        posX: position.x,
        posY: position.y,
      };
      setIsDragging(true);
    },
    [position, setIsDragging]
  );

  // Resize handler for desktop
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      resizeStartRef.current = {
        mouseX: e.clientX,
        startWidth: size.width,
      };
    },
    [size.width, setIsResizing]
  );

  // Global mouse/touch move and up handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Handle resize
      if (resizeStartRef.current) {
        const dx = e.clientX - resizeStartRef.current.mouseX;
        const newWidth = resizeStartRef.current.startWidth - dx; // Inverted: drag left = bigger
        handleResize(newWidth);
        return;
      }

      // Handle drag
      if (!dragStartRef.current) return;

      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;
      setTempPosition({
        x: dragStartRef.current.posX + dx,
        y: dragStartRef.current.posY + dy,
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!dragStartRef.current) return;

      // Prevent page scrolling while dragging the miniplayer
      e.preventDefault();

      const touch = e.touches[0];
      const dx = touch.clientX - dragStartRef.current.mouseX;
      const dy = touch.clientY - dragStartRef.current.mouseY;
      setTempPosition({
        x: dragStartRef.current.posX + dx,
        y: dragStartRef.current.posY + dy,
      });
    };

    const handleMouseUp = (e: MouseEvent) => {
      // Handle resize end
      if (resizeStartRef.current) {
        resizeStartRef.current = null;
        setIsResizing(false);
        return;
      }

      // Handle drag end
      if (!dragStartRef.current) return;

      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;
      const finalX = dragStartRef.current.posX + dx;
      const finalY = dragStartRef.current.posY + dy;
      handleDragEnd(finalX, finalY);

      setIsDragging(false);
      dragStartRef.current = null;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!dragStartRef.current) return;

      const touch = e.changedTouches[0];
      const dx = touch.clientX - dragStartRef.current.mouseX;
      const dy = touch.clientY - dragStartRef.current.mouseY;
      const finalX = dragStartRef.current.posX + dx;
      const finalY = dragStartRef.current.posY + dy;
      handleDragEnd(finalX, finalY);

      setIsDragging(false);
      dragStartRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [setIsDragging, setIsResizing, setTempPosition, handleDragEnd, handleResize]);

  // Bail early conditions
  if (!mounted) return null;
  if (!media_id || !media_type) return null;

  // Compute iframe src (pass resume position for providers that support it)
  const sel = iframeLinks.find((l) => l.name === provider) || iframeLinks[0];
  const src = sel.template({
    media_type,
    media_id,
    season_number: season_number?.toString(),
    episode_number: episode_number?.toString(),
    progress: resumePosition,
  });

  const container = document.getElementById('player-root');
  if (!container) return null;

  // Calculate position based on mode
  // IMPORTANT: Always render the SAME iframe to keep video playing
  const isFullMode = mode === 'full' && placeholderRect;

  let style: React.CSSProperties;

  if (isFullMode) {
    // Use fixed positioning on all devices — getBoundingClientRect() returns
    // viewport-relative coords which pair correctly with position: fixed.
    // The previous absolute positioning on desktop was wrong on scroll because
    // absolute is relative to the nearest positioned ancestor, not the viewport.
    style = {
      position: 'fixed',
      top: placeholderRect.top,
      left: placeholderRect.left,
      width: placeholderRect.width,
      height: placeholderRect.height,
      zIndex: 1,
      borderRadius: 0,
    };
  } else {
    // Mini mode - draggable position
    style = {
      position: 'fixed',
      left: position.x,
      top: position.y,
      width: size.width,
      height: size.height,
      zIndex: 99999,
      borderRadius: 8,
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      cursor: isDragging ? 'grabbing' : 'default',
      transition: isDragging ? 'none' : 'left 0.2s ease-out, top 0.2s ease-out',
    };
  }

  return ReactDOM.createPortal(
    <div className="relative bg-black" style={style}>
      {/* Video content layer */}
      <div className="absolute inset-0 overflow-hidden">
        {!user?.premium ? (
          <div className="flex h-full w-full items-center justify-center bg-black text-white">
            {isFullMode ? 'You need to be a premium user to watch videos.' : 'Premium required'}
          </div>
        ) : (
          <>
            {!isIframeLoaded && <MiniplayerSkeleton />}
            <iframe
              src={src}
              allowFullScreen
              loading="eager"
              style={{ width: '100%', height: '100%', border: 'none' }}
              onLoad={() => setIsIframeLoaded(true)}
            />
          </>
        )}
      </div>

      {/* Mini mode: edge grab zones for dragging + controls - separate layer above iframe */}
      {!isFullMode && (
        <div className="pointer-events-none absolute inset-0">
          {/* Drag overlay - only visible when actively dragging */}
          {isDragging && (
            <div className="pointer-events-auto absolute inset-0 cursor-grabbing bg-black/20" />
          )}

          {/* Edge grab zones - strips around the edges for dragging (20px on touch) */}
          {/* Top edge */}
          <div
            className="pointer-events-auto absolute left-0 right-0 top-0 h-5 cursor-grab touch-none"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          />
          {/* Bottom edge */}
          <div
            className="pointer-events-auto absolute bottom-0 left-0 right-0 h-5 cursor-grab touch-none"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          />
          {/* Left edge */}
          <div
            className="pointer-events-auto absolute bottom-5 left-0 top-5 w-5 cursor-grab touch-none"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          />
          {/* Right edge */}
          <div
            className="pointer-events-auto absolute bottom-5 right-0 top-5 w-5 cursor-grab touch-none"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          />

          {/* Resize handle - top left, desktop only */}
          {!isMobile && (
            <div
              className="pointer-events-auto flex h-7 w-7 cursor-nwse-resize items-center justify-center rounded-md border border-white/20 bg-black/80 text-white shadow-md backdrop-blur-sm transition-colors hover:bg-neutral-700"
              style={{ position: 'absolute', top: 6, left: 6 }}
              onMouseDown={handleResizeStart}
            >
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M21 21l-6-6m6 6v-6m0 6h-6M3 3l6 6M3 3v6m0-6h6" />
              </svg>
            </div>
          )}

          {/* Control buttons - top right */}
          <div
            className="pointer-events-auto flex gap-1"
            style={{ position: 'absolute', top: 6, right: 6 }}
          >
            {/* Expand to watch page */}
            <Link
              href={getHrefFromMedia(media_type, media_id, season_number, episode_number)}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-white/20 bg-black/80 text-white shadow-md backdrop-blur-sm transition-colors hover:bg-neutral-700"
              onClick={(e) => e.stopPropagation()}
            >
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M15 3h6v6M14 10l7-7M9 21H3v-6M10 14l-7 7" />
              </svg>
            </Link>
            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setState((s) => ({ ...s, media_id: undefined }));
              }}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-white/20 bg-black/80 text-white shadow-md backdrop-blur-sm transition-colors hover:bg-red-600"
            >
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>,
    container
  );
}
