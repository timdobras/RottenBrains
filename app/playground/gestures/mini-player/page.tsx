'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
  animate,
  type PanInfo,
} from 'framer-motion';

const NAV_H = 56;
const MINI_H = 72;
const MINI_W = 128; // 128 * 9/16 = 72 → fits MINI_H exactly
const ASPECT = 9 / 16;

const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));

const feed = Array.from({ length: 10 }, (_, i) => ({
  id: i,
  title: [
    'Dune: Part Two',
    'Oppenheimer',
    'The Batman',
    'Interstellar',
    'Blade Runner 2049',
    'Sicario',
    'Arrival',
    'Prisoners',
    'No Country for Old Men',
    'Heat',
  ][i],
  meta: `${(i % 5) + 1}.${i}M views · ${i + 1}d ago`,
}));

export default function MiniPlayerDemo() {
  const frameRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 390, h: 844 });
  const [dismissed, setDismissed] = useState(false);
  const [isMini, setIsMini] = useState(false);
  const [playing, setPlaying] = useState(true);

  // progress: 0 = full/expanded, 1 = minimized
  const progress = useMotionValue(0);
  const panStartP = useRef(0);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const measure = () =>
      setDims({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fullVideoW = dims.w;
  const fullVideoH = fullVideoW * ASPECT;
  const miniScale = MINI_W / fullVideoW;
  const tyMini = dims.h - NAV_H - MINI_H; // where the mini thumb top lands
  const txMini = 8;

  // Map progress → transforms (compositor-only: translate + scale).
  const scale = useTransform(progress, [0, 1], [1, miniScale]);
  const tx = useTransform(progress, [0, 1], [0, txMini]);
  const ty = useTransform(progress, [0, 1], [0, tyMini]);
  // Details panel fades/slides away as you minimize.
  const detailsOpacity = useTransform(progress, [0, 0.6], [1, 0]);
  const detailsTy = useTransform(progress, [0, 1], [0, 40]);
  // Mini info (title + controls beside the thumb) fades in near the end.
  const miniInfoOpacity = useTransform(progress, [0.55, 1], [0, 1]);
  // Whole player slides off-screen when dismissed.
  const dismissY = useMotionValue(0);

  useMotionValueEvent(progress, 'change', (v) => {
    const mini = v > 0.5;
    setIsMini((prev) => (prev === mini ? prev : mini));
  });

  const snapTo = (target: 0 | 1, velocity = 0) =>
    animate(progress, target, {
      type: 'spring',
      stiffness: 500,
      damping: 42,
      velocity: velocity / Math.max(tyMini, 1), // px/s → progress/s
    });

  const onPanStart = () => {
    panStartP.current = progress.get();
  };
  const onPan = (_: unknown, info: PanInfo) => {
    // translateY tracks the finger 1:1 (range == tyMini), so the player
    // sits exactly under your thumb the whole drag.
    progress.set(clamp(panStartP.current + info.offset.y / tyMini));
  };
  const onPanEnd = (_: unknown, info: PanInfo) => {
    const v = info.velocity.y;
    let target: 0 | 1;
    if (v > 400) target = 1;
    else if (v < -400) target = 0;
    else target = progress.get() > 0.4 ? 1 : 0;
    snapTo(target, v);
  };

  const onTap = () => {
    if (isMini) snapTo(0);
    else setPlaying((p) => !p);
  };

  const dismiss = () => {
    animate(dismissY, dims.h, { type: 'spring', stiffness: 400, damping: 40 });
    setTimeout(() => setDismissed(true), 250);
  };

  const reopen = () => {
    setDismissed(false);
    dismissY.set(0);
    progress.set(0);
  };

  return (
    <div ref={frameRef} className="relative h-full w-full overflow-hidden">
      {/* Back-to-hub */}
      <Link
        href="/playground/gestures"
        className="absolute left-3 top-[max(0.75rem,env(safe-area-inset-top))] z-50 rounded-full bg-black/50 px-3 py-1 text-xs text-white backdrop-blur"
      >
        ← back
      </Link>

      {/* Mock home feed sitting behind the player (revealed when minimized) */}
      <div className="absolute inset-0 overflow-y-auto pb-[calc(56px+env(safe-area-inset-bottom))] pt-16">
        <h2 className="px-4 pb-2 text-lg font-bold">Up next</h2>
        {feed.map((f) => (
          <div key={f.id} className="px-4 py-2">
            <div className="aspect-video w-full rounded-xl bg-gradient-to-br from-neutral-700 to-neutral-900" />
            <div className="mt-2 flex gap-3">
              <div className="h-8 w-8 shrink-0 rounded-full bg-accent/70" />
              <div>
                <p className="text-sm font-medium leading-tight">{f.title}</p>
                <p className="text-xs text-muted-foreground">{f.meta}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {dismissed && (
        <button
          onClick={reopen}
          className="absolute left-1/2 top-1/2 z-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-lg"
        >
          Reopen player
        </button>
      )}

      {!dismissed && (
        <motion.div
          className="absolute inset-0 z-30"
          style={{ y: dismissY }}
        >
          {/* Opaque watch backdrop — covers the home feed when expanded,
              cross-dissolves to reveal it as you minimize. */}
          <motion.div
            className="pointer-events-none absolute inset-0 bg-background"
            style={{ opacity: detailsOpacity }}
          />

          {/* Details panel (below the video) — fades out on minimize */}
          <motion.div
            className="absolute inset-x-0 bottom-0 overflow-y-auto px-4 pb-[calc(56px+env(safe-area-inset-bottom))]"
            style={{
              top: fullVideoH,
              opacity: detailsOpacity,
              y: detailsTy,
              pointerEvents: isMini ? 'none' : 'auto',
            }}
          >
            <h1 className="mt-3 text-xl font-bold">Dune: Part Two</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              4.2M views · 2024 · Sci-Fi
            </p>
            <div className="mt-3 flex gap-2">
              {['👍 12K', '👎', '↗ Share', '＋ Save'].map((b) => (
                <span
                  key={b}
                  className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium"
                >
                  {b}
                </span>
              ))}
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Paul Atreides unites with the Fremen to wage war against House
              Harkonnen. Drag the player down to dock it, then tap the thumbnail
              to bring it back. Notice it follows your finger exactly, and
              springs to rest when you let go.
            </p>
            <h3 className="mt-6 font-semibold">Comments</h3>
            {[
              'this scene is unreal on a big screen',
              'Hans Zimmer cooked again',
              'the way the player tracks my thumb is so clean',
            ].map((c, i) => (
              <div key={i} className="mt-3 flex gap-3">
                <div className="h-7 w-7 shrink-0 rounded-full bg-accent/60" />
                <p className="text-sm">{c}</p>
              </div>
            ))}
          </motion.div>

          {/* The video — translate + scale only, top-left origin */}
          <motion.div
            onPanStart={onPanStart}
            onPan={onPan}
            onPanEnd={onPanEnd}
            onTap={onTap}
            className="absolute left-0 top-0 origin-top-left touch-none select-none"
            style={{
              width: fullVideoW,
              height: fullVideoH,
              x: tx,
              y: ty,
              scale,
            }}
          >
            <div className="relative h-full w-full overflow-hidden bg-black">
              {/* fake video surface */}
              <div className="absolute inset-0 bg-gradient-to-br from-amber-700 via-neutral-900 to-black" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-5xl opacity-80">
                  {playing ? '❚❚' : '▶'}
                </span>
              </div>
              {/* progress bar */}
              <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
                <div className="h-full w-1/3 bg-accent" />
              </div>
            </div>
          </motion.div>

          {/* Mini info beside the thumb (only meaningful when minimized) */}
          <motion.div
            className="absolute z-40 flex items-center"
            style={{
              left: txMini + MINI_W + 8,
              top: tyMini,
              height: MINI_H,
              right: 8,
              opacity: miniInfoOpacity,
              pointerEvents: isMini ? 'auto' : 'none',
            }}
          >
            <div className="min-w-0 flex-1" onClick={() => snapTo(0)}>
              <p className="truncate text-sm font-medium">Dune: Part Two</p>
              <p className="truncate text-xs text-muted-foreground">
                Warner Bros.
              </p>
            </div>
            <button
              onClick={() => setPlaying((p) => !p)}
              className="px-2 text-xl"
              aria-label="play/pause"
            >
              {playing ? '❚❚' : '▶'}
            </button>
            <button
              onClick={dismiss}
              className="px-2 text-xl"
              aria-label="close"
            >
              ✕
            </button>
          </motion.div>
        </motion.div>
      )}

      {/* Fake bottom nav — mini bar docks just above it */}
      <div
        className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-around border-t border-border bg-background pb-[env(safe-area-inset-bottom)]"
        style={{ height: NAV_H }}
      >
        {['🏠', '🔥', '＋', '📺', '👤'].map((n, i) => (
          <span key={i} className="text-lg opacity-80">
            {n}
          </span>
        ))}
      </div>
    </div>
  );
}
