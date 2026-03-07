'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import MediaCardClient from '@/components/features/media/MediaCardClient';
import HomeMediaCardSkeleton from '@/components/features/media/MediaCardSkeleton';
import { useDiscoverFilters } from '@/hooks/useDiscoverFilters';
import { useUser } from '@/hooks/UserContext';
import { logger } from '@/lib/logger';
import { discoverMedia } from '@/lib/tmdb/discover';

interface MediaResult {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  [key: string]: unknown;
}

/**
 * Results grid for the discover page.
 * Fetches data from TMDB discover API based on current URL filters.
 * Uses infinite scroll to load more pages.
 */
export default function DiscoverResults() {
  const { mediaType, apiParams, searchParams } = useDiscoverFilters();
  const { user } = useUser();

  const [results, setResults] = useState<MediaResult[]>([]);
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track the current filter fingerprint to detect changes
  const filterFingerprint = searchParams.toString();

  const { ref: sentinelRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: '400px',
  });

  // Fetch a page of results
  const fetchPage = useCallback(
    async (pageNum: number, isNewSearch: boolean) => {
      try {
        if (isNewSearch) {
          setLoading(true);
          setError(null);
        } else {
          setLoadingMore(true);
        }

        const data = await discoverMedia(mediaType, {
          ...apiParams,
          page: pageNum,
        });

        if (!data || !data.results) {
          if (isNewSearch) {
            setResults([]);
            setTotalResults(0);
            setTotalPages(0);
          }
          setHasMore(false);
          return;
        }

        if (isNewSearch) {
          setResults(data.results);
        } else {
          // Deduplicate by id when appending pages
          setResults((prev) => {
            const existingIds = new Set(prev.map((r) => r.id));
            const newItems = data.results.filter((r: MediaResult) => !existingIds.has(r.id));
            return [...prev, ...newItems];
          });
        }

        setTotalResults(data.total_results);
        setTotalPages(data.total_pages);
        setHasMore(pageNum < data.total_pages && pageNum < 500); // TMDB max is 500 pages
      } catch (err) {
        logger.error('Error fetching discover results:', err);
        const message =
          err instanceof Error ? err.message : 'Something went wrong while fetching results.';
        if (isNewSearch) {
          setResults([]);
          setTotalResults(0);
          setError(message);
        }
        setHasMore(false);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [mediaType, apiParams]
  );

  // When filters change, reset and fetch page 1
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    setError(null);
    fetchPage(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterFingerprint]);

  // Infinite scroll: load next page when sentinel is in view
  useEffect(() => {
    if (inView && hasMore && !loading && !loadingMore && page < (totalPages || 500)) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPage(nextPage, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  // Loading state (initial)
  if (loading) {
    return (
      <div className="flex w-full flex-col gap-4">
        <div className="h-6 w-48 animate-pulse rounded bg-foreground/10" />
        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 [&>div]:min-w-0 [&>div]:max-w-full">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="w-full overflow-hidden">
              <HomeMediaCardSkeleton />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <svg
          className="mb-4 h-16 w-16 text-foreground/20"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
        <h3 className="text-lg font-semibold text-foreground/60">Something went wrong</h3>
        <p className="mt-1 max-w-md text-sm text-foreground/40">{error}</p>
        <button
          onClick={() => {
            setError(null);
            setHasMore(true);
            fetchPage(1, true);
          }}
          className="mt-4 rounded-lg bg-foreground/10 px-6 py-2 text-sm font-medium transition hover:bg-foreground/20"
        >
          Try again
        </button>
      </div>
    );
  }

  // Empty state
  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <svg
          className="mb-4 h-16 w-16 text-foreground/20"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <h3 className="text-lg font-semibold text-foreground/60">No results found</h3>
        <p className="mt-1 text-sm text-foreground/40">
          Try adjusting your filters to find what you&apos;re looking for.
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {/* Results grid */}
      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 [&>div]:min-w-0 [&>div]:max-w-full [&_article]:min-w-0 [&_article]:max-w-full">
        {results.map((item) => (
          <div key={`${mediaType}-${item.id}`} className="w-full">
            <MediaCardClient
              media_type={mediaType}
              media_id={item.id}
              user_id={user?.id ? String(user.id) : undefined}
            />
          </div>
        ))}
      </div>

      {/* Loading more indicator */}
      {loadingMore && (
        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 [&>div]:min-w-0 [&>div]:max-w-full">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`skeleton-${i}`} className="w-full overflow-hidden">
              <HomeMediaCardSkeleton />
            </div>
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      {hasMore && <div ref={sentinelRef} className="h-4" />}

      {/* End of results */}
      {!hasMore && results.length > 0 && (
        <p className="py-8 text-center text-sm text-foreground/30">End of results</p>
      )}
    </div>
  );
}
