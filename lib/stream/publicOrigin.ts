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
  // Behind a Cloudflare tunnel, x-forwarded-proto is 'http' even though the
  // public site is HTTPS — trusting it produces mixed-content URLs the browser
  // blocks. So force https for any non-local host.
  const isLocal = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|$)/.test(host);
  const proto = isLocal ? (req.headers.get('x-forwarded-proto') ?? 'http') : 'https';
  return `${proto}://${host}`;
}
