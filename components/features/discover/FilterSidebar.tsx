'use client';

import React, { useState } from 'react';
import { useDiscoverFilters } from '@/hooks/useDiscoverFilters';
import movieGenresData from '@/lib/constants/movie_genres.json';
import tvGenresData from '@/lib/constants/tv_genres.json';
import {
  MOVIE_SORT_OPTIONS,
  TV_SORT_OPTIONS,
  LANGUAGES,
  COUNTRIES,
  US_CERTIFICATIONS,
  MOVIE_RELEASE_TYPES,
  TV_STATUSES,
  TV_TYPES,
} from '@/lib/constants/discover';
import KeywordSearch from './KeywordSearch';

// ─── Sub-components ─────────────────────────────────────────────────

/** Collapsible section wrapper */
function FilterSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-foreground/10 py-4 first:pt-0 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-sm font-semibold text-foreground"
      >
        {title}
        <svg
          className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export default function FilterSidebar() {
  const {
    mediaType,
    getParam,
    setParam,
    setParamDebounced,
    setParams,
    toggleInList,
    isInList,
    clearAll,
    hasActiveFilters,
  } = useDiscoverFilters();

  const genres = mediaType === 'movie' ? movieGenresData.genres : tvGenresData.genres;
  const sortOptions = mediaType === 'movie' ? MOVIE_SORT_OPTIONS : TV_SORT_OPTIONS;

  // Generate year options (current year down to 1900)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => currentYear - i);

  /**
   * Handle year "From" change with validation:
   * If "From" > "To", also update "To" to match.
   */
  const handleYearGteChange = (value: string) => {
    const yearLte = getParam('year_lte');
    if (value && yearLte && Number(value) > Number(yearLte)) {
      setParams({ year_gte: value, year_lte: value });
    } else {
      setParam('year_gte', value);
    }
  };

  /**
   * Handle year "To" change with validation:
   * If "To" < "From", also update "From" to match.
   */
  const handleYearLteChange = (value: string) => {
    const yearGte = getParam('year_gte');
    if (value && yearGte && Number(value) < Number(yearGte)) {
      setParams({ year_lte: value, year_gte: value });
    } else {
      setParam('year_lte', value);
    }
  };

  return (
    <div className="flex flex-col gap-0">
      {/* Clear all (no header title) */}
      {hasActiveFilters && (
        <div className="flex justify-end pb-4">
          <button
            onClick={() => clearAll()}
            className="text-xs font-medium text-foreground/60 transition hover:text-foreground"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Media Type Toggle */}
      <div className="pb-4">
        <div className="flex rounded-lg border border-foreground/20 p-1">
          <button
            onClick={() =>
              setParams({
                type: 'movie',
                sort_by: 'popularity.desc',
                with_genres: '',
                with_status: '',
                with_type: '',
                with_networks: '',
                with_release_type: '',
                certification: '',
              })
            }
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
              mediaType === 'movie'
                ? 'bg-foreground text-background'
                : 'text-foreground/60 hover:text-foreground'
            }`}
          >
            Movies
          </button>
          <button
            onClick={() =>
              setParams({
                type: 'tv',
                sort_by: 'popularity.desc',
                with_genres: '',
                with_status: '',
                with_type: '',
                with_networks: '',
                with_release_type: '',
                certification: '',
              })
            }
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
              mediaType === 'tv'
                ? 'bg-foreground text-background'
                : 'text-foreground/60 hover:text-foreground'
            }`}
          >
            TV Shows
          </button>
        </div>
      </div>

      {/* Sort By */}
      <FilterSection title="Sort By" defaultOpen={true}>
        <select
          value={getParam('sort_by') || 'popularity.desc'}
          onChange={(e) => setParam('sort_by', e.target.value)}
          className="w-full rounded-lg border border-foreground/20 bg-background px-3 py-2 text-sm outline-none transition focus:border-foreground/40"
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FilterSection>

      {/* Genres */}
      <FilterSection title="Genres" defaultOpen={true}>
        <div className="flex flex-wrap gap-2">
          {genres.map((genre) => (
            <button
              key={genre.id}
              onClick={() => toggleInList('with_genres', String(genre.id))}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                isInList('with_genres', String(genre.id))
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-foreground/20 text-foreground/70 hover:border-foreground/40 hover:text-foreground'
              }`}
            >
              {genre.name}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Year Range */}
      <FilterSection title="Year" defaultOpen={false}>
        <div className="flex items-center gap-2">
          <select
            value={getParam('year_gte')}
            onChange={(e) => handleYearGteChange(e.target.value)}
            className="flex-1 rounded-lg border border-foreground/20 bg-background px-3 py-2 text-sm outline-none transition focus:border-foreground/40"
          >
            <option value="">From</option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <span className="text-foreground/40">&mdash;</span>
          <select
            value={getParam('year_lte')}
            onChange={(e) => handleYearLteChange(e.target.value)}
            className="flex-1 rounded-lg border border-foreground/20 bg-background px-3 py-2 text-sm outline-none transition focus:border-foreground/40"
          >
            <option value="">To</option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </FilterSection>

      {/* Rating Range */}
      <FilterSection title="Rating" defaultOpen={false}>
        <div className="space-y-3">
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-foreground/60">
              <span>Min Rating</span>
              <span>{getParam('vote_average.gte') || '0'}</span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={getParam('vote_average.gte') || '0'}
              onChange={(e) =>
                setParamDebounced('vote_average.gte', e.target.value === '0' ? '' : e.target.value)
              }
              className="w-full accent-foreground"
            />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-foreground/60">
              <span>Max Rating</span>
              <span>{getParam('vote_average.lte') || '10'}</span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={getParam('vote_average.lte') || '10'}
              onChange={(e) =>
                setParamDebounced('vote_average.lte', e.target.value === '10' ? '' : e.target.value)
              }
              className="w-full accent-foreground"
            />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-foreground/60">
              <span>Min Votes</span>
              <span>{getParam('vote_count.gte') || '0'}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1000"
              step="50"
              value={getParam('vote_count.gte') || '0'}
              onChange={(e) =>
                setParamDebounced('vote_count.gte', e.target.value === '0' ? '' : e.target.value)
              }
              className="w-full accent-foreground"
            />
          </div>
        </div>
      </FilterSection>

      {/* Runtime Range */}
      <FilterSection title="Runtime (minutes)" defaultOpen={false}>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            min="0"
            max="400"
            value={getParam('with_runtime.gte')}
            onChange={(e) => setParamDebounced('with_runtime.gte', e.target.value)}
            className="w-full rounded-lg border border-foreground/20 bg-background px-3 py-2 text-sm outline-none transition focus:border-foreground/40"
          />
          <span className="text-foreground/40">&mdash;</span>
          <input
            type="number"
            placeholder="Max"
            min="0"
            max="400"
            value={getParam('with_runtime.lte')}
            onChange={(e) => setParamDebounced('with_runtime.lte', e.target.value)}
            className="w-full rounded-lg border border-foreground/20 bg-background px-3 py-2 text-sm outline-none transition focus:border-foreground/40"
          />
        </div>
      </FilterSection>

      {/* Language */}
      <FilterSection title="Original Language" defaultOpen={false}>
        <select
          value={getParam('with_original_language')}
          onChange={(e) => setParam('with_original_language', e.target.value)}
          className="w-full rounded-lg border border-foreground/20 bg-background px-3 py-2 text-sm outline-none transition focus:border-foreground/40"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
      </FilterSection>

      {/* Country */}
      <FilterSection title="Country of Origin" defaultOpen={false}>
        <select
          value={getParam('with_origin_country')}
          onChange={(e) => setParam('with_origin_country', e.target.value)}
          className="w-full rounded-lg border border-foreground/20 bg-background px-3 py-2 text-sm outline-none transition focus:border-foreground/40"
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
      </FilterSection>

      {/* Movie-only: Certification */}
      {mediaType === 'movie' && (
        <FilterSection title="Certification (US)" defaultOpen={false}>
          <div className="flex flex-wrap gap-2">
            {US_CERTIFICATIONS.map((cert) => (
              <button
                key={cert.value}
                onClick={() => setParam('certification', cert.value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  getParam('certification') === cert.value
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-foreground/20 text-foreground/70 hover:border-foreground/40 hover:text-foreground'
                }`}
              >
                {cert.label}
              </button>
            ))}
          </div>
        </FilterSection>
      )}

      {/* Movie-only: Release Type */}
      {mediaType === 'movie' && (
        <FilterSection title="Release Type" defaultOpen={false}>
          <div className="flex flex-wrap gap-2">
            {MOVIE_RELEASE_TYPES.map((rt) => (
              <button
                key={rt.value}
                onClick={() => toggleInList('with_release_type', rt.value, '|')}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  isInList('with_release_type', rt.value, '|')
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-foreground/20 text-foreground/70 hover:border-foreground/40 hover:text-foreground'
                }`}
              >
                {rt.label}
              </button>
            ))}
          </div>
        </FilterSection>
      )}

      {/* TV-only: Status */}
      {mediaType === 'tv' && (
        <FilterSection title="Status" defaultOpen={false}>
          <div className="flex flex-wrap gap-2">
            {TV_STATUSES.map((s) => (
              <button
                key={s.value}
                onClick={() => toggleInList('with_status', s.value, '|')}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  isInList('with_status', s.value, '|')
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-foreground/20 text-foreground/70 hover:border-foreground/40 hover:text-foreground'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </FilterSection>
      )}

      {/* TV-only: Type */}
      {mediaType === 'tv' && (
        <FilterSection title="Show Type" defaultOpen={false}>
          <div className="flex flex-wrap gap-2">
            {TV_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => toggleInList('with_type', t.value, '|')}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  isInList('with_type', t.value, '|')
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-foreground/20 text-foreground/70 hover:border-foreground/40 hover:text-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </FilterSection>
      )}

      {/* Keywords */}
      <FilterSection title="Keywords" defaultOpen={false}>
        <KeywordSearch
          selectedKeywords={getParam('with_keywords')}
          onKeywordsChange={(kw) => setParam('with_keywords', kw)}
        />
      </FilterSection>
    </div>
  );
}
