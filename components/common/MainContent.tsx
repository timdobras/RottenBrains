'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import VideoShell from '@/hooks/VideoShell';
import PullToRefreshIndicator from '../features/pwa/PullToRefreshIndicator';
import NavBottom from '../features/navigation/mobile/NavBottom';

const MainContent = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();

  const isWatchPage = pathname.includes('watch/tv') || pathname.includes('watch/movie');

  // Enable edge-swipe back navigation on mobile (disabled on watch pages to avoid conflicts)
  useSwipeBack({ enabled: !isWatchPage });

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Service worker registration failed silently
      });
    }
  }, []);

  // Mobile bottom margin: enough to clear the bottom nav (h-20 = 80px + safe area buffer)
  // On watch pages, NavBottom is hidden so no margin needed
  const mobileBottomMargin = isWatchPage ? 'mb-0' : 'mb-20';

  // Top margin: clear the fixed Navbar (h-14 mobile, h-16 desktop)
  // Always applied since the navbar is visible on all pages including watch pages
  const topMargin = 'mt-14 md:mt-16';

  return (
    <>
      {/* Pull-to-refresh indicator (mobile only) */}
      {!isWatchPage && <PullToRefreshIndicator />}

      {/* single main wrapper */}
      <main className={`${mobileBottomMargin} ${topMargin} w-full flex-1 md:mb-0`}>{children}</main>

      {/* mobile bottom nav, hidden on desktop */}
      <NavBottom />

      {/* always-mounted shell */}
      <VideoShell />
    </>
  );
};

export default MainContent;
