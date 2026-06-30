'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { useVideo } from '@/hooks/VideoProvider';

/**
 * Fullscreen surface for the @watch overlay — KEPT MOUNTED, shown/hidden rather
 * than unmounted, so full⟷mini is instant with no refetch (YouTube-style).
 *
 * The `@watch` parallel slot keeps this subpage mounted across soft navigation
 * (Next.js parallel-routes behavior), and the origin page stays mounted beneath
 * via the interception. We just toggle visibility off the store `mode`: visible
 * in full, `display:none` in mini (DOM + React state preserved). The persistent
 * player (VideoShell) portals on top of `#video-inline-placeholder` inside here.
 *
 * Stacking: z-30 (above origin, below navbar z-50 and the player z-40).
 */
export default function WatchOverlay({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { state, setState } = useVideo();
  const visible = state.mode === 'full';

  // If a soft navigation leaves the watch route while still in full mode (e.g.
  // tapping a cast/related link inside the overlay), drop to mini so the kept-
  // mounted overlay hides instead of covering the destination page.
  //
  // Only fire on a genuine watch→non-watch TRANSITION (tracked via the previous
  // pathname). Checking "mode is full but pathname isn't watch" naively would
  // race the maximize navigation — `mode` flips to full a tick before the URL
  // becomes /watch, so the guard would wrongly bounce it back to mini (the
  // "needs a second click" bug).
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
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  return (
    <div
      className="fixed inset-0 z-30 overflow-y-auto overscroll-contain pt-12 md:pt-16"
      style={{ display: visible ? undefined : 'none' }}
    >
      {/* Background surface (fades in on first mount). */}
      <div className="watch-overlay-bg pointer-events-none fixed inset-0 bg-background" />
      {/* Content sits above the background. */}
      <div className="relative">{children}</div>
    </div>
  );
}
