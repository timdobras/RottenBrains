import { type NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

type SessionUser = { id: string; premium?: boolean };

// Authoritative session read for the PREMIUM gate only. We hit the app over
// loopback (127.0.0.1) — NOT request.nextUrl.origin — because behind Cloudflare
// + Traefik the origin is the PUBLIC url, so the "local hop" actually round-trips
// out through the tunnel/proxy/CrowdSec on every navigation and intermittently
// fails, which previously logged valid users out at random. Loopback stays in
// the container and is reliable. Returns null on any transient failure so the
// caller can fail OPEN (the signed cookie already proves the user is logged in).
async function authoritativeSession(
  request: NextRequest
): Promise<{ user: SessionUser | null } | null> {
  try {
    const base = `http://127.0.0.1:${process.env.PORT || 3000}`;
    const res = await fetch(`${base}/api/auth/get-session`, {
      headers: { cookie: request.headers.get('cookie') || '' },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const s = (await res.json()) as { user?: SessionUser } | null;
    return { user: s?.user ?? null };
  } catch {
    return null;
  }
}

// Routes that do not require authentication
const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/auth/callback',
  '/callback',
  '/about',
  '/legal',
  '/cookie-policy',
  '/blog',
  '/premium',
  '/offline',
  '/design',
  '/dev', // dev-only POC pages (gated to development in the page itself)
];

// Routes that require authentication but NOT premium
const AUTH_ONLY_ROUTES = ['/premium'];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'));
}

function isAuthOnlyRoute(pathname: string): boolean {
  return AUTH_ONLY_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'));
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api/');
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const pathname = decodeURIComponent(request.nextUrl.pathname || '');
  response.headers.set('x-pathname', pathname);

  // API routes (incl. Better Auth's /api/auth/*) handle their own auth.
  if (isApiRoute(pathname)) return response;
  if (isPublicRoute(pathname)) return response;

  // Logged-in check — read the signed session cookie LOCALLY (no network). This
  // can't transiently fail, so a valid session is never falsely bounced to login.
  if (!getSessionCookie(request)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated but premium not required here.
  if (isAuthOnlyRoute(pathname)) return response;

  // Premium gate. Resolve the authoritative session via loopback; on a transient
  // failure FAIL OPEN (the cookie already proved login) rather than wrongly bounce
  // a valid premium user. If the read succeeds but the session is gone (expired),
  // send to login; if the user simply isn't premium, send to the paywall.
  const session = await authoritativeSession(request);
  if (session === null) return response; // transient — trust the cookie, allow through

  if (!session.user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (session.user.premium !== true) {
    const premiumUrl = request.nextUrl.clone();
    premiumUrl.pathname = '/premium';
    return NextResponse.redirect(premiumUrl);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
