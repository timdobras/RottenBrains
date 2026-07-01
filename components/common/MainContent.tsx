'use client';

import { useMotionValueEvent } from 'framer-motion';
import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import { useVideo } from '@/hooks/VideoProvider';
import VideoShell from '@/hooks/VideoShell';
import PullToRefreshIndicator from '../features/pwa/PullToRefreshIndicator';
import NavBottom from '../features/navigation/mobile/NavBottom';

const MainContent = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const { state, setState, progress } = useVideo();

  const isWatchPage = pathname.includes('watch/tv') || pathname.includes('watch/movie');

  // Enable edge-swipe back navigation on mobile (disabled on watch pages to avoid conflicts)
  useSwipeBack({ enabled: !isWatchPage });

  // Continuously remember the last NON-watch page. Minimize returns here, so it
  // always lands on the page you came from — not router.back() (which walks back
  // through every episode you hopped to) and not a drifting "entry" snapshot.
  // Lives in MainContent because it's always mounted.
  useEffect(() => {
    const isWatch = pathname.includes('/protected/watch/');
    if (!isWatch) {
      setState((s) => (s.originUrl === pathname ? s : { ...s, originUrl: pathname }));
    }
  }, [pathname, setState]);

  // While the watch overlay is maximized, hide the origin page (YouTube-style)
  // behind the opaque overlay. We use `content-visibility: hidden` rather than
  // `display: none`: both skip rendering the hidden subtree (and collapse it, so
  // scroll behaves the same — hence we still save/restore scroll below), but
  // content-visibility PRESERVES the rendered layout/paint state, so REVEALING it
  // on minimize is a cheap repaint instead of a full relayout+repaint of the whole
  // page (hero + every card) in a single frame — which was a ~180ms freeze at the
  // start of the minimize morph. Old browsers ignore it and the opaque overlay
  // still covers the origin, so degradation is graceful.
  //
  // Gated on `progress` (≈0 = fully full), NOT `mode`, so the origin is revealed
  // *during* the minimize morph — the player shrinks toward its dock over the
  // origin page cross-dissolving in, instead of the page popping in only at the end.
  const [atFull, setAtFull] = useState(progress.get() < 0.02);
  useMotionValueEvent(progress, 'change', (v) => {
    const next = v < 0.02;
    setAtFull((prev) => (prev === next ? prev : next));
  });
  const hideOrigin = atFull && !!state.isOverlay;
  const scrollRef = useRef(0);
  const wasHiddenRef = useRef(false);

  useEffect(() => {
    const onScroll = () => {
      scrollRef.current = window.scrollY;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (hideOrigin) {
      wasHiddenRef.current = true;
    } else if (wasHiddenRef.current) {
      wasHiddenRef.current = false;
      const y = scrollRef.current;
      requestAnimationFrame(() => window.scrollTo(0, y));
    }
  }, [hideOrigin]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      if (process.env.NODE_ENV === 'development') {
        // In development, unregister any existing SW to prevent stale cache issues
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister();
          }
        });
      } else {
        navigator.serviceWorker.register('/sw.js').catch(() => {
          // Service worker registration failed silently
        });
      }
    }
  }, []);

  // Mobile bottom margin: enough to clear the bottom nav (h-20 = 80px + safe area buffer)
  // On watch pages, NavBottom is hidden so no margin needed
  const mobileBottomMargin = isWatchPage ? 'mb-0' : 'mb-20';

  // Top margin: clear the fixed Navbar (h-12 mobile, h-16 desktop).
  // The navbar is hidden on the watch surface, so a hard-loaded /watch page gets
  // no top offset — the player pins flush to the top like the soft-nav overlay.
  const topMargin = isWatchPage ? 'mt-0' : 'mt-12 md:mt-16';

  return (
    <>
      {/* Pull-to-refresh indicator (mobile only) */}
      {!isWatchPage && <PullToRefreshIndicator />}

      {/* single main wrapper — hidden (but kept mounted) while the watch overlay is up */}
      <main
        className={`${mobileBottomMargin} ${topMargin} w-full flex-1 md:mb-0`}
        style={
          hideOrigin
            ? // contain-intrinsic-size keeps the hidden page from collapsing to 0
              // (which would jump the scrollbar) while its render state is cached.
              { contentVisibility: 'hidden', containIntrinsicSize: 'auto 100vh' }
            : undefined
        }
      >
        {children}
      </main>

      {/* mobile bottom nav, hidden on desktop */}
      <NavBottom />

      {/* always-mounted shell */}
      <VideoShell />
    </>
  );
};

export default MainContent;
