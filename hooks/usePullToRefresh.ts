'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';

interface UsePullToRefreshOptions {
  /** Minimum pull distance in pixels to trigger refresh (default: 80) */
  threshold?: number;
  /** Whether pull-to-refresh is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Pull-to-refresh hook for PWA mobile experience.
 * Triggers a Next.js router.refresh() when the user pulls down from the top of the page.
 * Works on Firefox Android, Chrome, and Safari.
 */
export function usePullToRefresh({ threshold = 80, enabled = true }: UsePullToRefreshOptions = {}) {
  const router = useRouter();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled || isRefreshing) return;
      // Only activate when at the top of the page
      if (window.scrollY > 5) return;

      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    },
    [enabled, isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isPulling.current || !enabled || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const distance = currentY - touchStartY.current;

      // Only track downward pulls
      if (distance > 0 && window.scrollY <= 0) {
        // Apply resistance: the further you pull, the harder it gets
        const dampened = Math.min(distance * 0.4, threshold * 1.5);
        setPullDistance(dampened);
      } else {
        setPullDistance(0);
      }
    },
    [enabled, isRefreshing, threshold]
  );

  const handleTouchEnd = useCallback(() => {
    if (!isPulling.current) return;
    isPulling.current = false;

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(0);

      // Trigger refresh
      router.refresh();

      // Reset after a delay to allow the refresh to complete
      setTimeout(() => {
        setIsRefreshing(false);
      }, 1000);
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, threshold, isRefreshing, router]);

  useEffect(() => {
    if (!enabled) return;

    // Only attach on mobile-width screens
    const mq = window.matchMedia('(max-width: 767px)');
    if (!mq.matches) return;

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);

    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (!e.matches) {
        // Switched to desktop, clean up
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      }
    };
    mq.addEventListener('change', handleMediaChange);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      mq.removeEventListener('change', handleMediaChange);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    /** Current pull distance in pixels (0 when not pulling) */
    pullDistance,
    /** Whether a refresh is currently in progress */
    isRefreshing,
    /** Whether the pull threshold has been reached */
    isThresholdReached: pullDistance >= threshold,
  };
}
