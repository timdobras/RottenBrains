import type { NextRequest } from 'next/server';

/**
 * The public-facing origin of the request.
 *
 * Behind a reverse proxy (Coolify/Traefik), `new URL(req.url).origin` is the
 * container's internal bind address (e.g. http://0.0.0.0:3000), which the
 * browser cannot reach. The real public origin comes from the forwarded
 * headers Traefik sets. We must use this when building proxy URLs that the
 * browser will fetch.
 */
export function publicOrigin(req: NextRequest): string {
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (!host) return new URL(req.url).origin;
  // localhost, loopback, or an RFC1918 private LAN IP — i.e. a direct/dev
  // connection (e.g. http://10.10.20.14:3010), NOT a public TLS-terminated
  // domain. These can legitimately be served over HTTP, so use the real proto.
  const isLocalOrPrivate =
    /^(localhost(:|$)|127\.|0\.0\.0\.0|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.|\[?::1\]?)/.test(host);
  // Behind a Cloudflare tunnel, x-forwarded-proto is 'http' even though the
  // public site is HTTPS — trusting it produces mixed-content URLs the browser
  // blocks. So force https for any PUBLIC host; trust the real proto otherwise.
  const proto = isLocalOrPrivate
    ? (req.headers.get('x-forwarded-proto') ?? new URL(req.url).protocol.replace(':', ''))
    : 'https';
  return `${proto}://${host}`;
}
