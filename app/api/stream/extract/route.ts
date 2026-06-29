import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { resolveStream } from '@/lib/stream/resolvers';
import type { ResolveParams } from '@/lib/stream/types';

export const dynamic = 'force-dynamic';

/** Wrap an upstream URL in our proxy, carrying the upstream headers. */
function proxied(origin: string, url: string, headers: Record<string, string>): string {
  const h = Buffer.from(JSON.stringify(headers)).toString('base64url');
  return `${origin}/api/stream/proxy?url=${encodeURIComponent(url)}&h=${h}`;
}

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);

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
  };

  let stream;
  try {
    stream = await resolveStream(params);
  } catch (err) {
    logger.error('extract: resolver threw', { err, params });
    return NextResponse.json({ error: 'resolution_failed' }, { status: 502 });
  }

  if (!stream) {
    // Caller should fall back to an iframe provider.
    return NextResponse.json({ error: 'no_source' }, { status: 404 });
  }

  const headers = stream.headers ?? {};
  return NextResponse.json({
    resolver: stream.resolver,
    type: stream.type,
    // Already proxy-wrapped so the client just feeds this straight to hls.js.
    src: proxied(origin, stream.url, headers),
    subtitles: (stream.subtitles ?? []).map((s) => ({
      label: s.label,
      lang: s.lang,
      default: s.default ?? false,
      src: proxied(origin, s.url, headers),
    })),
  });
}
