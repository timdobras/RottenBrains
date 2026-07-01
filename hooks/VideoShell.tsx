'use client';

import { animate, motion, useMotionValue, useMotionValueEvent, type MotionStyle, type MotionValue } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import React, { memo, useCallback, useEffect, useRef, useState, useTransition } from 'react';
import ReactDOM from 'react-dom';

import type { CustomPlayerSubtitle } from '@/components/features/watch/CustomPlayer';
import useIsMobile from '@/hooks/useIsMobile';
import { getHrefFromMedia } from '@/lib/utils';

import { useMiniplayerState } from './useMiniplayerState';
import { useShellStream } from './useShellStream';
import type { ResolveInput } from './useStreamResolver';
import { useUser } from './UserContext';
import { useVideo } from './VideoProvider';
import { useWatchProgressTracker } from './useWatchProgressTracker';

// Estimate the full-mode player rect from viewport geometry, mirroring the watch
// layout (a max-w-7xl wrapper with md:px-8 / md:pt-6, non-theater). Used as the
// player's target while the real #video-inline-placeholder hasn't mounted yet, so
// an expand starts the player moving immediately instead of waiting for the
// overlay route to render. The navbar is hidden on watch, so there's no bar
// height to offset for — mobile pins flush to the top.
function estimateFullRect(isMobile: boolean, aspectRatio: number) {
  if (typeof window === 'undefined') return null;
  const vw = window.innerWidth;
  if (isMobile) {
    const width = vw;
    return { top: 0, left: 0, width, height: Math.round(width / aspectRatio) };
  }
  const wrapperW = Math.min(vw, 1280); // max-w-7xl
  const padX = 32; // md:px-8
  const width = wrapperW - padX * 2;
  const left = Math.round(Math.max(0, (vw - wrapperW) / 2) + padX);
  const top = 24; // wrapper md:pt-6 (no navbar on watch)
  return { top, left, width, height: Math.round(width / aspectRatio) };
}

type Rect = { top: number; left: number; width: number; height: number };

// Code-split the player (and its ~150KB-gz hls.js dependency) OUT of the shared
// app-shell bundle. VideoShell is mounted in the root layout on every route, but
// the actual player is only needed once a title is opened — so load it lazily
// instead of shipping hls.js + the 1,100-line CustomPlayer to the landing/login
// pages. ssr:false because the player is a purely client-side, portaled widget.
const CustomPlayer = dynamic(() => import('@/components/features/watch/CustomPlayer'), {
  ssr: false,
});

// Memoized so the shell's per-transition state ticks (phase, shield) don't
// re-render the heavy player mid-morph — it only re-renders when its own props
// actually change (stream/src, mini at rest), which is what caused the hitching.
const MemoCustomPlayer = memo(CustomPlayer);

// Spring used for every non-drag transition (buttons + drag-release snap), so a
// tapped minimize/maximize plays the exact same motion as a flung drag.
const SPRING = { type: 'spring' as const, stiffness: 400, damping: 40 };

/**
 * Persistent player shell. A single CustomPlayer (<video>/hls.js) lives in the
 * `#player-root` portal and survives navigation: it is NEVER remounted on a
 * mode/provider change, so playback is continuous. Its box is always laid out at
 * the full-mode rect (top/left/width/height); a `progress`-driven translate+scale
 * transform (0 = full, 1 = mini) morphs it toward the floating mini window. That
 * transform is what the drag-to-minimize gesture and the minimize/maximize
 * buttons both animate — the video is dragged from a max player at the top down
 * to a mini player docked bottom-right.
 */
