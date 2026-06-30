'use client';

import { Combobox } from '@base-ui/react/combobox';
import React, { useState, useRef, useEffect } from 'react';
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
 * Async keyword search built on Base UI's Combobox (multi-select). Filtering is
 * server-side (TMDB /search/keyword), so internal filtering is disabled via
 * `filter={null}` and `items` is fed the current search results. Selection is
 * tracked as string IDs and synced to the parent as a pipe-joined string.
 */
export default function KeywordSearch({ selectedKeywords, onKeywordsChange }: KeywordSearchProps) {
  const [results, setResults] = useState<TMDBKeyword[]>([]);
  const [nameMap, setNameMap] = useState<Map<string, string>>(new Map());
  const [isPending, setIsPending] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const selectedIds = selectedKeywords ? selectedKeywords.split('|') : [];

  // Hydrate keyword names for any selected IDs (e.g. restored from the URL).
  useEffect(() => {
    if (!selectedKeywords) return;

    const unknownIds = selectedKeywords.split('|').filter((id) => !nameMap.has(id));
    if (unknownIds.length === 0) return;

    let cancelled = false;
    (async () => {
      const entries: [string, string][] = [];
      await Promise.all(
        unknownIds.map(async (id) => {
          try {
            const keyword = await fetchKeywordById(Number(id));
            if (keyword && !cancelled) entries.push([String(keyword.id), keyword.name]);
          } catch (err) {
            logger.warn(`Failed to fetch keyword name for ID ${id}`, err);
          }
        })
      );
      if (!cancelled && entries.length > 0) {
        setNameMap((prev) => {
          const next = new Map(prev);
          for (const [k, v] of entries) next.set(k, v);
          return next;
        });
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKeywords]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const runSearch = (value: string) => {
    if (!value.trim()) {
      setResults([]);
      setIsPending(false);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsPending(true);
    searchKeywords(value)
      .then((data) => {
        if (controller.signal.aborted) return;
        setResults(data.results?.slice(0, 10) ?? []);
      })
      .catch(() => {
        if (!controller.signal.aborted) setResults([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsPending(false);
      });
  };

  return (
    <Combobox.Root
      multiple
      filter={null}
      items={results}
      value={selectedIds}
      itemToStringLabel={(id) => nameMap.get(id as string) ?? `#${id}`}
      onValueChange={(ids: string[]) => {
        // Remember names for newly-picked results so chips render labels, not #id.
        setNameMap((prev) => {
          const next = new Map(prev);
          for (const id of ids) {
            if (!next.has(id)) {
              const match = results.find((k) => String(k.id) === id);
              if (match) next.set(id, match.name);
            }
          }
          return next;
        });
        onKeywordsChange(ids.join('|'));
      }}
      onInputValueChange={(value, { reason }) => {
        if (reason === 'item-press') return;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => runSearch(value), 300);
      }}
    >
      <div className="relative">
        {selectedIds.length > 0 && (
          <Combobox.Chips className="mb-2 flex flex-wrap gap-1.5">
            {selectedIds.map((id) => (
              <Combobox.Chip
                key={id}
                className="inline-flex items-center gap-1 rounded-full bg-foreground/10 px-2.5 py-1 text-xs"
              >
                {nameMap.get(id) ?? `#${id}`}
                <Combobox.ChipRemove
                  aria-label="Remove"
                  className="ml-0.5 text-foreground/50 hover:text-foreground"
                >
                  &times;
                </Combobox.ChipRemove>
              </Combobox.Chip>
            ))}
          </Combobox.Chips>
        )}

        <Combobox.Input
          placeholder="Search keywords..."
          className="w-full rounded-lg border border-foreground/20 bg-background px-3 py-2 text-sm outline-none transition focus:border-foreground/40"
        />

        <Combobox.Portal>
          <Combobox.Positioner sideOffset={4} className="z-50 w-[var(--anchor-width)]">
            <Combobox.Popup className="max-h-48 w-full overflow-y-auto rounded-lg border border-foreground/20 bg-background shadow-lg outline-none">
              <Combobox.Status className="px-3 py-2 text-sm text-foreground/50 empty:hidden">
                {isPending ? 'Searching...' : ''}
              </Combobox.Status>
              <Combobox.Empty className="px-3 py-2 text-sm text-foreground/50">
                {isPending ? '' : 'No keywords found'}
              </Combobox.Empty>
              <Combobox.List>
                {(keyword: TMDBKeyword) => (
                  <Combobox.Item
                    key={keyword.id}
                    value={String(keyword.id)}
                    className="w-full cursor-pointer px-3 py-2 text-left text-sm transition data-[highlighted]:bg-foreground/5 data-[selected]:text-foreground/30"
                  >
                    {keyword.name}
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </div>
    </Combobox.Root>
  );
}
