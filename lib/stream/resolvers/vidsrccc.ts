import { logger } from '@/lib/logger';
import type { ExtractedStream, ResolveParams, StreamResolver, SubtitleTrack } from '../types';

/**
 * Best-effort inline resolver for vidsrc.cc (v2).
 *
 * ⚠️  FRAGILE BY NATURE. Embed providers rotate their API shape, obfuscation
 * and anti-bot tokens frequently (often monthly). Treat this as a worked
 * EXAMPLE of the resolve flow, not a guaranteed-working integration. The
 * robust production path is the external extractor microservice
 * (see external.ts) which you can patch independently. When this breaks,
 * the symptom is resolve() returning null and the client falling back to the
 * iframe providers.
 *
 * Flow (as observed; verify against the live site when wiring up):
 *   1. GET the embed page to obtain the per-request data id / user token.
 *   2. GET /api/<id>/servers to list playable servers.
 *   3. GET /api/source/<hash> to get { source: m3u8, subtitles: [...] }.
 */

const BASE = 'https://vidsrc.cc';
const UA = 'Mozilla/5.0 (X11; Linux x86_64; rv:124.0) Gecko/20100101 Firefox/124.0';

function embedPath(p: ResolveParams): string {
  const tail =
    p.media_type === 'tv'
      ? `/tv/${p.media_id}/${p.season_number ?? 1}/${p.episode_number ?? 1}`
      : `/movie/${p.media_id}`;
  return `${BASE}/v2/embed${tail}`;
}

async function getText(url: string, referer?: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        Accept: '*/*',
        ...(referer ? { Referer: referer } : {}),
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      logger.warn('vidsrccc non-200', { url, status: res.status });
      return null;
    }
    return await res.text();
  } catch (err) {
    logger.warn('vidsrccc fetch failed', { url, err: String(err) });
    return null;
  }
}

export const vidsrcCcResolver: StreamResolver = {
  name: 'vidsrc.cc',
  async resolve(params: ResolveParams): Promise<ExtractedStream | null> {
    const embedUrl = embedPath(params);
    const html = await getText(embedUrl);
    if (!html) return null;

    // The embed page embeds a data id used to query the servers API. The exact
    // attribute name drifts; try the common forms before giving up.
    const dataId =
      html.match(/data-id=["']([^"']+)["']/)?.[1] ??
      html.match(/["']?v["']?\s*[:=]\s*["']([a-zA-Z0-9_-]{6,})["']/)?.[1] ??
      null;
    if (!dataId) {
      logger.warn('vidsrccc: could not locate data id on embed page');
      return null;
    }

    const serversRaw = await getText(
      `${BASE}/api/${encodeURIComponent(dataId)}/servers?type=${params.media_type}`,
      embedUrl
    );
    if (!serversRaw) return null;

    let serverHash: string | null = null;
    try {
      const servers = JSON.parse(serversRaw) as { data?: { hash: string }[] };
      serverHash = servers.data?.[0]?.hash ?? null;
    } catch {
      logger.warn('vidsrccc: servers payload not JSON');
      return null;
    }
    if (!serverHash) return null;

    const sourceRaw = await getText(`${BASE}/api/source/${serverHash}`, embedUrl);
    if (!sourceRaw) return null;

    try {
      const parsed = JSON.parse(sourceRaw) as {
        data?: { source?: string; subtitles?: { label?: string; file?: string }[] };
      };
      const source = parsed.data?.source;
      if (!source) return null;

      const subtitles: SubtitleTrack[] = (parsed.data?.subtitles ?? [])
        .filter((s): s is { label?: string; file: string } => Boolean(s.file))
        .map((s) => ({ label: s.label ?? 'Subtitle', url: s.file }));

      return {
        url: source,
        // vidsrc CDNs generally referer-lock to the embed host.
        headers: { Referer: `${BASE}/`, Origin: BASE },
        subtitles,
        resolver: 'vidsrc.cc',
        type: 'hls',
      };
    } catch {
      logger.warn('vidsrccc: source payload not JSON');
      return null;
    }
  },
};
