'use client';

import React, { useEffect, useState } from 'react';
import { API_CONFIG } from '@/lib/constants';
import { cn } from '@/lib/utils';

type ResolutionStep = {
  key: string;
  size: string;
};

/** Default 2-step: thumbnail -> large */
const DEFAULT_SIZES: ResolutionStep[] = [
  { key: 'low', size: API_CONFIG.TMDB_IMAGE_SIZES.BACKDROP_SMALL },
  { key: 'high', size: API_CONFIG.TMDB_IMAGE_SIZES.BACKDROP_LARGE },
];

/** 3-step for hero/featured: thumbnail -> large -> original */
const HERO_SIZES: ResolutionStep[] = [
  { key: 'low', size: API_CONFIG.TMDB_IMAGE_SIZES.BACKDROP_SMALL },
  { key: 'med', size: API_CONFIG.TMDB_IMAGE_SIZES.BACKDROP_LARGE },
  { key: 'high', size: API_CONFIG.TMDB_IMAGE_SIZES.BACKDROP_ORIGINAL },
];

interface ProgressiveImageProps {
  /** TMDB backdrop path (e.g. "/abc123.jpg") */
  backdropPath: string;
  alt: string;
  /**
   * When false, no images are loaded (useful for off-screen carousel slides).
   * Defaults to true.
   */
  active?: boolean;
  /** Use 3-step hero resolution (w300 -> w1280 -> original) instead of 2-step */
  hero?: boolean;
  className?: string;
}

export default function ProgressiveImage({
  backdropPath,
  alt,
  active = true,
  hero = false,
  className,
}: ProgressiveImageProps) {
  // Track which resolution steps have been loaded, storing the URL for each
  const [loadedSteps, setLoadedSteps] = useState<Map<string, string>>(new Map());
  const sizes = hero ? HERO_SIZES : DEFAULT_SIZES;

  useEffect(() => {
    if (!active) return;

    let cancelled = false;

    const loadInOrder = async () => {
      for (const step of sizes) {
        if (cancelled) break;
        const url = `https://image.tmdb.org/t/p/${step.size}${backdropPath}`;
        await new Promise<void>((resolve) => {
          const img = new window.Image();
          img.src = url;
          img.onload = () => {
            if (!cancelled) {
              setLoadedSteps((prev) => {
                const next = new Map(prev);
                next.set(step.key, url);
                return next;
              });
            }
            resolve();
          };
          img.onerror = () => resolve();
        });
      }
    };

    loadInOrder();
    return () => {
      cancelled = true;
    };
  }, [active, backdropPath, sizes]);

  // Only render <img> tags for steps that have actually been loaded.
  // This prevents the browser from firing network requests for higher-res
  // images before the lower-res ones have finished loading.
  return (
    <>
      {sizes.map((step) => {
        const url = loadedSteps.get(step.key);
        if (!url) return null;

        return (
          <img
            key={step.key}
            src={url}
            alt={alt}
            className={cn(
              'absolute inset-0 h-full w-full object-cover transition-opacity duration-500',
              'opacity-100',
              className
            )}
          />
        );
      })}
    </>
  );
}
