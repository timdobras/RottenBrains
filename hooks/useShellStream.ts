'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { CustomPlayerSubtitle } from '@/components/features/watch/CustomPlayer';

import {
  type ResolveInput,
  type ResolveStatus,
  useStreamResolver,
} from './useStreamResolver';

/**
 * Orchestrates the production watch stream for the persistent shell.
 *
 * AUTO-FIRST: `useStreamResolver(input)` is given the title coords WITHOUT a
 * provider, so it auto-resolves the server Auto cascade the instant coords
 * change → playback starts fast. A single /api/stream/availability fetch fills
 * the in-player source switcher (known-good providers + metadata). Selecting a
 * named source lazily re-resolves just that provider. No probe-all in prod.
 */

interface AvailabilityEntry {
  provider: string;
  ok: boolean;
  type: 'hls' | 'mp4' | null;
  subtitleCount: number;
  languages: string[];
  at: number;
}

export interface ShellStreamProvider {
  name: string;
  label?: string;
  type?: 'hls' | 'mp4';
  subs?: number;
  langs?: number;
}

export interface ShellStream {
  src: string;
  type: 'hls' | 'mp4';
  subtitles: CustomPlayerSubtitle[];
  providers: ShellStreamProvider[];
  currentProvider: string;
  onSelectProvider: (provider: string) => void;
  resolving: boolean;
  probing: boolean;
  status: ResolveStatus;
  error: string | null;
  /** which provider Auto actually landed on (already aliased in prod) */
  resolverName?: string;
}

function availabilityQuery(input: ResolveInput): string {
  const qs = new URLSearchParams({ media_type: input.mediaType, media_id: String(input.id) });
  if (input.mediaType === 'tv') {
    qs.set('season_number', String(input.season ?? 1));
    qs.set('episode_number', String(input.episode ?? 1));
  }
  return qs.toString();
}

export function useShellStream(
  input: ResolveInput | null,
  opts: { enabled: boolean },
): ShellStream {
  const { enabled } = opts;
  const { status, stream, error, resolve } = useStreamResolver(input, { enabled });

  const [selected, setSelected] = useState(''); // '' = Auto
  const [available, setAvailable] = useState<AvailabilityEntry[]>([]);
  const [availLoading, setAvailLoading] = useState(false);

  // Title identity (excludes provider) — drives availability fetch + resets.
  const coordKey = input
    ? `${input.mediaType}:${input.id}:${input.season ?? ''}:${input.episode ?? ''}`
    : null;

  // New title → back to Auto, clear the stale switcher list.
  useEffect(() => {
    setSelected('');
    setAvailable([]);
  }, [coordKey]);

  // One availability fetch per title (cheap Redis lookup, ok-only entries).
  // DEFERRED off the critical path: the source-switcher list isn't needed for
  // playback to start, so we wait until the browser is idle rather than firing
  // it immediately, where it competed with stream extraction + hydration on
  // load. Falls back to a short timeout when requestIdleCallback is missing.
  useEffect(() => {
    if (!enabled || !input || !coordKey) return;
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      setAvailLoading(true);
      fetch(`/api/stream/availability?${availabilityQuery(input)}`)
        .then((r) => (r.ok ? r.json() : { providers: [] }))
        .then((d) => {
          if (cancelled) return;
          const ok = (d.providers ?? []).filter((p: AvailabilityEntry) => p.ok);
          setAvailable(ok);
        })
        .catch(() => {
          if (!cancelled) setAvailable([]);
        })
        .finally(() => {
          if (!cancelled) setAvailLoading(false);
        });
    };

    const w = typeof window !== 'undefined' ? (window as unknown as {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    }) : undefined;
    let idleId: number | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (w?.requestIdleCallback) {
      idleId = w.requestIdleCallback(run, { timeout: 4000 });
    } else {
      timer = setTimeout(run, 1500);
    }

    return () => {
      cancelled = true;
      if (idleId !== undefined && w?.cancelIdleCallback) w.cancelIdleCallback(idleId);
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordKey, enabled]);

  const onSelectProvider = useCallback(
    (provider: string) => {
      setSelected(provider);
      if (!input) return;
      // '' = Auto (no provider → server cascade); else force the chosen one.
      if (provider === '') resolve({ ...input, provider: undefined });
      else resolve({ ...input, provider });
    },
    [input, resolve],
  );

  const providers = useMemo<ShellStreamProvider[]>(
    () =>
      available.map((p) => ({
        name: p.provider,
        label: p.provider,
        type: p.type ?? undefined,
        subs: p.subtitleCount,
        langs: p.languages?.length,
      })),
    [available],
  );

  return {
    src: stream?.src ?? '',
    type: stream?.type ?? 'hls',
    subtitles: stream?.subtitles ?? [],
    providers,
    currentProvider: selected,
    onSelectProvider,
    resolving: status === 'resolving',
    probing: availLoading,
    status,
    error,
    resolverName: stream?.resolver,
  };
}
