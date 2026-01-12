import { isOfflineMode } from '@/lib/mocks/config';
import { getMockTMDBData } from '@/lib/mocks/tmdb';
import { logger } from '@/lib/logger';

const API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY!;
const BASE_URL = 'https://api.themoviedb.org/3';

// In-memory cache with TTL for TMDB API responses
interface CacheEntry {
  data: any;
  expiresAt: number;
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_CACHE_SIZE = 500;
const FETCH_TIMEOUT_MS = 15000; // 15 second timeout for API calls

const tmdbCache = new Map<string, CacheEntry>();
const pendingRequests = new Map<string, Promise<any>>();

// Simple cache management - remove oldest entries when cache is full
function pruneCache() {
  if (tmdbCache.size >= MAX_CACHE_SIZE) {
    // Remove ~20% oldest entries
    const entriesToRemove = Math.floor(MAX_CACHE_SIZE * 0.2);
    const keys = Array.from(tmdbCache.keys()).slice(0, entriesToRemove);
    keys.forEach((key) => tmdbCache.delete(key));
  }
}

export const fetchFromApi = async (
  endpoint: string,
  append_to_response?: string,
  cached: boolean = true // Control cache dynamically
): Promise<any> => {
  // Check offline mode first - return mock data if enabled
  if (isOfflineMode()) {
    return getMockTMDBData(endpoint, append_to_response);
  }

  // Build cache key
  const cacheKey = append_to_response ? `${endpoint}:${append_to_response}` : endpoint;

  // Check in-memory cache first (only if caching is enabled)
  if (cached) {
    const cachedEntry = tmdbCache.get(cacheKey);
    if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
      return cachedEntry.data;
    }

    // Deduplicate concurrent requests to the same endpoint
    const pendingRequest = pendingRequests.get(cacheKey);
    if (pendingRequest) {
      return pendingRequest;
    }
  }

  let url = `${BASE_URL}/${endpoint}&api_key=${API_KEY}`;

  if (append_to_response) {
    url = `${BASE_URL}/${endpoint}&api_key=${API_KEY}&append_to_response=${append_to_response}`;
  }

  // Set Cache-Control header based on `cached` parameter
  const cacheControl = cached
    ? 'max-age=2592000, must-revalidate' // Cache for 30 days if cached is true
    : 'no-store'; // Disable caching if cached is false

  const fetchPromise = (async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        headers: {
          'Cache-Control': cacheControl,
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        logger.warn(`TMDB API Error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      // Store in cache if caching is enabled
      if (cached && result) {
        pruneCache();
        tmdbCache.set(cacheKey, {
          data: result,
          expiresAt: Date.now() + CACHE_TTL_MS,
        });
      }

      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        logger.warn(`TMDB API timeout: ${endpoint}`);
        // Return null on timeout instead of throwing - let callers handle gracefully
        return null;
      } else {
        logger.error(`Failed to fetch from API: ${endpoint}`, error);
        // Return null on error to prevent cascading failures
        return null;
      }
    } finally {
      // Remove from pending requests
      pendingRequests.delete(cacheKey);
    }
  })();

  // Track pending request to prevent duplicates
  if (cached) {
    pendingRequests.set(cacheKey, fetchPromise);
  }

  return fetchPromise;
};

// Utility to clear cache (useful for testing or forced refresh)
export const clearTMDBCache = () => {
  tmdbCache.clear();
  pendingRequests.clear();
};
