'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useTransition } from 'react';

/**
 * All URL param keys the discover page uses.
 * Centralized here so the sidebar and results stay in sync.
 */
export const DISCOVER_PARAM_KEYS = [
  'type',
  'sort_by',
  'with_genres',
  'year_gte',
  'year_lte',
  'vote_average.gte',
  'vote_average.lte',
  'vote_count.gte',
  'with_runtime.gte',
  'with_runtime.lte',
  'with_original_language',
  'with_origin_country',
  'with_keywords',
  'certification',
  'with_release_type',
  'with_status',
  'with_type',
  'with_networks',
  'with_companies',
] as const;

export type DiscoverParamKey = (typeof DISCOVER_PARAM_KEYS)[number];

/** Default values — only values that differ from "empty" need to be here */
export const DISCOVER_DEFAULTS: Partial<Record<DiscoverParamKey, string>> = {
  type: 'movie',
  sort_by: 'popularity.desc',
};

/**
 * Hook that reads discover filter state from URL search params
 * and provides helpers to update them.
 *
 * Every filter change triggers an immediate (shallow) URL update
 * and a React transition so the UI stays responsive.
 */
export function useDiscoverFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  // Debounce timer ref for range inputs
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  /** Read a single param, falling back to its default */
  const getParam = useCallback(
    (key: DiscoverParamKey): string => {
      return searchParams.get(key) ?? DISCOVER_DEFAULTS[key] ?? '';
    },
    [searchParams]
  );

  /** Current media type */
  const mediaType = (getParam('type') || 'movie') as 'movie' | 'tv';

  /**
   * Build a new URLSearchParams from the current ones,
   * applying a set of changes. Empty-string values remove the param.
   */
  const buildParams = useCallback(
    (changes: Partial<Record<DiscoverParamKey, string>>): URLSearchParams => {
      const next = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(changes)) {
        if (
          value === '' ||
          value === undefined ||
          value === null ||
          value === DISCOVER_DEFAULTS[key as DiscoverParamKey]
        ) {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      }

      return next;
    },
    [searchParams]
  );

  /** Push a new URL with the given param changes */
  const setParams = useCallback(
    (changes: Partial<Record<DiscoverParamKey, string>>) => {
      const next = buildParams(changes);
      const qs = next.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;

      startTransition(() => {
        router.push(url, { scroll: false });
      });
    },
    [buildParams, pathname, router]
  );

  /** Set a single param */
  const setParam = useCallback(
    (key: DiscoverParamKey, value: string) => {
      setParams({ [key]: value });
    },
    [setParams]
  );

  /**
   * Debounced set — useful for sliders / range inputs
   * so we don't push a URL update on every pixel drag.
   */
  const setParamDebounced = useCallback(
    (key: DiscoverParamKey, value: string, delay = 400) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setParam(key, value);
      }, delay);
    },
    [setParam]
  );

  /**
   * Toggle a value inside a separated list param (for multi-select).
   * @param separator — ',' for AND logic, '|' for OR logic (default ',')
   */
  const toggleInList = useCallback(
    (key: DiscoverParamKey, value: string, separator: ',' | '|' = ',') => {
      const current = getParam(key);
      const values = current ? current.split(separator) : [];
      const idx = values.indexOf(value);

      if (idx >= 0) {
        values.splice(idx, 1);
      } else {
        values.push(value);
      }

      setParam(key, values.join(separator));
    },
    [getParam, setParam]
  );

  /**
   * Check if a value exists in a separated list param.
   * @param separator — ',' for AND logic, '|' for OR logic (default ',')
   */
  const isInList = useCallback(
    (key: DiscoverParamKey, value: string, separator: ',' | '|' = ','): boolean => {
      const current = getParam(key);
      if (!current) return false;
      return current.split(separator).includes(value);
    },
    [getParam]
  );

  /** Clear all filters, optionally keeping media type */
  const clearAll = useCallback(
    (keepType = true) => {
      const next = new URLSearchParams();
      if (keepType) {
        const currentType = getParam('type');
        if (currentType && currentType !== 'movie') {
          next.set('type', currentType);
        }
      }
      const qs = next.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      startTransition(() => {
        router.push(url, { scroll: false });
      });
    },
    [getParam, pathname, router]
  );

  /** Check if any non-default filters are active */
  const hasActiveFilters = useMemo(() => {
    for (const key of DISCOVER_PARAM_KEYS) {
      if (key === 'type' || key === 'sort_by') continue;
      const val = searchParams.get(key);
      if (val && val !== DISCOVER_DEFAULTS[key]) return true;
    }
    // Also check if sort_by is non-default
    const sortBy = searchParams.get('sort_by');
    if (sortBy && sortBy !== 'popularity.desc') return true;
    return false;
  }, [searchParams]);

  /**
   * Build the TMDB API params object from current URL params.
   * Translates our URL keys to the TMDB discover API parameter names.
   */
  const apiParams = useMemo(() => {
    const params: Record<string, string | number | boolean> = {};

    const sortBy = getParam('sort_by');
    if (sortBy) params.sort_by = sortBy;

    const genres = getParam('with_genres');
    if (genres) params.with_genres = genres;

    const yearGte = getParam('year_gte');
    const yearLte = getParam('year_lte');

    if (mediaType === 'movie') {
      if (yearGte) params['primary_release_date.gte'] = `${yearGte}-01-01`;
      if (yearLte) params['primary_release_date.lte'] = `${yearLte}-12-31`;
    } else {
      if (yearGte) params['first_air_date.gte'] = `${yearGte}-01-01`;
      if (yearLte) params['first_air_date.lte'] = `${yearLte}-12-31`;
    }

    const voteGte = getParam('vote_average.gte');
    if (voteGte) params['vote_average.gte'] = Number(voteGte);

    const voteLte = getParam('vote_average.lte');
    if (voteLte) params['vote_average.lte'] = Number(voteLte);

    const voteCountGte = getParam('vote_count.gte');
    if (voteCountGte) params['vote_count.gte'] = Number(voteCountGte);

    const runtimeGte = getParam('with_runtime.gte');
    if (runtimeGte) params['with_runtime.gte'] = Number(runtimeGte);

    const runtimeLte = getParam('with_runtime.lte');
    if (runtimeLte) params['with_runtime.lte'] = Number(runtimeLte);

    const lang = getParam('with_original_language');
    if (lang) params.with_original_language = lang;

    const country = getParam('with_origin_country');
    if (country) params.with_origin_country = country;

    const keywords = getParam('with_keywords');
    if (keywords) params.with_keywords = keywords;

    // Movie-only
    if (mediaType === 'movie') {
      const cert = getParam('certification');
      if (cert) {
        params.certification = cert;
        params.certification_country = 'US';
      }
      const releaseType = getParam('with_release_type');
      if (releaseType) params.with_release_type = releaseType;
    }

    // TV-only
    if (mediaType === 'tv') {
      const status = getParam('with_status');
      if (status) params.with_status = status;

      const type = getParam('with_type');
      if (type) params.with_type = type;

      const networks = getParam('with_networks');
      if (networks) params.with_networks = networks;
    }

    // Both movie and TV
    const companies = getParam('with_companies');
    if (companies) params.with_companies = companies;

    return params;
  }, [getParam, mediaType]);

  return {
    // State
    mediaType,
    isPending,
    hasActiveFilters,
    apiParams,

    // Getters
    getParam,
    searchParams,

    // Setters
    setParam,
    setParams,
    setParamDebounced,
    toggleInList,
    isInList,
    clearAll,
  };
}
