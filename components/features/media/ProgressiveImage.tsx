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

/** 2-step for hero/featured: thumbnail -> large. Capped at w1280 (dropped the
 *  `original` step, which pulled multi-MB backdrops as the LCP element). */
const HERO_SIZES: ResolutionStep[] = [
  { key: 'low', size: API_CONFIG.TMDB_IMAGE_SIZES.BACKDROP_SMALL },
  { key: 'high', size: API_CONFIG.TMDB_IMAGE_SIZES.BACKDROP_LARGE },
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
  /** Use hero resolution ladder (w300 -> w1280) instead of the 2-step default */
  hero?: boolean;
  /**
   * LCP image (e.g. the first hero slide): render the high-quality src
   * immediately with fetchpriority=high — skipping the low→high JS ladder so
   * it's in the DOM on first paint and the browser prioritizes it.
   */
  priority?: boolean;
  className?: string;
}

export default function ProgressiveImage({
  backdropPath,
  alt,
  active = true,
  hero = false,
  priority = false,
  className,
}: ProgressiveImageProps) {
  // Track which resolution steps have been loaded, storing the URL for each
  const [loadedSteps, setLoadedSteps] = useState<Map<string, string>>(new Map());
  const sizes = hero ? HERO_SIZES : DEFAULT_SIZES;

  useEffect(() => {
    // Priority images render their src directly (below), so skip the JS ladder.
    if (!active || priority) return;

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
  }, [active, backdropPath, sizes, priority]);

  // Priority (LCP) path: render the top-quality src straight away with
  // fetchpriority=high — in the DOM on first paint, no low→high JS ladder.
  if (priority) {
    const topSize = sizes[sizes.length - 1].size;
    const url = `https://image.tmdb.org/t/p/${topSize}${backdropPath}`;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={alt}
        fetchPriority="high"
        decoding="async"
        className={cn('absolute inset-0 h-full w-full object-cover', className)}
      />
    );
  }

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
