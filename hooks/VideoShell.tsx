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

// Estimate the full-mode player rect from viewport geometry, mirroring the watch
// layout (overlay top padding + a max-w-7xl wrapper with md:px-8 / md:pt-6,
// non-theater). Used as the player's target while the real
// #video-inline-placeholder hasn't mounted yet, so an expand starts the player
// moving immediately instead of waiting for the overlay route to render.
function estimateFullRect(isMobile: boolean) {
  if (typeof window === 'undefined') return null;
  const vw = window.innerWidth;
  if (isMobile) {
    const width = vw;
    return { top: 48, left: 0, width, height: Math.round((width * 9) / 16) };
  }
  const wrapperW = Math.min(vw, 1280); // max-w-7xl
  const padX = 32; // md:px-8
  const width = wrapperW - padX * 2;
  const left = Math.round(Math.max(0, (vw - wrapperW) / 2) + padX);
  const top = 64 + 24; // navbar (md:h-16) + wrapper md:pt-6
  return { top, left, width, height: Math.round((width * 9) / 16) };
}

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

  // Animate the geometry ONLY during a mini⟷full mode switch. Full mode normally
  // runs with transition:none so it can track the placeholder on scroll without
  // lag — so we flip this flag on for ~320ms around a mode change to get the
  // slide+grow, then turn it back off for instant scroll tracking.
  const [animatingMode, setAnimatingMode] = useState(false);
  // Transient full-screen click-shield raised during EITHER mode switch
  // (mini→full and full→mini). While the player + watch overlay animate, the
  // content shifts under the pointer; without the shield a click — or, on
  // touch, the tap's delayed synthetic click fired after the overlay has opened
  // under the finger — lands on whatever element is now there and navigates to
  // it ("expanding/minimizing opens a random media card"). The shield absorbs
  // any click for the transition + a short buffer so nothing stray is hit.
  const [shieldActive, setShieldActive] = useState(false);
  const prevModeRef = useRef(mode);
  useEffect(() => {
    if (prevModeRef.current === mode) return;
    prevModeRef.current = mode;
    setAnimatingMode(true);
    setShieldActive(true);
    // animatingMode must outlast the 0.25s geometry transition so it isn't cut
    // to `transition: none` mid-glide.
    const t = setTimeout(() => setAnimatingMode(false), 320);
    // Shield outlasts the animation AND a touch's ~300ms synthetic-click delay.
    const t2 = setTimeout(() => setShieldActive(false), 450);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [mode]);

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
  // Whether the @watch overlay is currently populated. True once it has rendered
  // (kept alive after), false when the title came from a hard-loaded real /watch
  // page. Ref so the mobile pointer handler reads the live value, not a stale
  // closure. Drives whether maximize can just replaceState (instant) or must do
  // a real navigation to load the overlay's content first.
  const isOverlayRef = useRef(state.isOverlay);
  isOverlayRef.current = state.isOverlay;

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

  // Warm the watch route while the player sits in mini, so an expand navigates
  // against an already-prefetched route instead of starting cold — the content
  // renders as close to instant as the data allows.
  useEffect(() => {
    if (mode === 'mini' && href && href !== '/') router.prefetch(href);
  }, [mode, href, router]);

  // Track the placeholder position so the portal stays aligned in full mode.
  // A per-frame loop (rather than ResizeObserver-on-a-node) is deliberate: the
  // placeholder may not exist yet when `mode` flips to 'full' optimistically on
  // an expand click, and it gets REPLACED when the loading skeleton swaps to the
  // real page. Re-querying getElementById every frame locks onto whichever
  // placeholder is currently mounted the instant it appears, survives that swap,
  // and tracks scroll in both the full page and the self-scrolling overlay. The
  // setState equality check means React only re-renders when the rect changes.
  useEffect(() => {
    if (!mounted || mode !== 'full') {
      setPlaceholderRect(null);
      return;
    }
    let raf = 0;
    const tick = () => {
      const el = document.getElementById('video-inline-placeholder');
      if (el) {
        const rect = el.getBoundingClientRect();
        // Ignore zero-size rects: the placeholder lives inside the overlay, which
        // is display:none while minimized, so it measures as 0×0 — fall back to
        // the estimated rect instead of collapsing the player to nothing.
        if (rect.width > 0 && rect.height > 0) {
          setPlaceholderRect((prev) =>
            prev &&
            prev.top === rect.top &&
            prev.left === rect.left &&
            prev.width === rect.width &&
            prev.height === rect.height
              ? prev
              : rect,
          );
        }
      }
      // If the placeholder isn't in the DOM yet (or briefly vanishes during the
      // loading→page swap), KEEP the last measured rect rather than blanking it,
      // so the player holds its spot instead of jittering back to mini.
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mounted, mode]);

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
          // mobile tap = maximize: navigation-free if the overlay is populated,
          // else a real navigation to load it (see desktop onExpand for why).
          setState((s) => ({ ...s, mode: 'full', isOverlay: true }));
          if (isOverlayRef.current && typeof window !== 'undefined') {
            window.history.replaceState(window.history.state, '', hrefRef.current);
          } else {
            router.push(hrefRef.current, { scroll: false });
          }
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
  }, [setIsDragging, setTempPosition, handleDragEnd, router, setState]);

  // ── bail conditions ──
  if (!mounted) return null;
  if (!media_id || !media_type) return null;
  const container = document.getElementById('player-root');
  if (!container) return null;

  // The full-mode target: the measured placeholder rect when it exists, else a
  // geometry-computed estimate of where it WILL be. This lets the player start
  // moving to full the instant `mode` flips on an expand click — before the
  // overlay route renders its placeholder — so it leads the page instead of
  // catching up to it. The measured rect takes over (and the transition eases
  // out any small difference) the moment the real placeholder mounts.
  const fullRect = placeholderRect ?? (mode === 'full' ? estimateFullRect(isMobile) : null);

  // Same instance for both modes — only the wrapper style changes.
  const isFullMode = mode === 'full' && !!fullRect;

  const style: React.CSSProperties = isFullMode
    ? {
        position: 'fixed',
        top: fullRect!.top,
        left: fullRect!.left,
        width: fullRect!.width,
        height: fullRect!.height,
        // In overlay mode the watch surface sits at z-30, so the player must
        // ride above it (below the z-50 navbar). On the real full page there's
        // no overlay, so keep the original low z to stay under page chrome.
        zIndex: state.isOverlay ? 40 : 1,
        borderRadius: 0,
        boxShadow: 'none',
        // Animate the geometry only during a mini⟷full mode switch; otherwise
        // none, so full-mode scroll tracking stays pixel-locked to the placeholder.
        transition: animatingMode
          ? 'top 0.25s ease, left 0.25s ease, width 0.25s ease, height 0.25s ease, border-radius 0.25s ease'
          : 'none',
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
        // user is actively dragging so it stays responsive. Border-radius is
        // animated too so the full→mini corner-rounding eases in with the shrink.
        transition: isDragging
          ? 'none'
          : 'left 0.3s ease-out, top 0.3s ease-out, width 0.3s ease-out, height 0.3s ease-out, border-radius 0.3s ease-out',
      };

  return ReactDOM.createPortal(
    <>
      {shieldActive && (
        <div
          aria-hidden
          // Transient transition click-shield (see shieldActive above). A
          // transparent fixed layer above everything (incl. the mini player's
          // z-99999) that absorbs any click/tap while the player and overlay
          // animate, so content shifting under the pointer can't be activated.
          className="fixed inset-0"
          style={{ zIndex: 999999 }}
        />
      )}
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
              onExpand={() => {
                // Flip to full + overlay FIRST so the player starts growing AND
                // the store-driven backdrop fades in immediately (before the
                // overlay route renders), then navigate. The overlay's loading
                // skeleton renders the placeholder so the player has somewhere to
                // land before the real content finishes streaming in.
                // Maximize: if the overlay is already populated (kept alive),
                // it's navigation-free — just show it (mode → full) and rewrite
                // the URL via the History API, no refetch. If it ISN'T populated
                // (we started on a hard-loaded /watch page, so the content lived
                // in the real page and unmounted when we navigated away), do a
                // real navigation to load the overlay; cached fetchers keep it
                // quick, and it stays alive for instant maximizes after.
                setState((s) => ({ ...s, mode: 'full', isOverlay: true }));
                if (state.isOverlay && typeof window !== 'undefined') {
                  window.history.replaceState(window.history.state, '', href);
                } else {
                  router.push(href, { scroll: false });
                }
              }}
              onClose={() => {
                // Rewrite the URL back to the origin (no navigation), then drop
                // the media so the player disappears entirely.
                if (state.isOverlay && typeof window !== 'undefined') {
                  window.history.replaceState(window.history.state, '', state.originUrl || '/');
                }
                setState((s) => ({ ...s, media_id: undefined, mode: 'mini' }));
              }}
              onMinimize={() => {
                // No navigation at all — both the watch overlay and the origin
                // page are already mounted, so minimizing is just a visibility
                // flip (mode → mini hides the overlay, reveals the origin) plus a
                // cosmetic URL rewrite back to the origin via the History API.
                // Next syncs usePathname without any refetch/reload. (Hard-loaded
                // full page has no overlay → fall back to a real navigation.)
                setState((s) => ({ ...s, mode: 'mini' }));
                if (state.isOverlay && typeof window !== 'undefined') {
                  window.history.replaceState(window.history.state, '', state.originUrl || '/');
                } else {
                  router.push('/', { scroll: false });
                }
              }}
            />
          </>
        )}
      </div>
      </div>
    </>,
    container,
  );
}
