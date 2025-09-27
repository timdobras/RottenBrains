"use client";

// MobileVideoContext.tsx
import React, { createContext, useState, useRef, useEffect } from "react";

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

export const MobileVideoProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentPlayingMediaId, setCurrentPlayingMediaId] = useState<
    number | null
  >(null);

  const hoverImageElements = useRef<Map<number, HTMLElement>>(new Map());
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Disconnect existing observer if any
    if (observer.current) {
      observer.current.disconnect();
    }

    const observerCallback: IntersectionObserverCallback = (entries) => {
      const visibleEntries = entries.filter((entry) => {
        const rect = entry.boundingClientRect;
        const isFullyVisible = entry.intersectionRatio >= 0.99; // Adjusted for better detection
        const isInTopHalf =
          rect.top >= 0 && rect.bottom <= window.innerHeight * 0.5;
        return isFullyVisible && isInTopHalf;
      });

      if (visibleEntries.length > 0) {
        // Sort entries by top position
        const topVisibleEntry = visibleEntries.sort(
          (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
        )[0];

        const mediaId = parseInt(
          (topVisibleEntry.target as HTMLElement).dataset.mediaId!,
        );

        if (currentPlayingMediaId !== mediaId) {
          setCurrentPlayingMediaId(mediaId);
        }
      } else {
        if (currentPlayingMediaId !== null) {
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
  }, [currentPlayingMediaId]);

  const registerHoverImage = (mediaId: number, element: HTMLElement) => {
    hoverImageElements.current.set(mediaId, element);
    if (observer.current) {
      observer.current.observe(element);
    }
  };

  const unregisterHoverImage = (mediaId: number) => {
    const element = hoverImageElements.current.get(mediaId);
    if (element && observer.current) {
      observer.current.unobserve(element);
    }
    hoverImageElements.current.delete(mediaId);
  };

  return (
    <MobileVideoContext.Provider
      value={{
        currentPlayingMediaId,
        registerHoverImage,
        unregisterHoverImage,
      }}
    >
      {children}
    </MobileVideoContext.Provider>
  );
};
