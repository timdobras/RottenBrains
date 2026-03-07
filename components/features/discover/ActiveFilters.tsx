'use client';

import React, { useMemo } from 'react';
import { useDiscoverFilters, DISCOVER_DEFAULTS } from '@/hooks/useDiscoverFilters';
import movieGenresData from '@/lib/constants/movie_genres.json';
import tvGenresData from '@/lib/constants/tv_genres.json';
import {
  SORT_LABELS,
  LANGUAGE_LABELS,
  COUNTRY_LABELS,
  TV_STATUS_LABELS,
  TV_TYPE_LABELS,
  RELEASE_TYPE_LABELS,
} from '@/lib/constants/discover';
import { STUDIOS, NETWORKS } from '@/lib/constants';

// Build genre lookup maps
const movieGenreMap = new Map(movieGenresData.genres.map((g) => [String(g.id), g.name]));
const tvGenreMap = new Map(tvGenresData.genres.map((g) => [String(g.id), g.name]));

// Build studio/network lookup maps
const studioMap = new Map(STUDIOS.map((s) => [String(s.id), s.name]));
const networkMap = new Map(NETWORKS.map((n) => [String(n.id), n.name]));

interface FilterChip {
  key: string;
  label: string;
  onRemove: () => void;
}

/**
 * Displays active filters as removable chips.
 * Shown between the filter sidebar and the results grid.
 */
