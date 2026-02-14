'use client';

// MobileVideoContext.tsx
import React, { createContext, useState, useRef, useEffect, useCallback, useMemo } from 'react';

interface MobileVideoContextProps {
  currentPlayingMediaId: number | null;
  registerHoverImage: (mediaId: number, element: HTMLElement) => void;
  unregisterHoverImage: (mediaId: number) => void;
}

export const MobileVideoContext = createContext<MobileVideoContextProps>({
  currentPlayingMediaId: null,
  registerHoverImage: () => {},
  unregisterHoverImage: () => {},
});

export const MobileVideoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPlayingMediaId, setCurrentPlayingMediaId] = useState<number | null>(null);

  const hoverImageElements = useRef<Map<number, HTMLElement>>(new Map());
  const observer = useRef<IntersectionObserver | null>(null);
  // Use a ref to track currentPlayingMediaId inside the observer callback
  // This avoids recreating the observer every time currentPlayingMediaId changes
  const currentPlayingRef = useRef<number | null>(null);

  // Keep the ref in sync with state
  useEffect(() => {
    currentPlayingRef.current = currentPlayingMediaId;
  }, [currentPlayingMediaId]);

  useEffect(() => {
    // Disconnect existing observer if any
    if (observer.current) {
      observer.current.disconnect();
    }

    const observerCallback: IntersectionObserverCallback = (entries) => {
      const visibleEntries = entries.filter((entry) => {
        const rect = entry.boundingClientRect;
        const isFullyVisible = entry.intersectionRatio >= 0.99; // Adjusted for better detection
        const isInTopHalf = rect.top >= 0 && rect.bottom <= window.innerHeight * 0.5;
        return isFullyVisible && isInTopHalf;
      });

      if (visibleEntries.length > 0) {
        // Sort entries by top position
        const topVisibleEntry = visibleEntries.sort(
          (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
        )[0];

        const mediaId = parseInt((topVisibleEntry.target as HTMLElement).dataset.mediaId!);

        if (currentPlayingRef.current !== mediaId) {
          setCurrentPlayingMediaId(mediaId);
        }
      } else {
        if (currentPlayingRef.current !== null) {
          setCurrentPlayingMediaId(null);
        }
      }
    };

    observer.current = new IntersectionObserver(observerCallback, {
      threshold: [0.99], // Adjusted threshold
    });

    // Observe all registered elements
    hoverImageElements.current.forEach((element) => {
      observer.current!.observe(element);
    });

    return () => {
      observer.current!.disconnect();
    };
  }, []); // Empty dependency array — observer is created once

  const registerHoverImage = useCallback((mediaId: number, element: HTMLElement) => {
    hoverImageElements.current.set(mediaId, element);
    if (observer.current) {
      observer.current.observe(element);
    }
  }, []);

  const unregisterHoverImage = useCallback((mediaId: number) => {
    const element = hoverImageElements.current.get(mediaId);
    if (element && observer.current) {
      observer.current.unobserve(element);
    }
    hoverImageElements.current.delete(mediaId);
  }, []);

  const value = useMemo(
    () => ({
      currentPlayingMediaId,
      registerHoverImage,
      unregisterHoverImage,
    }),
    [currentPlayingMediaId, registerHoverImage, unregisterHoverImage]
  );

  return <MobileVideoContext.Provider value={value}>{children}</MobileVideoContext.Provider>;
};
