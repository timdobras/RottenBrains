'use client';

import { useRouter } from 'next/navigation';
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

  // Intrinsic video aspect ratio (width/height); defaults to 16/9 until the
  // metadata loads. Full mode keeps a 16/9 box (video letterboxed via
  // object-contain); mini mode sizes its window to this ratio.
  const [aspectRatio, setAspectRatio] = useState(16 / 9);
  useEffect(() => {
    // new title → back to the 16/9 default until its metadata arrives
    setAspectRatio(16 / 9);
  }, [media_id, media_type, season_number, episode_number]);

  const { position, size, isDragging, setIsDragging, setTempPosition, handleDragEnd } =
    useMiniplayerState();

  const dragStartRef = useRef<{ mouseX: number; mouseY: number; posX: number; posY: number } | null>(
    null,
  );
  const movedRef = useRef(false); // did the pointer move past the drag threshold
  const shellElRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  // watch-page href for this title (mini tap on mobile → expand here)
  const href =
    media_id && media_type ? getHrefFromMedia(media_type, media_id, season_number, episode_number) : '/';
  const hrefRef = useRef(href);
  hrefRef.current = href;
  const isMobileRef = useRef(isMobile);
  isMobileRef.current = isMobile;

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

  // Hold the last successfully-resolved stream so a PROVIDER switch (where
  // useStreamResolver briefly sets stream=null) doesn't blank the player —
  // the old stream keeps playing until the new src is ready.
  const lastStreamRef = useRef<{ src: string; type: 'hls' | 'mp4'; subtitles: CustomPlayerSubtitle[] }>(
    { src: '', type: 'hls', subtitles: [] },
  );
  // BUT a TITLE change must NOT keep the old stream — otherwise switching to a
  // title no provider has would replay the previous media (and never show the
  // no-source state). Drop the held stream whenever the title changes.
  const titleKey = `${media_type}-${media_id}-${season_number ?? ''}-${episode_number ?? ''}`;
  const lastTitleRef = useRef(titleKey);
  if (lastTitleRef.current !== titleKey) {
    lastTitleRef.current = titleKey;
    lastStreamRef.current = { src: '', type: 'hls', subtitles: [] };
  }
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

  // ── miniplayer drag-or-tap ──
  // The whole surface is grabbable; CustomPlayer's buttons + scrubber
  // stopPropagation so they never start a drag. Moving past a small threshold =
  // drag the window; a press without moving = a tap → play/pause (desktop) or
  // expand to the watch page (mobile).
  const onShellPointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragStartRef.current = { mouseX: e.clientX, mouseY: e.clientY, posX: position.x, posY: position.y };
      movedRef.current = false;
    },
    [position],
  );

  useEffect(() => {
    const THRESHOLD = 5;
    const onMove = (e: PointerEvent) => {
      const s = dragStartRef.current;
      if (!s) return;
      const dx = e.clientX - s.mouseX;
      const dy = e.clientY - s.mouseY;
      if (!movedRef.current && Math.hypot(dx, dy) < THRESHOLD) return;
      if (!movedRef.current) {
        movedRef.current = true;
        setIsDragging(true);
      }
      e.preventDefault();
      setTempPosition({ x: s.posX + dx, y: s.posY + dy });
    };
    const onUp = (e: PointerEvent) => {
      const s = dragStartRef.current;
      if (!s) return;
      dragStartRef.current = null;
      if (movedRef.current) {
        handleDragEnd(s.posX + (e.clientX - s.mouseX), s.posY + (e.clientY - s.mouseY));
        setIsDragging(false);
      } else {
        // tap (no drag): mobile → expand to watch page; desktop → play/pause
        if (isMobileRef.current) {
          router.push(hrefRef.current);
        } else {
          const v = shellElRef.current?.querySelector('video');
          if (v) v.paused ? v.play().catch(() => {}) : v.pause();
        }
      }
      movedRef.current = false;
    };
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [setIsDragging, setTempPosition, handleDragEnd, router]);

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
        // mini window adopts the content's aspect ratio (4/3 content → 4/3 box)
        height: Math.round(size.width / aspectRatio),
        zIndex: 99999,
        borderRadius: 14,
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        cursor: isDragging ? 'grabbing' : 'grab',
        // animate position + the aspect-ratio size change; instant while the
        // user is actively dragging so it stays responsive.
        transition: isDragging
          ? 'none'
          : 'left 0.2s ease-out, top 0.2s ease-out, width 0.2s ease-out, height 0.2s ease-out',
      };

  return ReactDOM.createPortal(
    <div
      ref={shellElRef}
      className="relative overflow-hidden bg-black"
      style={{ ...style, touchAction: isFullMode ? undefined : 'none' }}
      onPointerDown={isFullMode ? undefined : onShellPointerDown}
    >
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
              onAspectRatio={setAspectRatio}
              mobile={isMobile}
              // resolution finished and nothing has it → player shows a message
              noSource={stream.status === 'error' && !display.src}
              onExpand={() => router.push(href)}
              onClose={() => setState((s) => ({ ...s, media_id: undefined }))}
              onMinimize={() => router.push('/')}
            />
          </>
        )}
      </div>
    </div>,
    container,
  );
}
