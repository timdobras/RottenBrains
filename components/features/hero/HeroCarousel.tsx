'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import type { EnrichedMediaItem } from '@/lib/tmdb/types';
import { API_CONFIG } from '@/lib/constants';
import { cn, getEnglishLogoPath, getMediaYear, getMediaDuration } from '@/lib/utils';
import ProgressiveImage from '@/components/features/media/ProgressiveImage';

interface HeroCarouselProps {
  media: EnrichedMediaItem[];
  children?: React.ReactNode;
}

/** Number of slides to render in the DOM (current ± 1) */
const VISIBLE_RANGE = 1;
const AUTOPLAY_INTERVAL = 6000;
const SWIPE_THRESHOLD = 50;

export default function HeroCarousel({ media, children }: HeroCarouselProps) {
  const top = useMemo(() => media.filter((m) => m.backdrop_path).slice(0, 10), [media]);

  const [current, setCurrent] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  // When the user is interacting (hover / touch / focus) we freeze autoplay so a
  // slide can't rotate out from under a click and send them to the wrong media.
  const isPausedRef = useRef(false);

  const stopAutoplay = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startAutoplay = useCallback(() => {
    stopAutoplay();
    if (isPausedRef.current || top.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % top.length);
    }, AUTOPLAY_INTERVAL);
  }, [stopAutoplay, top.length]);

  const pauseAutoplay = useCallback(() => {
    isPausedRef.current = true;
    stopAutoplay();
  }, [stopAutoplay]);

  const resumeAutoplay = useCallback(() => {
    isPausedRef.current = false;
    startAutoplay();
  }, [startAutoplay]);

  useEffect(() => {
    if (top.length <= 1) return;
    startAutoplay();
    return () => stopAutoplay();
  }, [startAutoplay, stopAutoplay, top.length]);

  const goTo = useCallback(
    (index: number) => {
      setCurrent(index);
      startAutoplay();
    },
    [startAutoplay]
  );

  const goNext = useCallback(() => goTo((current + 1) % top.length), [current, goTo, top.length]);

  const goPrev = useCallback(
    () => goTo((current - 1 + top.length) % top.length),
    [current, goTo, top.length]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      // Freeze rotation for the duration of the touch so the tapped slide
      // can't swap before the click resolves.
      pauseAutoplay();
      touchStartX.current = e.touches[0].clientX;
      touchEndX.current = e.touches[0].clientX;
    },
    [pauseAutoplay]
  );

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > SWIPE_THRESHOLD) {
      if (diff > 0) goNext();
      else goPrev();
    }
    resumeAutoplay();
  }, [goNext, goPrev, resumeAutoplay]);

  /**
   * Only render slides within VISIBLE_RANGE of the current index.
   * This keeps the DOM small and avoids loading 10 high-res images at once.
   */
  const isSlideVisible = useCallback(
    (index: number) => {
      if (top.length <= 3) return true; // small sets: render all
      const diff = Math.abs(index - current);
      return diff <= VISIBLE_RANGE || diff >= top.length - VISIBLE_RANGE;
    },
    [current, top.length]
  );

  if (top.length === 0) return null;

  return (
    <div className="flex w-full flex-col bg-background">
      {/* Hero carousel — full-bleed (no side gutter) so there are no white
          page margins framing the image in light mode */}
      <div className="w-full">
        <div
          className="relative h-[60vh] min-h-[420px] w-full overflow-hidden sm:h-auto sm:aspect-[4/3] md:aspect-video md:max-h-[80vh]"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={resumeAutoplay}
          onMouseEnter={pauseAutoplay}
          onMouseLeave={resumeAutoplay}
          onFocusCapture={pauseAutoplay}
          onBlurCapture={resumeAutoplay}
        >
          {/* Backdrop images — progressive loading, only active ± 1 rendered */}
          {top.map((m, i) => {
            if (!isSlideVisible(i)) return null;
            return (
              <div
                key={m.id}
                className={cn(
                  'absolute inset-0 transition-opacity duration-700',
                  i === current ? 'opacity-100' : 'opacity-0'
                )}
              >
                <ProgressiveImage
                  backdropPath={m.backdrop_path!}
                  alt={m.title || m.name || ''}
                  active={i === current}
                  hero
                />
              </div>
            );
          })}

          {/*
            Vignette overlays — ALWAYS dark in both themes (never theme-aware),
            so the hero stays a consistent cinematic black frame instead of
            washing out to white in light mode.

            Mobile: a single bottom->top scrim only (below), so the full-bleed
            image breathes at the top and is framed just from the bottom where
            the centered content sits.

            Desktop (sm+): a soft dark vignette on all edges + heavier left and
            bottom scrims behind the left-aligned title/CTAs. Later overlays
            paint on top, so the scrims win where the content lives.
          */}
          <div
            className="pointer-events-none absolute inset-0 hidden sm:block"
            style={{
              background: `
                linear-gradient(to right, rgba(0, 0, 0, 0.7) 0%, transparent 15%, transparent 85%, rgba(0, 0, 0, 0.7) 100%),
                linear-gradient(to bottom, rgba(0, 0, 0, 0.7) 0%, transparent 15%, transparent 85%, rgba(0, 0, 0, 0.7) 100%)
              `,
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 hidden sm:block"
            style={{
              background:
                'linear-gradient(to right, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.6) 20%, rgba(0, 0, 0, 0.25) 40%, transparent 60%)',
            }}
          />
          {/* Mobile: single bottom->top scrim only, so the image breathes at the top */}
          <div
            className="pointer-events-none absolute inset-0 block sm:hidden"
            style={{
              background:
                'linear-gradient(to top, rgba(0, 0, 0, 0.92) 0%, rgba(0, 0, 0, 0.7) 22%, rgba(0, 0, 0, 0.35) 45%, transparent 72%)',
            }}
          />
          {/* Desktop: bottom scrim behind the left-aligned content */}
          <div
            className="pointer-events-none absolute inset-0 hidden sm:block"
            style={{
              background:
                'linear-gradient(to top, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.5) 20%, transparent 45%)',
            }}
          />

          {/* Content overlay — one per visible slide */}
          {top.map((m, i) => {
            if (!isSlideVisible(i)) return null;

            const title = m.title || m.name || '';
            const logoPath = getEnglishLogoPath(m.images?.logos);
            const typeLabel = m.media_type === 'movie' ? 'Movie' : 'Series';
            const genres = m.genres?.slice(0, 2) || [];
            const year = getMediaYear(m);
            const duration = getMediaDuration(m);
            const rating = m.vote_average ? `★ ${m.vote_average.toFixed(1)}` : undefined;

            // Collect all pill items
            const pills = [
              typeLabel,
              ...genres.map((g: { id: number; name: string }) => g.name),
              year,
              duration,
              rating,
            ].filter(Boolean) as string[];

            return (
              <div
                key={m.id}
                className={cn(
                  'absolute inset-0 z-10 flex items-end justify-center px-4 pb-12 text-center transition-opacity duration-700 sm:items-center sm:justify-start sm:px-6 sm:pb-0 sm:text-left md:px-16 lg:px-24',
                  i === current
                    ? 'pointer-events-auto opacity-100'
                    : 'pointer-events-none opacity-0'
                )}
              >
                <div className="flex w-full max-w-3xl flex-col items-center gap-4 sm:w-auto sm:items-start sm:gap-4 md:gap-5">
                  {/* Logo or fallback title — displayed first and larger */}
                  <div className="flex h-24 w-full items-end justify-center sm:h-28 sm:w-[420px] sm:justify-start md:h-48 md:w-[600px]">
                    {logoPath ? (
                      <Image
                        src={`https://image.tmdb.org/t/p/${API_CONFIG.TMDB_IMAGE_SIZES.POSTER_LARGE}${logoPath}`}
                        alt={title}
                        width={600}
                        height={192}
                        className="max-h-full max-w-full object-contain object-center drop-shadow-lg sm:object-left"
                        unoptimized
                      />
                    ) : (
                      <h1 className="text-4xl font-bold text-white drop-shadow-lg sm:text-5xl md:text-7xl">
                        {title}
                      </h1>
                    )}
                  </div>

                  {/* Metadata pills */}
                  <div className="flex flex-wrap items-center justify-center gap-1.5 sm:justify-start sm:gap-2">
                    {pills.map((pill, idx) => (
                      <span
                        key={idx}
                        className="rounded-[4px] bg-white/15 px-2 py-[2px] text-xs font-medium text-white/80 backdrop-blur-sm sm:px-3 sm:py-1 sm:text-sm"
                      >
                        {pill}
                      </span>
                    ))}
                  </div>

                  {/* Description */}
                  <p className="line-clamp-2 text-xs text-white/80 drop-shadow sm:line-clamp-3 sm:h-[4.5em] sm:text-sm md:text-base">
                    {m.overview}
                  </p>

                  {/* CTAs */}
                  <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
                    <a
                      href={`/protected/watch/${m.media_type}/${m.id}`}
                      className="group flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-3.5 text-base font-semibold text-black shadow-lg shadow-black/30 transition-all duration-200 hover:shadow-xl hover:shadow-black/40 sm:w-auto sm:px-6 sm:py-3 sm:text-sm sm:hover:scale-105"
                    >
                      <svg
                        className="h-5 w-5 transition-transform duration-200 group-hover:scale-110 sm:h-4 sm:w-4"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Watch Now
                    </a>
                    <a
                      href={`/protected/media/${m.media_type}/${m.id}`}
                      className="flex w-full items-center justify-center rounded-lg border border-white/30 bg-white/10 px-4 py-3.5 text-base font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:border-white/50 hover:bg-white/20 sm:w-auto sm:px-6 sm:py-3 sm:text-sm"
                    >
                      More Info
                    </a>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Dot indicators */}
          {top.length > 1 && (
            <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 sm:bottom-6 sm:left-6 sm:translate-x-0 sm:gap-2 md:left-16 lg:left-24">
              {top.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className={cn(
                    'h-1 rounded-full transition-all duration-300 sm:h-1.5',
                    i === current
                      ? 'w-6 bg-white sm:w-8'
                      : 'w-1 bg-white/40 hover:bg-white/60 sm:w-1.5'
                  )}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Page sections below the carousel */}
      {children}
    </div>
  );
}