export default function ActiveFilters() {
  const { mediaType, getParam, setParam, setParams, clearAll, hasActiveFilters } =
    useDiscoverFilters();

  const genreMap = mediaType === 'movie' ? movieGenreMap : tvGenreMap;

  const chips = useMemo<FilterChip[]>(() => {
    const items: FilterChip[] = [];

    // Sort
    const sortBy = getParam('sort_by');
    if (sortBy && sortBy !== (DISCOVER_DEFAULTS.sort_by ?? 'popularity.desc')) {
      items.push({
        key: 'sort_by',
        label: `Sort: ${SORT_LABELS[sortBy] || sortBy}`,
        onRemove: () => setParam('sort_by', ''),
      });
    }

    // Genres (comma-separated = AND logic)
    const genres = getParam('with_genres');
    if (genres) {
      genres.split(',').forEach((id) => {
        items.push({
          key: `genre-${id}`,
          label: genreMap.get(id) || `Genre ${id}`,
          onRemove: () => {
            const remaining = genres
              .split(',')
              .filter((g) => g !== id)
              .join(',');
            setParam('with_genres', remaining);
          },
        });
      });
    }

    // Year range — use batch setParams to avoid double URL push
    const yearGte = getParam('year_gte');
    const yearLte = getParam('year_lte');
    if (yearGte || yearLte) {
      const label =
        yearGte && yearLte
          ? `${yearGte} — ${yearLte}`
          : yearGte
            ? `From ${yearGte}`
            : `Until ${yearLte}`;
      items.push({
        key: 'year',
        label: `Year: ${label}`,
        onRemove: () => setParams({ year_gte: '', year_lte: '' }),
      });
    }

    // Rating — use batch setParams to avoid double URL push
    const voteGte = getParam('vote_average.gte');
    const voteLte = getParam('vote_average.lte');
    if (voteGte || voteLte) {
      const parts = [];
      if (voteGte) parts.push(`>= ${voteGte}`);
      if (voteLte) parts.push(`<= ${voteLte}`);
      items.push({
        key: 'rating',
        label: `Rating: ${parts.join(', ')}`,
        onRemove: () => setParams({ 'vote_average.gte': '', 'vote_average.lte': '' }),
      });
    }

    // Vote count
    const voteCountGte = getParam('vote_count.gte');
    if (voteCountGte) {
      items.push({
        key: 'vote_count',
        label: `Min ${voteCountGte} votes`,
        onRemove: () => setParam('vote_count.gte', ''),
      });
    }

    // Runtime — use batch setParams to avoid double URL push
    const runtimeGte = getParam('with_runtime.gte');
    const runtimeLte = getParam('with_runtime.lte');
    if (runtimeGte || runtimeLte) {
      const parts = [];
      if (runtimeGte) parts.push(`>= ${runtimeGte}min`);
      if (runtimeLte) parts.push(`<= ${runtimeLte}min`);
      items.push({
        key: 'runtime',
        label: `Runtime: ${parts.join(', ')}`,
        onRemove: () => setParams({ 'with_runtime.gte': '', 'with_runtime.lte': '' }),
      });
    }

    // Language
    const lang = getParam('with_original_language');
    if (lang) {
      items.push({
        key: 'language',
        label: `Language: ${LANGUAGE_LABELS[lang] || lang}`,
        onRemove: () => setParam('with_original_language', ''),
      });
    }

    // Country
    const country = getParam('with_origin_country');
    if (country) {
      items.push({
        key: 'country',
        label: `Country: ${COUNTRY_LABELS[country] || country}`,
        onRemove: () => setParam('with_origin_country', ''),
      });
    }

    // Certification (movie)
    const cert = getParam('certification');
    if (cert && mediaType === 'movie') {
      items.push({
        key: 'cert',
        label: `Rated ${cert}`,
        onRemove: () => setParam('certification', ''),
      });
    }

    // Release type (movie) — show individual labels
    const releaseType = getParam('with_release_type');
    if (releaseType && mediaType === 'movie') {
      releaseType.split('|').forEach((rt) => {
        items.push({
          key: `release_type-${rt}`,
          label: RELEASE_TYPE_LABELS[rt] || `Release type ${rt}`,
          onRemove: () => {
            const remaining = releaseType
              .split('|')
              .filter((x) => x !== rt)
              .join('|');
            setParam('with_release_type', remaining);
          },
        });
      });
    }

    // TV Status
    const status = getParam('with_status');
    if (status && mediaType === 'tv') {
      status.split('|').forEach((s) => {
        items.push({
          key: `status-${s}`,
          label: TV_STATUS_LABELS[s] || `Status ${s}`,
          onRemove: () => {
            const remaining = status
              .split('|')
              .filter((x) => x !== s)
              .join('|');
            setParam('with_status', remaining);
          },
        });
      });
    }

    // TV Type
    const tvType = getParam('with_type');
    if (tvType && mediaType === 'tv') {
      tvType.split('|').forEach((t) => {
        items.push({
          key: `type-${t}`,
          label: TV_TYPE_LABELS[t] || `Type ${t}`,
          onRemove: () => {
            const remaining = tvType
              .split('|')
              .filter((x) => x !== t)
              .join('|');
            setParam('with_type', remaining);
          },
        });
      });
    }

    // Studio / Company
    const companies = getParam('with_companies');
    if (companies) {
      companies.split('|').forEach((id) => {
        items.push({
          key: `company-${id}`,
          label: studioMap.get(id) || `Studio ${id}`,
          onRemove: () => {
            const remaining = companies
              .split('|')
              .filter((c) => c !== id)
              .join('|');
            setParam('with_companies', remaining);
          },
        });
      });
    }

    // Network
    const networks = getParam('with_networks');
    if (networks) {
      networks.split('|').forEach((id) => {
        items.push({
          key: `network-${id}`,
          label: networkMap.get(id) || `Network ${id}`,
          onRemove: () => {
            const remaining = networks
              .split('|')
              .filter((n) => n !== id)
              .join('|');
            setParam('with_networks', remaining);
          },
        });
      });
    }

    // Keywords
    const keywords = getParam('with_keywords');
    if (keywords) {
      items.push({
        key: 'keywords',
        label: `${keywords.split('|').length} keyword(s)`,
        onRemove: () => setParam('with_keywords', ''),
      });
    }

    return items;
  }, [mediaType, getParam, setParam, setParams, genreMap]);

  if (!hasActiveFilters || chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1.5 rounded-full bg-foreground/10 px-3 py-1.5 text-xs font-medium"
        >
          {chip.label}
          <button
            onClick={chip.onRemove}
            className="text-foreground/50 transition hover:text-foreground"
            aria-label={`Remove ${chip.label} filter`}
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </span>
      ))}
      <button
        onClick={() => clearAll()}
        className="text-xs font-medium text-foreground/50 transition hover:text-foreground"
      >
        Clear all
      </button>
    </div>
  );
}
