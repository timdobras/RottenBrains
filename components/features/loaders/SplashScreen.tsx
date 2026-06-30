'use client';

import React, { useEffect, useState } from 'react';
import { LogoMark } from '@/components/ui/Logo';

/**
 * Full-screen branded splash shown on the FIRST load only.
 *
 * Because this lives in the root layout (app/layout.tsx), and the Next.js root
 * layout persists across client-side navigations, this component mounts exactly
 * once per full document load — i.e. every cold app launch (PWA) or hard
 * refresh — and is NOT re-shown when the user navigates around inside the app.
 * Those in-app navigations keep using the per-route loading.tsx skeletons.
 *
 * The overlay is part of the server-rendered HTML (opacity-100), so it covers
 * the page immediately with no flash of un-styled content, then fades out once
 * the page has finished loading (window `load`), with a short minimum display
 * so the animation always gets a moment to breathe, and a safety cap so a slow
 * resource can never trap the user behind the splash.
 */

const MIN_DISPLAY_MS = 700; // let the animation breathe even on instant loads
const MAX_DISPLAY_MS = 3000; // safety cap — never block longer than this
const FADE_MS = 450; // keep in sync with the transition-duration below

export default function SplashScreen() {
  const [phase, setPhase] = useState<'visible' | 'fading' | 'gone'>('visible');

  useEffect(() => {
    let done = false;
    const start =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    let fadeTimer: ReturnType<typeof setTimeout>;
    let removeTimer: ReturnType<typeof setTimeout>;

    const beginFade = () => {
      if (done) return;
      done = true;
      const now =
        typeof performance !== 'undefined' ? performance.now() : Date.now();
      const wait = Math.max(0, MIN_DISPLAY_MS - (now - start));
      fadeTimer = setTimeout(() => {
        setPhase('fading');
        removeTimer = setTimeout(() => setPhase('gone'), FADE_MS);
      }, wait);
    };

    // Hide once the page has fully loaded (or immediately if it already has).
    if (document.readyState === 'complete') {
      beginFade();
    } else {
      window.addEventListener('load', beginFade, { once: true });
    }
    // Safety net so a slow image/font can never strand the user behind the splash.
    const safetyTimer = setTimeout(beginFade, MAX_DISPLAY_MS);

    return () => {
      window.removeEventListener('load', beginFade);
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
      clearTimeout(safetyTimer);
    };
  }, []);

  if (phase === 'gone') return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-background transition-opacity duration-[450ms] ease-out ${
        phase === 'fading' ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      <div className="relative flex h-28 w-28 items-center justify-center">
        {/* Spinning arc ring — foreground-tinted so it reads on light or dark.
            next-themes sets the .dark class before first paint, so the theme is
            already resolved when this server-rendered overlay appears. */}
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-b-transparent border-l-transparent border-r-foreground/15 border-t-foreground/70 [animation-duration:1.1s] motion-reduce:animate-none" />
        {/* Breathing R logo — currentColor follows the theme (black on light, white on dark) */}
        <LogoMark className="h-12 w-12 select-none text-foreground animate-[splash-breathe_1.6s_ease-in-out_infinite] motion-reduce:animate-none" />
      </div>
    </div>
  );
}
