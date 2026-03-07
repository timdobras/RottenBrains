import { fetchFromApi } from './tmdbApi';
import type { DiscoverParams, TMDBPaginatedResponse, TMDBKeyword } from './types';

/**
 * General-purpose discover function that accepts all TMDB discover API parameters.
 * Works for both movie and TV endpoints.
 */
export const discoverMedia = async (
  mediaType: 'movie' | 'tv',
  params: DiscoverParams = {}
): Promise<TMDBPaginatedResponse> => {
  const queryParts: string[] = [];

  // Set defaults
  if (params.include_adult === undefined) queryParts.push('include_adult=false');
  if (!params.language) queryParts.push('language=en-US');

  // Build query string from all provided params
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    queryParts.push(`${key}=${encodeURIComponent(String(value))}`);
  }

  const queryString = queryParts.join('&');
  const endpoint = `discover/${mediaType}?${queryString}`;

  const result = await fetchFromApi(endpoint);
  return result ?? { page: 1, results: [], total_pages: 0, total_results: 0 };
};

/**
 * Search for keywords by name (for the keyword filter).
 * Returns a paginated list of keyword objects.
 */
export const searchKeywords = async (
  query: string,
  page: number = 1
): Promise<TMDBPaginatedResponse<TMDBKeyword>> => {
  const result = await fetchFromApi(
    `search/keyword?query=${encodeURIComponent(query)}&page=${page}`
  );
  return result ?? { page: 1, results: [], total_pages: 0, total_results: 0 };
};

/**
 * Fetch a single keyword by ID to resolve its name.
 * Used to hydrate keyword names when loading from URL params.
 */
export const fetchKeywordById = async (id: number): Promise<TMDBKeyword | null> => {
  const result = await fetchFromApi(`keyword/${id}?placeholder=1`);
  return result ?? null;
};
