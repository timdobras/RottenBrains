import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { internalProviderName, publicProviderName } from '@/lib/stream/providerNames';
import { publicOrigin } from '@/lib/stream/publicOrigin';
import { resolveStream } from '@/lib/stream/resolvers';
import type { ResolveParams } from '@/lib/stream/types';

export const dynamic = 'force-dynamic';

/** Wrap an upstream URL in our proxy, carrying the upstream headers. */
function proxied(origin: string, url: string, headers: Record<string, string>): string {
  const h = Buffer.from(JSON.stringify(headers)).toString('base64url');
  return `${origin}/api/stream/proxy?url=${encodeURIComponent(url)}&h=${h}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const origin = publicOrigin(req);

  // Temporary diagnostics: ?debug=1 probes the extractor service reachability.
  if (searchParams.get('debug') === '1') {
    const base = process.env.STREAM_EXTRACTOR_URL;
    const probe: Record<string, unknown> = { STREAM_EXTRACTOR_URL: base ?? null };
    if (base) {
      try {
        const r = await fetch(`${base.replace(/\/$/, '')}/health`, {
          signal: AbortSignal.timeout(8000),
        });
        probe.health_status = r.status;
        probe.health_body = (await r.text()).slice(0, 300);
      } catch (e) {
        probe.health_error = String(e);
      }
    }
    return NextResponse.json(probe);
  }

  const media_type = searchParams.get('media_type');
  const media_id = searchParams.get('media_id');
  if (media_type !== 'movie' && media_type !== 'tv') {
    return NextResponse.json({ error: 'media_type must be movie|tv' }, { status: 400 });
  }
  if (!media_id) {
    return NextResponse.json({ error: 'media_id required' }, { status: 400 });
  }

  const params: ResolveParams = {
    media_type,
    media_id,
    season_number: searchParams.get('season_number') ?? undefined,
    episode_number: searchParams.get('episode_number') ?? undefined,
    // Force a specific provider; omitted = Auto cascade. Client sends the public
    // (aliased) name in prod — map it back to the real provider here.
    provider: searchParams.get('provider')
      ? internalProviderName(searchParams.get('provider') as string)
      : undefined,
  };

  // `?verbose=1` adds a debug block (timing + raw upstream URL/host/headers) for
  // the dev page. Suppressed in production so the upstream CDN never leaks there.
  const verbose = searchParams.get('verbose') === '1' && process.env.NODE_ENV !== 'production';

  let stream;
  const t0 = Date.now();
  try {
    stream = await resolveStream(params);
  } catch (err) {
    logger.error('extract: resolver threw', { err, params });
    return NextResponse.json({ error: 'resolution_failed' }, { status: 502 });
  }
  const elapsedMs = Date.now() - t0;

  if (!stream) {
    // Caller should fall back to an iframe provider.
    return NextResponse.json({ error: 'no_source' }, { status: 404 });
  }

  const headers = stream.headers ?? {};
  let upstreamHost: string | null = null;
  try {
    upstreamHost = new URL(stream.url).host;
  } catch {
    /* non-URL upstream */
  }

  return NextResponse.json({
    // aliased in prod so the client never learns which real provider served it
    resolver: publicProviderName(stream.resolver),
    type: stream.type,
    // Already proxy-wrapped so the client just feeds this straight to hls.js.
    src: proxied(origin, stream.url, headers),
    subtitles: (stream.subtitles ?? []).map((s) => ({
      label: s.label,
      lang: s.lang,
      default: s.default ?? false,
      src: proxied(origin, s.url, headers),
    })),
    ...(verbose && {
      debug: {
        elapsedMs,
        upstreamUrl: stream.url,
        upstreamHost,
        headers,
        subtitleCount: stream.subtitles?.length ?? 0,
        params,
      },
    }),
  });
}
