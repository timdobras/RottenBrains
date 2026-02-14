'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface UseSwipeBackOptions {
  /** Width of the edge zone in pixels (default: 20) */
  edgeWidth?: number;
  /** Minimum swipe distance to trigger back navigation (default: 80) */
  threshold?: number;
  /** Whether swipe-back is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Edge-swipe back navigation hook for PWA mobile experience.
 * Detects a right-swipe from the left edge of the screen and triggers router.back().
 * Works on Firefox Android and all mobile browsers.
 */
export function useSwipeBack({
  edgeWidth = 20,
  threshold = 80,
  enabled = true,
}: UseSwipeBackOptions = {}) {
  const router = useRouter();
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isEdgeSwipe = useRef(false);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled) return;
      const touch = e.touches[0];

      // Only trigger from the left edge
      if (touch.clientX <= edgeWidth) {
        touchStartX.current = touch.clientX;
        touchStartY.current = touch.clientY;
        isEdgeSwipe.current = true;
      } else {
        isEdgeSwipe.current = false;
      }
    },
    [enabled, edgeWidth]
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!isEdgeSwipe.current || !enabled) return;
      isEdgeSwipe.current = false;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = Math.abs(touch.clientY - touchStartY.current);

      // Must be a horizontal swipe (deltaX > deltaY) and exceed threshold
      if (deltaX > threshold && deltaX > deltaY * 1.5) {
        router.back();
      }
    },
    [enabled, threshold, router]
  );

  useEffect(() => {
    if (!enabled) return;

    // Only attach on mobile-width screens
    const mq = window.matchMedia('(max-width: 767px)');
    if (!mq.matches) return;

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (!e.matches) {
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchend', handleTouchEnd);
      }
    };
    mq.addEventListener('change', handleMediaChange);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
      mq.removeEventListener('change', handleMediaChange);
    };
  }, [enabled, handleTouchStart, handleTouchEnd]);
}