export default function VideoShell() {
  const { state, setState, progress, playerY } = useVideo();
  const { media_type, media_id, season_number, episode_number, mode, resumePosition } = state;

  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);
  const { user } = useUser();
  const premium = !!user?.premium;

  // Tracked placeholder rect for full-mode positioning (kept aligned via a
  // per-frame loop). Falls back to a geometry estimate when the placeholder
  // isn't mounted (e.g. while mini, where the overlay is hidden).
  const [placeholderRect, setPlaceholderRect] = useState<DOMRect | null>(null);

  const { position, size, sizeMode, toggleSizeMode, isDragging, setIsDragging, setTempPosition, handleDragEnd } =
    useMiniplayerState();
  const sizeModeRef = useRef(sizeMode);
  sizeModeRef.current = sizeMode;
  // Double-tap tracking for the mini (mobile): single tap = expand, double = resize.
  const lastMiniTapRef = useRef(0);
  const miniTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const router = useRouter();
  const shellElRef = useRef<HTMLDivElement | null>(null);
  // Pending state for a direct-load minimize navigation to the origin — drives a
  // loader behind the docked player while that page renders.
  const [originPending, startOriginTransition] = useTransition();

  // watch-page href for this title (mini tap on mobile → expand here)
  const href =
    media_id && media_type ? getHrefFromMedia(media_type, media_id, season_number, episode_number) : '/';

  // ── stream + tracking (the resolution pipeline) ──
  const input: ResolveInput | null =
    media_id && (media_type === 'movie' || media_type === 'tv')
      ? { mediaType: media_type, id: media_id, season: season_number, episode: episode_number }
      : null;
  const stream = useShellStream(input, { enabled: premium && !!input });
  const onProgress = useWatchProgressTracker(
    { media_type: media_type ?? '', media_id: media_id ?? 0, season_number, episode_number },
    { enabled: premium && !!input },
  );

  // Hold the last successfully-resolved stream so a PROVIDER switch (brief
  // stream=null) doesn't blank the player. A TITLE change DOES drop it.
  const lastStreamRef = useRef<{ src: string; type: 'hls' | 'mp4'; subtitles: CustomPlayerSubtitle[] }>(
    { src: '', type: 'hls', subtitles: [] },
  );
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

  // Intrinsic content aspect (width/height), shared via the store so BOTH the full
  // player (its placeholder) and the mini window size to the real content —
  // defaulting to 16/9 until the <video> reports its dimensions. Auto-resets per
  // title because VideoContextSetter replaces the whole store state on a new title.
  const aspectRatio = state.aspectRatio && state.aspectRatio > 0 ? state.aspectRatio : 16 / 9;
  const setAspectRatio = useCallback(
    (r: number) => {
      if (r > 0) setState((s) => (s.aspectRatio === r ? s : { ...s, aspectRatio: r }));
    },
    [setState],
  );

  // ── geometry ──
  // Full-mode box: the measured placeholder, else the geometry estimate. Computed
  // even in mini (placeholder absent) so the morph transform always has a stable
  // base rect to interpolate FROM.
  // Height is computed from the measured WIDTH and the content aspect (NOT the
  // measured height) so the full player reacts to the aspect exactly like the mini
  // — instantly on every render — instead of waiting on the placeholder-tracking
  // loop to catch the CSS resize (which left the box stuck at 16/9).
  const fullRect: Rect | null =
    placeholderRect && placeholderRect.width > 0
      ? {
          top: placeholderRect.top,
          left: placeholderRect.left,
          width: placeholderRect.width,
          height: Math.round(placeholderRect.width / aspectRatio),
        }
      : estimateFullRect(isMobile, aspectRatio);
  // Mini-mode box: the floating window from useMiniplayerState, but sized to the
  // CONTENT aspect (matches the mini rest render + the full box, so the morph
  // scales uniformly with no aspect pop at the handoff).
  const miniRect: Rect = {
    top: position.y,
    left: position.x,
    width: size.width,
    height: Math.round(size.width / aspectRatio),
  };

  // Live refs for the imperative transform + pointer handlers (avoid stale closures).
  const geomRef = useRef<{ full: Rect | null; mini: Rect }>({ full: fullRect, mini: miniRect });
  geomRef.current.full = fullRect;
  geomRef.current.mini = miniRect;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const hrefRef = useRef(href);
  hrefRef.current = href;
  const isMobileRef = useRef(isMobile);
  isMobileRef.current = isMobile;
  const isOverlayRef = useRef(state.isOverlay);
  isOverlayRef.current = state.isOverlay;

  // Motion outputs — ONLY used during the in-between morph. The box stays at
  // fullRect (React layout); these compositor-only transforms (top-left origin)
  // slide + shrink it toward miniRect as progress → 1. At rest (full or mini) no
  // transform is applied at all, so native fullscreen/PiP behave normally and
  // there's no idle layer to repaint.
  const x = useMotionValue(0);
  const scale = useMotionValue(1);
  const radius = useMotionValue(0);
  // y is the shared store MotionValue (playerY) so the watch content can slide by
  // the exact same vertical amount during the morph.
  const y = playerY;

  const applyTransform = useCallback(() => {
    const v = progress.get();
    const { full, mini } = geomRef.current;
    if (!full) {
      x.set(0);
      y.set(0);
      scale.set(1);
      radius.set(0);
      return;
    }
    const s = mini.width / full.width;
    const scaleNow = 1 + (s - 1) * v;
    x.set((mini.left - full.left) * v);
    y.set((mini.top - full.top) * v);
    scale.set(scaleNow);
    // Visual corner radius goes 0 (full) → 14px (mini), matching BOTH rest states.
    // Divide by the live scale so, once the transform shrinks the box, the RENDERED
    // radius lands exactly on those px values (no mismatch with the mini's 14px).
    radius.set(scaleNow > 0 ? (14 * v) / scaleNow : 14 * v);
  }, [progress, x, y, scale, radius]);

  // Recompute the transform on every progress tick AND whenever the rects change
  // (mini repositioning at rest, full-mode scroll/resize).
  useEffect(() => {
    applyTransform();
    return progress.on('change', applyTransform);
  }, [progress, applyTransform]);
  useEffect(() => {
    applyTransform();
  }, [applyTransform, fullRect?.top, fullRect?.left, fullRect?.width, fullRect?.height, miniRect.top, miniRect.left, miniRect.width, miniRect.height]);

  // Rendering phase derived from progress:
  //   'full' (rest, docked in the page) · 'mini' (rest, floating window) · 'morph'
  //   (in between). ONLY 'morph' applies the transform; both rest states render as
  //   plain boxes. Crucially the CustomPlayer chrome (full controls ⇄ mini chrome)
  //   swaps on the 'mini' boundary — at the very end of the animation, NOT halfway
  //   — so we never re-render the whole player mid-morph (that was the hitch).
  // `snapping` is true only while a spring (button / drag-release) is in flight —
  // it raises a transient click-shield so shifting content under the pointer can't
  // be activated. NOT set during a manual drag, so it never blocks the gesture.
  const phaseOf = (v: number): 'full' | 'morph' | 'mini' =>
    v >= 0.999 ? 'mini' : v <= 0.001 ? 'full' : 'morph';
  const [phase, setPhase] = useState<'full' | 'morph' | 'mini'>(phaseOf(progress.get()));
  const [snapping, setSnapping] = useState(false);
  useMotionValueEvent(progress, 'change', (v) => {
    const next = phaseOf(v);
    setPhase((prev) => (prev === next ? prev : next));
    if (v < 0.01 || v > 0.99) setSnapping((prev) => (prev ? false : prev));
  });

  // The mini box's resize/snap CSS transition must be OFF on the morph→mini
  // handoff frame — otherwise removing the transform while writing top/left
  // animates the box from the full position (a visible "double" animation). Turn
  // it on one frame after entering mini, so later double-tap resizes + edge snaps
  // still animate.
  const [miniSettled, setMiniSettled] = useState(false);
  useEffect(() => {
    if (phase !== 'mini') {
      setMiniSettled(false);
      return;
    }
    const id = requestAnimationFrame(() => setMiniSettled(true));
    return () => cancelAnimationFrame(id);
  }, [phase]);

  // ── mode → progress animation ──
  // Every minimize/maximize path in the app just sets store `mode`; this is the
  // single place that turns a mode change into the spring animation. So the
  // buttons, the link interceptor, and browser back all "play the animation" for
  // free — identically to a drag-release snap.
  const animRef = useRef<ReturnType<typeof animate> | null>(null);
  const animateTo = useCallback(
    (target: 0 | 1) => {
      animRef.current?.stop();
      setSnapping(true);
      const controls = animate(progress, target, SPRING);
      animRef.current = controls;
      // Clear the shield off the completion promise — NOT just off progress
      // 'change' events. If we're already AT the target (e.g. dragged fully to the
      // dock before releasing), the animation emits no change events, so a
      // change-only clear would leave the shield stuck on top blocking all
      // interaction. `.finished` always settles (resolves on finish, rejects on
      // interrupt — and the interrupting animateTo re-arms its own clear).
      controls.finished.then(() => setSnapping(false)).catch(() => {});
    },
    [progress],
  );
  const prevModeRef = useRef<string | null>(null);
  const prevMediaRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    const media = media_id;
    // No media open → nothing to animate; just keep the mode baseline in sync.
    if (media == null) {
      prevModeRef.current = mode;
      prevMediaRef.current = undefined;
      return;
    }
    const isFreshTitle = prevMediaRef.current !== media;
    prevMediaRef.current = media;
    // Fresh open or hop to a new title → snap to the mode's target with NO
    // animation (a new player shouldn't fly in from the mini corner).
    if (isFreshTitle) {
      animRef.current?.stop();
      progress.set(mode === 'mini' ? 1 : 0);
      prevModeRef.current = mode;
      return;
    }
    if (mode !== prevModeRef.current) {
      prevModeRef.current = mode;
      animateTo(mode === 'mini' ? 1 : 0);
    }
  }, [mode, media_id, progress, animateTo]);

  // ── side-effecting transitions (URL rewrites live here; the animation is driven
  //    by the mode change above) ──
  const minimize = useCallback(() => {
    setState((s) => ({ ...s, mode: 'mini' }));
    if (isOverlayRef.current && typeof window !== 'undefined') {
      // In-app path: both the overlay and the origin page are already mounted, so
      // minimize is a visibility flip + a cosmetic URL rewrite — instant.
      window.history.replaceState(window.history.state, '', state.originUrl || '/');
    } else {
      // Direct-load path: no origin mounted underneath, so this is a real
      // navigation. Run it as a transition so `originPending` is true while the
      // landing page renders — the player still docks instantly (its own spring),
      // and we show a loader behind it if the page isn't warm yet (e.g. the user
      // minimized immediately, before the background prefetch landed).
      startOriginTransition(() => {
        router.push(state.originUrl || '/', { scroll: false });
      });
    }
  }, [setState, router, state.originUrl, startOriginTransition]);

  const maximize = useCallback(() => {
    setState((s) => ({ ...s, mode: 'full', isOverlay: true }));
    if (isOverlayRef.current && typeof window !== 'undefined') {
      window.history.replaceState(window.history.state, '', hrefRef.current);
    } else {
      router.push(hrefRef.current, { scroll: false });
    }
  }, [setState, router]);

  const closePlayer = useCallback(() => {
    if (isOverlayRef.current && typeof window !== 'undefined') {
      window.history.replaceState(window.history.state, '', state.originUrl || '/');
    }
    setState((s) => ({ ...s, media_id: undefined, mode: 'mini' }));
  }, [setState, state.originUrl]);

  // Mount check for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Warm the watch route while mini so an expand navigates against a prefetched route.
  useEffect(() => {
    if (mode === 'mini' && href && href !== '/') router.prefetch(href);
  }, [mode, href, router]);

  // Direct-loaded watch page (arrived by hard-loading the /watch URL, e.g. a
  // shared link) has NO origin page mounted underneath — the @watch intercept
  // only fires on soft navigation, so minimize has to actually navigate to the
  // landing page. Warm it in the BACKGROUND so that navigation renders from cache
  // with no network load (the persistent player keeps playing across it). The
  // in-app overlay path already has its origin mounted, so this only runs when
  // isOverlay is false.
  //
  // Crucially, DEFER it so it never competes with the player for bandwidth on
  // first load: wait until the stream has actually resolved (player + video come
  // first), then warm home only once the tab goes idle (with a timeout fallback).
  // So the important stuff loads first and home trickles in afterwards.
  const originWarmedRef = useRef(false);
  useEffect(() => {
    if (originWarmedRef.current) return;
    if (!media_id || state.isOverlay) return;
    if (!stream.src) return; // player hasn't got its stream yet → hold off
    originWarmedRef.current = true;
    const origin = state.originUrl || '/';
    const warm = () => router.prefetch(origin);
    // A short head start for the stream, then warm home when the browser is idle.
    const t = setTimeout(() => {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        (window as unknown as { requestIdleCallback: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback(
          warm,
          { timeout: 3000 },
        );
      } else {
        warm();
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [media_id, state.isOverlay, state.originUrl, stream.src, router]);

  // Track the placeholder position so the full-mode box stays aligned. Per-frame
  // (rather than ResizeObserver on a node) because the placeholder is created/
  // replaced by the overlay route as it loads; re-querying every frame locks onto
  // whichever placeholder is currently mounted and survives that swap.
  useEffect(() => {
    // Only track at FULL REST. During the morph the base rect is captured/stable.
    if (!mounted || phase !== 'full') {
      if (phase === 'mini') setPlaceholderRect(null);
      return;
    }

    // Event-driven remeasure instead of a per-frame getBoundingClientRect loop.
    // The old loop forced a synchronous reflow 60×/sec for the ENTIRE viewing
    // session (a major idle-jank source). The placeholder rect only actually
    // changes when the page scrolls, the viewport resizes, or content growth
    // reflows the layout — so we measure on exactly those, coalesced to one
    // rAF. getElementById is re-run each measure so we lock onto whichever
    // placeholder the overlay route currently has mounted.
    let raf = 0;
    const measure = () => {
      const el = document.getElementById('video-inline-placeholder');
      if (!el) return;
      const rect = el.getBoundingClientRect();
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
    };
    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        measure();
      });
    };

    // A short settling burst catches the overlay route mounting the placeholder
    // and late async content (images) shifting it, without polling forever.
    let settleRaf = 0;
    let settles = 0;
    const settle = () => {
      measure();
      if (++settles < 30) settleRaf = requestAnimationFrame(settle);
    };
    settle();

    // Steady state: remeasure only when things actually move.
    window.addEventListener('scroll', schedule, { passive: true, capture: true });
    window.addEventListener('resize', schedule, { passive: true });
    const ro = new ResizeObserver(schedule);
    ro.observe(document.body);

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(settleRaf);
      window.removeEventListener('scroll', schedule, { capture: true } as EventListenerOptions);
      window.removeEventListener('resize', schedule);
      ro.disconnect();
    };
  }, [mounted, phase]);

  // ── pointer: mini reposition-drag + full drag-to-minimize ──
  // A single pointerdown → window move/up cycle, branching on the current mode.
  //  • mini: move past a threshold drags the floating window (snap-to-edge on
  //    release); a press without moving = tap → expand (mobile) / play-pause (desktop).
  //  • full: a predominantly-downward drag drives `progress` (the player follows
  //    the finger, shrinking toward the mini dock). Release snaps to mini or back
  //    to full by position + velocity. A tap does nothing here (the video's own
  //    onClick handles play/pause / controls).
  const dragRef = useRef<
    | { kind: 'mini'; startX: number; startY: number; posX: number; posY: number; active: boolean }
    | { kind: 'full'; startX: number; startY: number; active: boolean; vy: number; prevY: number; prevT: number }
    | null
  >(null);

  const onShellPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (modeRef.current === 'mini') {
        dragRef.current = {
          kind: 'mini',
          startX: e.clientX,
          startY: e.clientY,
          posX: position.x,
          posY: position.y,
          active: false,
        };
      } else {
        // Full: candidate minimize-drag, UNLESS the press started on a control
        // (scrubber, buttons, menus) — those own their gestures.
        const el = e.target as HTMLElement | null;
        if (el?.closest('button, input, a, [role="menu"], [role="menuitem"], [data-no-mindrag]')) return;
        dragRef.current = {
          kind: 'full',
          startX: e.clientX,
          startY: e.clientY,
          active: false,
          vy: 0,
          prevY: e.clientY,
          prevT: e.timeStamp,
        };
      }
    },
    [position],
  );

  useEffect(() => {
    const THRESHOLD = 8;
    const onMove = (e: PointerEvent) => {
      const s = dragRef.current;
      if (!s) return;
      const dx = e.clientX - s.startX;
      const dy = e.clientY - s.startY;

      if (s.kind === 'mini') {
        if (!s.active && Math.hypot(dx, dy) < 5) return;
        if (!s.active) {
          s.active = true;
          setIsDragging(true);
        }
        e.preventDefault();
        // Large mini stays horizontally centered — only drag it vertically.
        const nx = sizeModeRef.current === 'large' ? s.posX : s.posX + dx;
        setTempPosition({ x: nx, y: s.posY + dy });
        return;
      }

      // full → minimize drag. Any DOWNWARD swipe minimizes: we just wait until
      // there's enough downward travel (dy past the threshold). Horizontal or
      // upward gestures never reach that and are ignored — and the scrubber has
      // its own handler (excluded at pointerdown), so it's unaffected.
      if (!s.active) {
        if (dy < THRESHOLD) return;
        s.active = true;
        animRef.current?.stop();
      }
      e.preventDefault();
      const { full, mini } = geomRef.current;
      const range = full ? Math.max(120, mini.top - full.top) : 400;
      progress.set(Math.min(1, Math.max(0, dy / range)));
      const now = e.timeStamp;
      const dt = now - s.prevT;
      if (dt > 0) s.vy = (e.clientY - s.prevY) / dt; // px/ms
      s.prevY = e.clientY;
      s.prevT = now;
    };

    const onUp = (e: PointerEvent) => {
      const s = dragRef.current;
      dragRef.current = null;
      if (!s) return;

      if (s.kind === 'mini') {
        if (s.active) {
          handleDragEnd(s.posX + (e.clientX - s.startX), s.posY + (e.clientY - s.startY));
          setIsDragging(false);
        } else if (isMobileRef.current) {
          // Mobile tap: single = expand, double = toggle mini size. Defer the
          // single-tap expand briefly so a second tap can cancel it into a resize.
          const now = e.timeStamp;
          if (now - lastMiniTapRef.current < 300) {
            lastMiniTapRef.current = 0;
            if (miniTapTimerRef.current) {
              clearTimeout(miniTapTimerRef.current);
              miniTapTimerRef.current = null;
            }
            toggleSizeMode();
          } else {
            lastMiniTapRef.current = now;
            if (miniTapTimerRef.current) clearTimeout(miniTapTimerRef.current);
            miniTapTimerRef.current = setTimeout(() => {
              miniTapTimerRef.current = null;
              maximize();
            }, 300);
          }
        } else {
          // Desktop tap: play/pause (instant, no double-tap).
          const v = shellElRef.current?.querySelector('video');
          if (v) v.paused ? v.play().catch(() => {}) : v.pause();
        }
        return;
      }

      // full drag release
      if (!s.active) return; // was a tap → leave play/pause to the video onClick
      const cur = progress.get();
      // Fling down (fast) → minimize; else decide by how far it was pulled.
      const toMini = s.vy > 0.5 || (s.vy > -0.3 && cur > 0.35);
      if (toMini) {
        minimize(); // sets mode → the mode effect springs progress 0→1
      } else {
        animateTo(0); // stay full (mode unchanged, so animate directly)
      }
    };

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [setIsDragging, setTempPosition, handleDragEnd, progress, animateTo, minimize, maximize, toggleSizeMode]);

  // ── bail conditions ──
  if (!mounted) return null;
  if (!media_id || !media_type) return null;
  const container = document.getElementById('player-root');
  if (!container) return null;
  if (!fullRect) return null;

  // Per-phase box. 'morph' is the ONLY state with a transform (compositor-only
  // translate+scale, layer-promoted via will-change); 'full' and 'mini' render as
  // plain boxes — so native fullscreen/PiP work at full, and the mini window keeps
  // its original design + content-fit aspect. touch-action:none in every phase so
  // the browser never steals the vertical swipe (no pull-to-refresh / scroll
  // fight) — our handler owns the drag-to-minimize.
  const SHADOW = '0 4px 20px rgba(0,0,0,0.5)';
  const style: MotionStyle =
    phase === 'mini'
      ? {
          position: 'fixed',
          top: position.y,
          left: position.x,
          width: size.width,
          height: Math.round(size.width / aspectRatio),
          zIndex: 99999,
          borderRadius: 14,
          boxShadow: SHADOW,
          touchAction: 'none',
          cursor: isDragging ? 'grabbing' : 'grab',
          // Animate the double-tap resize + edge snap; instant while dragging (track
          // the finger) AND on the handoff frame (miniSettled false) so the box
          // doesn't animate in from the full position.
          transition:
            isDragging || !miniSettled
              ? 'none'
              : 'top 0.25s ease, left 0.25s ease, width 0.25s ease, height 0.25s ease',
        }
      : phase === 'morph'
        ? {
            position: 'fixed',
            top: fullRect.top,
            left: fullRect.left,
            width: fullRect.width,
            height: fullRect.height,
            transformOrigin: 'top left',
            x,
            y,
            scale,
            borderRadius: radius,
            zIndex: 99999,
            boxShadow: SHADOW,
            willChange: 'transform',
            // Full/morph: shell stays 'auto' so a portaled dropdown menu inside can
            // scroll on touch. The drag surface (video + tap-catch) carries
            // touch-none instead, so the drag-to-minimize still isn't stolen.
            touchAction: 'auto',
          }
        : {
            // full, at rest — no transform, so fullscreen/PiP behave normally
            position: 'fixed',
            top: fullRect.top,
            left: fullRect.left,
            width: fullRect.width,
            height: fullRect.height,
            zIndex: state.isOverlay ? 40 : 1,
            borderRadius: 0,
            boxShadow: 'none',
            touchAction: 'auto',
          };

  return ReactDOM.createPortal(
    <>
      {snapping && (
        <div
          aria-hidden
          // Transient click-shield: absorbs any click/tap while a min/max spring
          // plays and content shifts under the pointer. Above the mini player's
          // z (99999) but only mounted mid-snap.
          className="fixed inset-0"
          style={{ zIndex: 9999999 }}
        />
      )}
      {originPending && (
        <div
          // Loader behind the docked mini player while a direct-load minimize
          // navigation renders the landing page. Covers the (stale) watch content
          // with the theme background + a spinner so the transition reads as
          // "page loading" rather than a broken flash. Below the mini player
          // (z 99999) so it stays visible and interactive on top.
          className="fixed inset-0 grid place-items-center bg-background"
          style={{ zIndex: 9998 }}
        >
          <Loader2 className="h-8 w-8 animate-spin text-foreground/50" />
        </div>
      )}
      <motion.div
        ref={shellElRef}
        // Always black: letterbox bars (non-16/9 content, fullscreen) stay black
        // regardless of theme, not the page color.
        className="overflow-hidden bg-black"
        onPointerDown={onShellPointerDown}
        style={style}
      >
        <div className="absolute inset-0 overflow-hidden">
          {!premium ? (
            <div className="flex h-full w-full items-center justify-center bg-black px-4 text-center text-white">
              {phase !== 'mini' ? 'You need to be a premium user to watch videos.' : 'Premium required'}
            </div>
          ) : (
            <MemoCustomPlayer
              // key excludes mode + provider → no remount on toggle/switch
              key={`${media_type}-${media_id}-${season_number ?? ''}-${episode_number ?? ''}`}
              src={display.src}
              type={display.type}
              subtitles={display.subtitles}
              startTime={resumePosition ?? 0}
              autoPlay
              // Chrome swaps to mini only at rest (phase 'mini') — never mid-morph.
              mini={phase === 'mini'}
              // Hide the chrome instantly during the morph; it fades back in on settle.
              morphing={phase === 'morph'}
              providers={stream.providers}
              currentProvider={stream.currentProvider}
              onSelectProvider={stream.onSelectProvider}
              resolving={stream.resolving}
              probing={stream.probing}
              onProgress={onProgress}
              onAspectRatio={setAspectRatio}
              mobile={isMobile}
              title={state.title}
              noSource={stream.status === 'error' && !display.src}
              onExpand={maximize}
              onClose={closePlayer}
              onMinimize={minimize}
            />
          )}
        </div>
      </motion.div>
    </>,
    container,
  );
}
