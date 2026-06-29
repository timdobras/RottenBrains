import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { rewritePlaylist, looksLikePlaylist } from '@/lib/stream/hlsRewrite';
import { publicOrigin } from '@/lib/stream/publicOrigin';
import { assertPublicHttpUrl } from '@/lib/stream/ssrfGuard';

// This route streams arbitrary-sized media; never statically optimize it.
export const dynamic = 'force-dynamic';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Range, Content-Type',
} as const;

function decodeHeaders(h: string | null): Record<string, string> {
  if (!h) return {};
  try {
    const json = Buffer.from(h, 'base64url').toString('utf8');
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed === 'object') return parsed as Record<string, string>;
  } catch {
    /* ignore malformed header bag */
  }
  return {};
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(req: NextRequest) {
  const { searchParams, pathname } = new URL(req.url);
  const target = searchParams.get('url');
  if (!target) return new NextResponse('Missing url', { status: 400, headers: CORS });

  let upstreamUrl: URL;
  try {
    upstreamUrl = await assertPublicHttpUrl(target);
  } catch (err) {
    logger.warn('stream proxy rejected url', { target, err: String(err) });
    return new NextResponse('Forbidden target', { status: 403, headers: CORS });
  }

  const upstreamHeaders = decodeHeaders(searchParams.get('h'));

  // Forward Range so seeking/segment fetches work; default a browser-y UA.
  const fwd: Record<string, string> = {
    'User-Agent': upstreamHeaders['User-Agent'] ?? 'Mozilla/5.0 (X11; Linux x86_64)',
    Accept: '*/*',
    ...upstreamHeaders,
  };
  const range = req.headers.get('range');
  if (range) fwd['Range'] = range;

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, { headers: fwd, redirect: 'follow' });
  } catch (err) {
    logger.error('stream proxy upstream fetch failed', { url: upstreamUrl.toString(), err });
    return new NextResponse('Upstream fetch failed', { status: 502, headers: CORS });
  }

  if (!upstream.ok && upstream.status !== 206) {
    return new NextResponse(`Upstream ${upstream.status}`, {
      status: upstream.status,
      headers: CORS,
    });
  }

  const contentType = upstream.headers.get('content-type');
  const isPlaylist =
    upstreamUrl.pathname.toLowerCase().endsWith('.m3u8') ||
    (contentType?.toLowerCase().includes('mpegurl') ?? false);

  // Playlists are small text — buffer, rewrite child URIs through this proxy.
  if (isPlaylist) {
    const body = await upstream.text();
    if (looksLikePlaylist(contentType, body)) {
      const proxyBase = `${publicOrigin(req)}${pathname}`;
      const rewritten = rewritePlaylist(body, upstreamUrl.toString(), proxyBase, upstreamHeaders);
      return new NextResponse(rewritten, {
        status: 200,
        headers: {
          ...CORS,
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Cache-Control': 'no-store',
        },
      });
    }
    // Mislabeled — fall through and serve as-is.
    return new NextResponse(body, {
      status: 200,
      headers: { ...CORS, 'Content-Type': contentType ?? 'text/plain' },
    });
  }

  // Segments / keys / subtitles: stream straight through.
  const passthrough = new Headers(CORS);
  for (const h of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
    const v = upstream.headers.get(h);
    if (v) passthrough.set(h, v);
  }
  passthrough.set('Cache-Control', 'public, max-age=3600');

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: passthrough,
  });
}
