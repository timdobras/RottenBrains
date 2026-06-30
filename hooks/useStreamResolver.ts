'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** What you pass in — the TMDB coordinates of the thing to play. */
export interface ResolveInput {
  mediaType: 'movie' | 'tv';
  id: string | number;
  /** tv only */
  season?: string | number;
  /** tv only */
  episode?: string | number;
  /** force a specific provider (e.g. 'vidlink.pro'); omit = Auto cascade */
  provider?: string;
}

export interface ResolvedSubtitle {
  label: string;
  lang?: string;
  default?: boolean;
  /** proxy-wrapped .vtt URL, ready for a <track> */
  src: string;
}

export interface ResolvedStream {
  /** which resolver produced it (vidlink.pro, spencerdevs, vidrock, Videasy…) */
  resolver: string;
  type: 'hls' | 'mp4';
  /** proxy-wrapped playable URL, ready for the player */
  src: string;
  subtitles: ResolvedSubtitle[];
  /** only present when resolved with { verbose: true } */
  debug?: {
    elapsedMs: number;
    upstreamUrl: string;
    upstreamHost: string | null;
    headers: Record<string, string>;
    subtitleCount: number;
    params: Record<string, unknown>;
  };
}

export type ResolveStatus = 'idle' | 'resolving' | 'ready' | 'error';

export interface UseStreamResolverResult {
  status: ResolveStatus;
  stream: ResolvedStream | null;
  error: string | null;
  /** Trigger a resolve (uses `input`, or an override). Returns the stream or null. */
  resolve: (override?: ResolveInput) => Promise<ResolvedStream | null>;
  reset: () => void;
}

function buildQuery(input: ResolveInput, verbose: boolean): string {
  const qs = new URLSearchParams({ media_type: input.mediaType, media_id: String(input.id) });
  if (input.mediaType === 'tv') {
    qs.set('season_number', String(input.season ?? 1));
    qs.set('episode_number', String(input.episode ?? 1));
  }
  if (input.provider) qs.set('provider', input.provider);
  if (verbose) qs.set('verbose', '1');
  return qs.toString();
}

/**
 * Resolve a TMDB title to a playable, proxy-wrapped stream via /api/stream/extract.
 *
 *   // auto-resolve (e.g. a watch page):
 *   const { stream, status } = useStreamResolver({ mediaType: 'tv', id, season, episode });
 *
 *   // manual (e.g. a form):
 *   const { stream, resolve } = useStreamResolver(null);
 *   <button onClick={() => resolve({ mediaType: 'movie', id: '27205' })}>play</button>
 *
 * Out-of-order responses are ignored, so rapid input changes never flicker stale data.
 */
export function useStreamResolver(
  input?: ResolveInput | null,
  opts: { enabled?: boolean; verbose?: boolean } = {},
): UseStreamResolverResult {
  const { enabled = true, verbose = false } = opts;
  const [status, setStatus] = useState<ResolveStatus>('idle');
  const [stream, setStream] = useState<ResolvedStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reqIdRef = useRef(0);

  const resolve = useCallback(
    async (override?: ResolveInput): Promise<ResolvedStream | null> => {
      const target = override ?? input ?? null;
      if (!target || target.id === '' || target.id == null) {
        setError('no media specified');
        setStatus('error');
        return null;
      }
      const reqId = ++reqIdRef.current;
      setStatus('resolving');
      setError(null);
      setStream(null);
      try {
        const res = await fetch(`/api/stream/extract?${buildQuery(target, verbose)}`);
        const data = await res.json().catch(() => ({}));
        if (reqId !== reqIdRef.current) return null; // a newer request superseded this one
        if (!res.ok) {
          setError(data?.error ?? `extract failed (${res.status})`);
          setStatus('error');
          return null;
        }
        const resolved: ResolvedStream = {
          resolver: data.resolver,
          type: data.type === 'mp4' ? 'mp4' : 'hls',
          src: data.src,
          subtitles: data.subtitles ?? [],
          debug: data.debug,
        };
        setStream(resolved);
        setStatus('ready');
        return resolved;
      } catch (e) {
        if (reqId !== reqIdRef.current) return null;
        setError(e instanceof Error ? e.message : String(e));
        setStatus('error');
        return null;
      }
    },
    [input, verbose],
  );

  const reset = useCallback(() => {
    reqIdRef.current++;
    setStatus('idle');
    setStream(null);
    setError(null);
  }, []);

  // Auto-resolve when an input is supplied and enabled (keyed on the actual params).
  const key = input && input.id !== '' && input.id != null ? buildQuery(input, verbose) : null;
  // Reset SYNCHRONOUSLY when the target changes (during render, not in the
  // effect) so consumers never momentarily see the PREVIOUS input's stream —
  // that stale frame made the old media replay when switching to a title a
  // provider lacks. (React "adjust state on prop change" pattern.)
  const lastKeyRef = useRef(key);
  if (lastKeyRef.current !== key) {
    lastKeyRef.current = key;
    reqIdRef.current++; // invalidate any in-flight resolve for the old key
    setStream(null);
    setError(null);
    setStatus(key ? 'resolving' : 'idle');
  }
  useEffect(() => {
    if (enabled && key) resolve();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  return { status, stream, error, resolve, reset };
}
