'use client';

import React, { useEffect, useState } from 'react';
import { useSidebar } from '@/hooks/SidebarContext';
import VideoShell from '@/hooks/VideoShell';
import TopLoader from '../features/loaders/TopLoader';
import Sidebar from '../features/navigation/desktop/Sidebar';
import NavBottom from '../features/navigation/mobile/NavBottom';

const MainContent = ({ children }: { children: React.ReactNode }) => {
  const { isSidebarOpen } = useSidebar();
  const [mounted, setMounted] = useState(false);

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

  return (
    <>
      {/* desktop sidebar, hidden on mobile */}
      <Sidebar />

      {/* single main wrapper */}
      <main className={`mb-52 w-full flex-1 md:mb-0 md:mt-20 md:pl-4 md:pr-8 ${desktopPadding} `}>
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
