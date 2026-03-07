'use client';

import React, { useState } from 'react';
import { useDiscoverFilters } from '@/hooks/useDiscoverFilters';
import ActiveFilters from './ActiveFilters';
import DiscoverResults from './DiscoverResults';
import FilterSidebar from './FilterSidebar';

/**
 * Main discover page layout.
 * Desktop: sidebar on left + results on right
 * Mobile: collapsible filter section at top + results below
 */
export default function DiscoverPage() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { hasActiveFilters, mediaType } = useDiscoverFilters();

  return (
    <div className="w-full px-4 md:px-8">
      {/* Mobile: collapsible filter header */}
      <div className="md:hidden">
        <div className="flex items-center justify-end py-4">
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition ${
              hasActiveFilters
                ? 'border-foreground bg-foreground text-background'
                : 'border-foreground/20 text-foreground/70 hover:border-foreground/40'
            }`}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            Filters
            {hasActiveFilters && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-background text-[10px] font-bold text-foreground">
                !
              </span>
            )}
          </button>
        </div>

        {/* Collapsible filter area */}
        <div
          className={`overflow-hidden transition-all duration-300 ${
            filtersOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="mb-4 rounded-xl border border-foreground/10 bg-foreground/[0.02] p-4">
            <FilterSidebar />
          </div>
        </div>

        {/* Active filter chips (mobile) */}
        <div className="mb-4">
          <ActiveFilters />
        </div>
      </div>

      {/* Desktop layout */}
      <div className="flex gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden w-[280px] shrink-0 border-r border-foreground/10 md:block">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pb-8 pr-4">
            <FilterSidebar />
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1">
          {/* Desktop active filters */}
          <div className="mb-6 hidden md:block">
            <ActiveFilters />
          </div>

          {/* Results grid */}
          <DiscoverResults />
        </main>
      </div>
    </div>
  );
}
