'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSidebar } from '@/hooks/SidebarContext';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import VideoShell from '@/hooks/VideoShell';
import PullToRefreshIndicator from '../features/pwa/PullToRefreshIndicator';
import Sidebar from '../features/navigation/desktop/Sidebar';
import NavBottom from '../features/navigation/mobile/NavBottom';
import NavTop from '../features/navigation/mobile/NavTop';

const MainContent = ({ children }: { children: React.ReactNode }) => {
  const { isSidebarOpen } = useSidebar();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  const isWatchPage = pathname.includes('watch/tv') || pathname.includes('watch/movie');

  // Enable edge-swipe back navigation on mobile (disabled on watch pages to avoid conflicts)
  useSwipeBack({ enabled: !isWatchPage });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Service worker registration failed silently
      });
    }
  }, []);

  // Only care about sidebar state on desktop (lg+)
  const desktopPadding = mounted
    ? isSidebarOpen
      ? 'md:ml-52 md:max-w-[calc(100vw-208px)]'
      : 'md:ml-24 md:max-w-[calc(100vw-96px)]'
    : 'md:ml-24 md:max-w-[calc(100vw-96px)]';

  // Mobile bottom margin: enough to clear the bottom nav (h-14 = 56px + safe area buffer)
  // On watch pages, NavBottom is hidden so no margin needed
  const mobileBottomMargin = isWatchPage ? 'mb-0' : 'mb-20';

  // Mobile top margin: clear the fixed NavTop (h-12 = 48px)
  // On watch pages, NavTop is hidden and MediaEmbed handles its own top bar
  const mobileTopMargin = isWatchPage ? 'mt-0' : 'mt-12';

  return (
    <>
      {/* Pull-to-refresh indicator (mobile only) */}
      {!isWatchPage && <PullToRefreshIndicator />}

      {/* mobile top nav, hidden on desktop and watch pages */}
      {!isWatchPage && <NavTop />}

      {/* desktop sidebar, hidden on mobile */}
      <Sidebar />

      {/* single main wrapper */}
      <main
        className={`${mobileBottomMargin} ${mobileTopMargin} w-full flex-1 md:mb-0 md:mt-20 md:pl-4 md:pr-8 ${desktopPadding} `}
      >
        {children}
      </main>

      {/* mobile nav, hidden on desktop */}
      <NavBottom />

      {/* always-mounted shell */}
      <VideoShell />
    </>
  );
};

export default MainContent;
