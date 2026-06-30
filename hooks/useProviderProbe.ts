'use client';

import { useEffect, useRef, useState } from 'react';
import type { ResolveInput, ResolvedStream } from './useStreamResolver';

export type ProbeStatus = 'checking' | 'available' | 'unavailable';

export interface ProviderProbe {
  provider: string;
  status: ProbeStatus;
  type?: 'hls' | 'mp4';
  subtitleCount?: number;
  /** distinct subtitle languages (display names as the provider gives them) */
  languages?: string[];
  /** the resolved stream — kept so switching to this provider is instant */
  stream?: ResolvedStream;
}

export interface UseProviderProbeResult {
  /** per-provider state, keyed by provider name */
  probes: Record<string, ProviderProbe>;
  /** confirmed-available providers, in the order they were probed */
  available: ProviderProbe[];
  /** the first provider that resolved (use it to start playback immediately) */
  first: ResolvedStream | null;
  /** true while any provider is still being checked */
  probing: boolean;
}

function qs(input: ResolveInput, provider: string): string {
  const p = new URLSearchParams({ media_type: input.mediaType, media_id: String(input.id), provider, verbose: '1' });
  if (input.mediaType === 'tv') {
    p.set('season_number', String(input.season ?? 1));
    p.set('episode_number', String(input.episode ?? 1));
  }
  return p.toString();
}

function availQs(input: ResolveInput): string {
  const p = new URLSearchParams({ media_type: input.mediaType, media_id: String(input.id) });
  if (input.mediaType === 'tv') {
    p.set('season_number', String(input.season ?? 1));
    p.set('episode_number', String(input.episode ?? 1));
  }
  return p.toString();
}

interface CachedAvail {
  ok: boolean;
  type?: 'hls' | 'mp4';
  subtitleCount?: number;
  languages?: string[];
}

/**
 * Probe each provider for a title in parallel and report which actually have it.
 *
 * `providers` should be ordered fast-first (direct providers, then browser
 * ones) — the fast ones resolve in ~1s so playback can start from `first` while
 * the slower browser providers are still being checked. Results stream in via
 * `probes`/`available` as each completes. Unavailable providers are marked
 * `unavailable` (the UI hides them).
 */
export function useProviderProbe(
  input: ResolveInput | null,
  providers: string[],
  opts: { enabled?: boolean } = {},
): UseProviderProbeResult {
  const { enabled = true } = opts;
  const [probes, setProbes] = useState<Record<string, ProviderProbe>>({});
  const [first, setFirst] = useState<ResolvedStream | null>(null);
  const runRef = useRef(0);

  const key = input && input.id !== '' && input.id != null ? qs(input, '*') : null;

  useEffect(() => {
    if (!enabled || !key || !input || !providers.length) return;
    const run = ++runRef.current;
    let firstSet = false;

    // seed everything as "checking"
    setProbes(Object.fromEntries(providers.map((p) => [p, { provider: p, status: 'checking' as ProbeStatus }])));
    setFirst(null);

    const liveResolve = (provider: string) =>
      fetch(`/api/stream/extract?${qs(input, provider)}`)
        .then(async (res) => {
          if (run !== runRef.current) return; // superseded by a newer title
          if (!res.ok) {
            setProbes((prev) => ({ ...prev, [provider]: { provider, status: 'unavailable' } }));
            return;
          }
          const d = await res.json();
          if (run !== runRef.current) return;
          const stream: ResolvedStream = {
            resolver: d.resolver,
            type: d.type === 'mp4' ? 'mp4' : 'hls',
            src: d.src,
            subtitles: d.subtitles ?? [],
            debug: d.debug,
          };
          const languages = [...new Set((stream.subtitles ?? []).map((s) => s.lang || s.label).filter(Boolean))] as string[];
          setProbes((prev) => ({
            ...prev,
            [provider]: {
              provider,
              status: 'available',
              type: stream.type,
              subtitleCount: stream.subtitles?.length ?? 0,
              languages,
              stream,
            },
          }));
          if (!firstSet) {
            firstSet = true;
            setFirst(stream);
          }
        })
        .catch(() => {
          if (run !== runRef.current) return;
          setProbes((prev) => ({ ...prev, [provider]: { provider, status: 'unavailable' } }));
        });

    (async () => {
      // 1) Warm-start from the Redis availability cache (populated by the worker
      //    as titles get watched). Instantly shows which providers have this
      //    title + their metadata, and lets us skip re-probing known-bad ones.
      const cached: Record<string, CachedAvail> = {};
      try {
        const r = await fetch(`/api/stream/availability?${availQs(input)}`);
        if (run !== runRef.current) return;
        if (r.ok) {
          const d = await r.json();
          for (const p of d.providers ?? []) cached[p.provider] = p;
        }
      } catch {
        /* cache miss → full live probe */
      }
      if (run !== runRef.current) return;

      // Seed the UI from cache immediately: known-available shown with metadata
      // (stream still resolved live below, since its token is short-lived);
      // known-unavailable marked so the UI hides it without a wasted probe.
      if (Object.keys(cached).length) {
        setProbes((prev) => {
          const next = { ...prev };
          for (const p of providers) {
            const c = cached[p];
            if (!c) continue;
            next[p] = c.ok
              ? { provider: p, status: 'available', type: c.type, subtitleCount: c.subtitleCount, languages: c.languages }
              : { provider: p, status: 'unavailable' };
          }
          return next;
        });
      }

      // 2) Live-resolve to get fresh, playable streams. Resolve providers the
      //    cache says are available or that we've never seen; skip known-bad.
      providers.forEach((provider) => {
        if (cached[provider] && !cached[provider].ok) return; // hidden, don't probe
        liveResolve(provider);
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, providers.join(',')]);

  const list = Object.values(probes);
  return {
    probes,
    available: list.filter((p) => p.status === 'available'),
    first,
    probing: list.some((p) => p.status === 'checking'),
  };
}
