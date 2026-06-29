import { logger } from '@/lib/logger';
import type { ExtractedStream, ResolveParams, StreamResolver } from '../types';

/**
 * Delegates resolution to a separately-deployed extractor microservice.
 *
 * This is the RECOMMENDED production path. Provider scraping breaks often
 * (obfuscation/token changes), so isolating it in its own service means you
 * redeploy/patch the scraper without touching RottenBrains. Point it at any
 * compatible extractor (e.g. a self-hosted vidsrc/consumet-style scraper) via:
 *
 *   STREAM_EXTRACTOR_URL=https://extractor.internal.example
 *
 * Expected response shape (JSON):
 *   { url: string, headers?: {}, subtitles?: [{label,lang?,url,default?}], type?: "hls" }
 */
export function externalResolver(): StreamResolver | null {
  const base = process.env.STREAM_EXTRACTOR_URL;
  if (!base) return null;

  return {
    name: 'external',
    async resolve(params: ResolveParams): Promise<ExtractedStream | null> {
      const qs = new URLSearchParams({
        type: params.media_type,
        id: params.media_id,
      });
      if (params.season_number) qs.set('season', params.season_number);
      if (params.episode_number) qs.set('episode', params.episode_number);

      const url = `${base.replace(/\/$/, '')}/extract?${qs.toString()}`;
      try {
        const res = await fetch(url, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(20_000),
        });
        if (!res.ok) {
          logger.warn('external extractor non-200', { status: res.status });
          return null;
        }
        const data = (await res.json()) as Partial<ExtractedStream>;
        if (!data?.url) return null;
        return {
          url: data.url,
          headers: data.headers ?? {},
          subtitles: data.subtitles ?? [],
          resolver: 'external',
          type: 'hls',
        };
      } catch (err) {
        logger.warn('external extractor failed', { err: String(err) });
        return null;
      }
    },
  };
}
