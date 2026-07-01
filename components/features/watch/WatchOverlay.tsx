'use client';

import { motion, useMotionValueEvent, useTransform } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { useVideo } from '@/hooks/VideoProvider';

/**
 * Fullscreen surface for the @watch overlay — KEPT MOUNTED, shown/hidden rather
 * than unmounted, so full⟷mini is instant with no refetch (YouTube-style).
 *
 * Its background + content are tied to the shared `progress` MotionValue (0 =
 * full, 1 = mini): as the player is dragged/animated down into the mini window,
 * this surface cross-dissolves out to reveal the origin page beneath it, then
 * `display:none`s once fully docked. The persistent player (VideoShell) portals
 * on top of `#video-inline-placeholder` inside here in full mode.
 *
 * Stacking: z-30 (above origin, below the player z-40/99999).
 */
export default function WatchOverlay({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { state, setState, progress, playerY } = useVideo();

  // Displayed while the surface is anything but fully docked. Threshold state off
  // `progress` so a mid-flight minimize keeps the (fading) content visible, and it
  // only drops out of the layout once the player has fully reached the mini dock.
  const [docked, setDocked] = useState(progress.get() > 0.999);
  useMotionValueEvent(progress, 'change', (v) => {
    const next = v > 0.999;
    setDocked((prev) => (prev === next ? prev : next));
  });
  // Content is interactive only at (near) full; while morphing/mini it's inert so
  // a stray tap on the fading details can't fire.
  const [interactive, setInteractive] = useState(progress.get() < 0.02);
  useMotionValueEvent(progress, 'change', (v) => {
    const next = v < 0.02;
    setInteractive((prev) => (prev === next ? prev : next));
  });

  // Staged reveal: the CONTENT (details below the player) drops out fast — slides
  // down WITH the player (y = playerY) and fades over progress 0→0.2. The solid
  // theme BACKGROUND that covers the origin is WatchBackdrop (fades 0.2→0.8) — a
  // single shared layer, so it isn't double-painted here.
  const contentOpacity = useTransform(progress, [0, 0.2], [1, 0]);

  // If a soft navigation leaves the watch route while still in full mode (e.g.
  // tapping a cast/related link inside the overlay), drop to mini so the kept-
  // mounted overlay hides instead of covering the destination page. Only fire on
  // a genuine watch→non-watch TRANSITION (tracked via the previous pathname), to
  // avoid racing the maximize navigation (mode flips to full a tick before the
  // URL becomes /watch).
  const prevPathRef = useRef(pathname);
  useEffect(() => {
    const was = prevPathRef.current;
    prevPathRef.current = pathname;
    const wasWatch = !!was && was.includes('/protected/watch/');
    const isWatch = !!pathname && pathname.includes('/protected/watch/');
    if (wasWatch && !isWatch && state.mode === 'full') {
      setState((s) => ({ ...s, mode: 'mini' }));
    }
  }, [pathname, state.mode, setState]);

  // Lock the origin page's scroll only while the overlay is actually showing.
  useEffect(() => {
    if (docked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [docked]);

  return (
    <div
      // The navbar is hidden on the watch surface, so the overlay owns the full
      // viewport with no top padding: mobile pins the player flush to the top via
      // `sticky top-0`, desktop uses the wrapper's own md:pt-6.
      className="fixed inset-0 z-30 overflow-y-auto overscroll-contain"
      style={{ display: docked ? 'none' : undefined }}
    >
      {/* Background is WatchBackdrop (shared, fades 0.2→0.8). Content sits above
          it; slides down with the player and fades out fast. Inert unless (near) full. */}
      <motion.div
        className="relative"
        style={{ opacity: contentOpacity, y: playerY, pointerEvents: interactive ? undefined : 'none' }}
      >
        {children}
      </motion.div>
    </div>
  );
}
