'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { searchKeywords, fetchKeywordById } from '@/lib/tmdb/discover';
import type { TMDBKeyword } from '@/lib/tmdb/types';
import { logger } from '@/lib/logger';

interface KeywordSearchProps {
  /** Currently selected keyword IDs (pipe-separated) */
  selectedKeywords: string;
  /** Callback when keywords change */
  onKeywordsChange: (keywords: string) => void;
}

/**
 * Async keyword search input that queries TMDB /search/keyword
 * and lets users select multiple keywords as filter chips.
 */
export default function KeywordSearch({ selectedKeywords, onKeywordsChange }: KeywordSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TMDBKeyword[]>([]);
  const [selectedNames, setSelectedNames] = useState<Map<string, string>>(new Map());
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedIds = selectedKeywords ? selectedKeywords.split('|') : [];

  /**
   * On mount (or when selectedKeywords change from URL),
   * hydrate keyword names for any IDs we don't already know about.
   */
  useEffect(() => {
    if (!selectedKeywords) return;

    const ids = selectedKeywords.split('|');
    const unknownIds = ids.filter((id) => !selectedNames.has(id));

    if (unknownIds.length === 0) return;

    let cancelled = false;

    const hydrateNames = async () => {
      const entries: [string, string][] = [];
      await Promise.all(
        unknownIds.map(async (id) => {
          try {
            const keyword = await fetchKeywordById(Number(id));
            if (keyword && !cancelled) {
              entries.push([String(keyword.id), keyword.name]);
            }
          } catch (err) {
            logger.warn(`Failed to fetch keyword name for ID ${id}`, err);
          }
        })
      );

      if (!cancelled && entries.length > 0) {
        setSelectedNames((prev) => {
          const next = new Map(prev);
          for (const [k, v] of entries) {
            next.set(k, v);
          }
          return next;
        });
      }
    };

    hydrateNames();

    return () => {
      cancelled = true;
    };
    // Only re-run when the keyword IDs string changes, not selectedNames
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKeywords]);

  // Search keywords with debounce
  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const data = await searchKeywords(searchQuery);
      setResults(data.results?.slice(0, 10) ?? []);
      setIsOpen(true);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => handleSearch(value), 300);
  };

  // Clean up debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const addKeyword = (keyword: TMDBKeyword) => {
    const id = String(keyword.id);
    if (selectedIds.includes(id)) return;

    const newIds = [...selectedIds, id];
    setSelectedNames((prev) => new Map(prev).set(id, keyword.name));
    onKeywordsChange(newIds.join('|'));
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  const removeKeyword = (id: string) => {
    const newIds = selectedIds.filter((k) => k !== id);
    setSelectedNames((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
    onKeywordsChange(newIds.join('|'));
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {/* Selected keyword chips */}
      {selectedIds.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selectedIds.map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-full bg-foreground/10 px-2.5 py-1 text-xs"
            >
              {selectedNames.get(id) || `#${id}`}
              <button
                onClick={() => removeKeyword(id)}
                className="ml-0.5 text-foreground/50 hover:text-foreground"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        placeholder="Search keywords..."
        className="w-full rounded-lg border border-foreground/20 bg-background px-3 py-2 text-sm outline-none transition focus:border-foreground/40"
      />

      {/* Dropdown results */}
      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-foreground/20 bg-background shadow-lg">
          {isLoading ? (
            <div className="px-3 py-2 text-sm text-foreground/50">Searching...</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-2 text-sm text-foreground/50">No keywords found</div>
          ) : (
            results.map((keyword) => {
              const isSelected = selectedIds.includes(String(keyword.id));
              return (
                <button
                  key={keyword.id}
                  onClick={() => addKeyword(keyword)}
                  disabled={isSelected}
                  className={`w-full px-3 py-2 text-left text-sm transition hover:bg-foreground/5 ${
                    isSelected ? 'text-foreground/30' : ''
                  }`}
                >
                  {keyword.name}
                  {isSelected && ' (added)'}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
