'use client';

import React, { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import { useVideo } from '@/hooks/VideoProvider';
import VideoShell from '@/hooks/VideoShell';
import PullToRefreshIndicator from '../features/pwa/PullToRefreshIndicator';
import NavBottom from '../features/navigation/mobile/NavBottom';

const MainContent = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const { state, setState } = useVideo();

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

  // While the watch overlay is maximized, hide the origin page (YouTube-style:
  // it `display:none`s the page behind). It stays MOUNTED — so minimize is still
  // instant — but isn't painted or active behind the opaque overlay. display:none
  // collapses the document scroll, so we remember the scroll position while the
  // origin is visible and restore it when it comes back.
  const hideOrigin = state.mode === 'full' && !!state.isOverlay;
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

  // Top margin: clear the fixed Navbar (h-12 mobile, h-16 desktop)
  // Always applied since the navbar is visible on all pages including watch pages
  const topMargin = 'mt-12 md:mt-16';

  return (
    <>
      {/* Pull-to-refresh indicator (mobile only) */}
      {!isWatchPage && <PullToRefreshIndicator />}

      {/* single main wrapper — hidden (but kept mounted) while the watch overlay is up */}
      <main
        className={`${mobileBottomMargin} ${topMargin} w-full flex-1 md:mb-0`}
        style={{ display: hideOrigin ? 'none' : undefined }}
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
