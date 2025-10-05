/**
 * Reusable infinite scroll hook
 * Handles common infinite scrolling logic with intersection observer
 */

import { useState, useEffect, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import { logger } from '@/lib/logger';
import { PAGINATION } from '@/lib/constants';

interface UseInfiniteScrollOptions<T> {
  /**
   * Function to fetch data for a given page
   */
  fetchFunction: (page: number) => Promise<T[]>;

  /**
   * Initial page number (default: 1)
   */
  initialPage?: number;

  /**
   * Maximum number of pages to load (default: 10)
   */
  maxPages?: number;

  /**
   * Intersection observer threshold (default: 0.1)
   */
  threshold?: number;

  /**
   * Root margin for intersection observer (default: "200px")
   */
  rootMargin?: string;

  /**
   * Enable debug logging
   */
  debug?: boolean;

  /**
   * Callback when all data is loaded
   */
  onComplete?: () => void;

  /**
   * Callback on error
   */
  onError?: (error: Error) => void;
}

interface UseInfiniteScrollReturn<T> {
  /**
   * Array of loaded items
   */
  items: T[];

  /**
   * Loading state
   */
  loading: boolean;

  /**
   * Whether more items are available
   */
  hasMore: boolean;

  /**
   * Current page number
   */
  page: number;

  /**
   * Ref to attach to the sentinel element
   */
  ref: (node?: Element | null) => void;

  /**
   * Whether the sentinel is in view
   */
  inView: boolean;

  /**
   * Manually trigger loading more items
   */
  loadMore: () => Promise<void>;

  /**
   * Reset the infinite scroll state
   */
  reset: () => void;

  /**
   * Error if any occurred
   */
  error: Error | null;
}

/**
 * Hook for implementing infinite scroll
 *
 * @example
 * ```tsx
 * const { items, loading, hasMore, ref } = useInfiniteScroll({
 *   fetchFunction: (page) => fetchMedia(page),
 *   maxPages: 10,
 * });
 *
 * return (
 *   <div>
 *     {items.map(item => <MediaCard key={item.id} media={item} />)}
 *     {hasMore && <div ref={ref}>Loading...</div>}
 *   </div>
 * );
 * ```
 */
export function useInfiniteScroll<T>({
  fetchFunction,
  initialPage = 1,
  maxPages = PAGINATION.MAX_PAGES,
  threshold = PAGINATION.INFINITE_SCROLL_THRESHOLD,
  rootMargin = PAGINATION.INFINITE_SCROLL_ROOT_MARGIN,
  debug = false,
  onComplete,
  onError,
}: UseInfiniteScrollOptions<T>): UseInfiniteScrollReturn<T> {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { ref, inView } = useInView({
    threshold,
    rootMargin,
  });

  const loadMore = useCallback(async () => {
    // Prevent multiple simultaneous requests
    if (loading || !hasMore) {
      return;
    }

    // Check if we've reached max pages
    if (page > maxPages) {
      setHasMore(false);
      onComplete?.();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (debug) {
        logger.debug(`Loading page ${page}...`);
      }

      const results = await fetchFunction(page);

      if (debug) {
        logger.debug(`Loaded ${results.length} items from page ${page}`);
      }

      // No more results, we're done
      if (results.length === 0) {
        setHasMore(false);
        onComplete?.();
        return;
      }

      // Append new results to existing items
      setItems((prev) => [...prev, ...results]);
      setPage((prev) => prev + 1);

      // If we got fewer results than expected, we might be at the end
      // This is optional and depends on your API behavior
      if (results.length < PAGINATION.MEDIA_PER_PAGE) {
        setHasMore(false);
        onComplete?.();
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load more items');
      logger.error('Error in infinite scroll:', error);
      setError(error);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page, maxPages, fetchFunction, debug, onComplete, onError]);

  // Reset function to clear all state
  const reset = useCallback(() => {
    setItems([]);
    setPage(initialPage);
    setLoading(false);
    setHasMore(true);
    setError(null);
  }, [initialPage]);

  // Trigger loadMore when sentinel comes into view
  useEffect(() => {
    if (inView && hasMore && !loading) {
      loadMore();
    }
  }, [inView, hasMore, loading, loadMore]);

  return {
    items,
    loading,
    hasMore,
    page,
    ref,
    inView,
    loadMore,
    reset,
    error,
  };
}

/**
 * Simplified version for common use cases
 * Automatically handles the most common configuration
 */
export function useSimpleInfiniteScroll<T>(
  fetchFunction: (page: number) => Promise<T[]>
): UseInfiniteScrollReturn<T> {
  return useInfiniteScroll({
    fetchFunction,
  });
}
