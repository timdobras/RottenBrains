'use client';

import Link from 'next/link';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';

import CustomPlayer, { type CustomPlayerSubtitle } from '@/components/features/watch/CustomPlayer';
import useIsMobile from '@/hooks/useIsMobile';
import { getHrefFromMedia } from '@/lib/utils';

import { useMiniplayerState } from './useMiniplayerState';
import { useShellStream } from './useShellStream';
import type { ResolveInput } from './useStreamResolver';
import { useUser } from './UserContext';
import { useVideo } from './VideoProvider';
import { useWatchProgressTracker } from './useWatchProgressTracker';

/**
 * Persistent player shell. A single CustomPlayer (<video>/hls.js) lives in the
 * `#player-root` portal and survives navigation: it's repositioned between the
 * inline placeholder (full mode) and a floating draggable window (mini mode),
 * NEVER remounted on a mode/provider change — so playback is continuous. The
 * stream is resolved via the new pipeline (Auto-first + cached switcher) and
 * progress is tracked precisely in both modes.
 */
export default function VideoShell() {
  const { state, setState } = useVideo();
  const { media_type, media_id, season_number, episode_number, mode, resumePosition } = state;

  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);
  const { user } = useUser();
  const premium = !!user?.premium;

  // Tracked placeholder rect for full-mode positioning (kept aligned via
  // ResizeObserver + scroll listener).
  const [placeholderRect, setPlaceholderRect] = useState<DOMRect | null>(null);
  const rafRef = useRef<number>(0);

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

  const dragStartRef = useRef<{ mouseX: number; mouseY: number; posX: number; posY: number } | null>(
    null,
  );
  const resizeStartRef = useRef<{ mouseX: number; startWidth: number } | null>(null);

  // ── stream + tracking (the new pipeline) ──
  const input: ResolveInput | null =
    media_id && (media_type === 'movie' || media_type === 'tv')
      ? { mediaType: media_type, id: media_id, season: season_number, episode: episode_number }
      : null;
  const stream = useShellStream(input, { enabled: premium && !!input });
  const onProgress = useWatchProgressTracker(
    { media_type: media_type ?? '', media_id: media_id ?? 0, season_number, episode_number },
    { enabled: premium && !!input },
  );

  // Hold the last successfully-resolved stream so a re-resolve (provider switch
  // or transient error, where useStreamResolver briefly sets stream=null) does
  // NOT blank the player or churn its engine effect — the old stream keeps
  // playing under the "switching…" overlay until the new src is ready.
  const lastStreamRef = useRef<{ src: string; type: 'hls' | 'mp4'; subtitles: CustomPlayerSubtitle[] }>(
    { src: '', type: 'hls', subtitles: [] },
  );
  if (stream.src) {
    lastStreamRef.current = { src: stream.src, type: stream.type, subtitles: stream.subtitles };
  }
  const display = lastStreamRef.current;

  // Mount check for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Continuously track the placeholder position so the portal stays aligned.
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

    measure();
    // Delayed re-measure to catch multi-frame layout shifts (e.g. theater toggle).
    const settleTimer = setTimeout(measure, 100);

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(placeholder);
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure, { passive: true });

    return () => {
      clearTimeout(settleTimer);
      cancelAnimationFrame(rafRef.current);
      resizeObserver.disconnect();
      window.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [mounted, mode, state.theaterMode, media_id, season_number, episode_number]);

  // ── drag/resize handlers (mini mode) ──
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('button, a')) return;
      e.preventDefault();
      dragStartRef.current = { mouseX: e.clientX, mouseY: e.clientY, posX: position.x, posY: position.y };
      setIsDragging(true);
    },
    [position, setIsDragging],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if ((e.target as HTMLElement).closest('button, a')) return;
      const touch = e.touches[0];
      dragStartRef.current = { mouseX: touch.clientX, mouseY: touch.clientY, posX: position.x, posY: position.y };
      setIsDragging(true);
    },
    [position, setIsDragging],
  );

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      resizeStartRef.current = { mouseX: e.clientX, startWidth: size.width };
    },
    [size.width, setIsResizing],
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (resizeStartRef.current) {
        const dx = e.clientX - resizeStartRef.current.mouseX;
        handleResize(resizeStartRef.current.startWidth - dx); // drag left = bigger
        return;
      }
      if (!dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;
      setTempPosition({ x: dragStartRef.current.posX + dx, y: dragStartRef.current.posY + dy });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!dragStartRef.current) return;
      e.preventDefault();
      const touch = e.touches[0];
      const dx = touch.clientX - dragStartRef.current.mouseX;
      const dy = touch.clientY - dragStartRef.current.mouseY;
      setTempPosition({ x: dragStartRef.current.posX + dx, y: dragStartRef.current.posY + dy });
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (resizeStartRef.current) {
        resizeStartRef.current = null;
        setIsResizing(false);
        return;
      }
      if (!dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;
      handleDragEnd(dragStartRef.current.posX + dx, dragStartRef.current.posY + dy);
      setIsDragging(false);
      dragStartRef.current = null;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!dragStartRef.current) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - dragStartRef.current.mouseX;
      const dy = touch.clientY - dragStartRef.current.mouseY;
      handleDragEnd(dragStartRef.current.posX + dx, dragStartRef.current.posY + dy);
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

  // ── bail conditions ──
  if (!mounted) return null;
  if (!media_id || !media_type) return null;
  const container = document.getElementById('player-root');
  if (!container) return null;

  // Same instance for both modes — only the wrapper style changes.
  const isFullMode = mode === 'full' && !!placeholderRect;

  const style: React.CSSProperties = isFullMode
    ? {
        position: 'fixed',
        top: placeholderRect!.top,
        left: placeholderRect!.left,
        width: placeholderRect!.width,
        height: placeholderRect!.height,
        zIndex: 1,
        borderRadius: 0,
      }
    : {
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

  return ReactDOM.createPortal(
    <div className="relative overflow-hidden bg-black" style={style}>
      {/* Player layer */}
      <div className="absolute inset-0 overflow-hidden">
        {!premium ? (
          <div className="flex h-full w-full items-center justify-center bg-black px-4 text-center text-white">
            {isFullMode ? 'You need to be a premium user to watch videos.' : 'Premium required'}
          </div>
        ) : (
          <>
            <CustomPlayer
              // key excludes mode + provider → no remount on toggle/switch
              key={`${media_type}-${media_id}-${season_number ?? ''}-${episode_number ?? ''}`}
              src={display.src}
              type={display.type}
              subtitles={display.subtitles}
              startTime={resumePosition ?? 0}
              autoPlay
              mini={!isFullMode}
              providers={stream.providers}
              currentProvider={stream.currentProvider}
              onSelectProvider={stream.onSelectProvider}
              resolving={stream.resolving}
              probing={stream.probing}
              onProgress={onProgress}
            />
            {stream.status === 'error' && !display.src && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black px-4 text-center text-sm text-white">
                No playable source found.
              </div>
            )}
          </>
        )}
      </div>

      {/* Mini-mode chrome: drag zones, resize handle, expand + close */}
      {!isFullMode && (
        <div className="pointer-events-none absolute inset-0">
          {isDragging && <div className="pointer-events-auto absolute inset-0 cursor-grabbing bg-black/20" />}

          {/* Edge grab zones */}
          <div
            className="pointer-events-auto absolute left-0 right-0 top-0 h-5 cursor-grab touch-none"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          />
          <div
            className="pointer-events-auto absolute bottom-0 left-0 right-0 h-5 cursor-grab touch-none"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          />
          <div
            className="pointer-events-auto absolute bottom-5 left-0 top-5 w-5 cursor-grab touch-none"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          />
          <div
            className="pointer-events-auto absolute bottom-5 right-0 top-5 w-5 cursor-grab touch-none"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          />

          {/* Resize handle (desktop) */}
          {!isMobile && (
            <div
              className="pointer-events-auto flex h-7 w-7 cursor-nwse-resize items-center justify-center rounded-md border border-white/20 bg-black/80 text-white shadow-md backdrop-blur-sm transition-colors hover:bg-neutral-700"
              style={{ position: 'absolute', top: 6, left: 6 }}
              onMouseDown={handleResizeStart}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M21 21l-6-6m6 6v-6m0 6h-6M3 3l6 6M3 3v6m0-6h6" />
              </svg>
            </div>
          )}

          {/* Expand + close */}
          <div className="pointer-events-auto flex gap-1" style={{ position: 'absolute', top: 6, right: 6 }}>
            <Link
              href={getHrefFromMedia(media_type, media_id, season_number, episode_number)}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-white/20 bg-black/80 text-white shadow-md backdrop-blur-sm transition-colors hover:bg-neutral-700"
              onClick={(e) => e.stopPropagation()}
              aria-label="expand"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M15 3h6v6M14 10l7-7M9 21H3v-6M10 14l-7 7" />
              </svg>
            </Link>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setState((s) => ({ ...s, media_id: undefined }));
              }}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-white/20 bg-black/80 text-white shadow-md backdrop-blur-sm transition-colors hover:bg-red-600"
              aria-label="close"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>,
    container,
  );
}
