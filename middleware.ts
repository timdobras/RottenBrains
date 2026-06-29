import { type NextRequest, NextResponse } from 'next/server';
import { getSessionCookie, getCookieCache } from 'better-auth/cookies';

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

  // Logged-in check — edge-safe, cookie only (no DB call). Optimistic: presence
  // of the Better Auth session cookie means logged in; pages revalidate.
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthOnlyRoute(pathname)) return response;

  // Premium gate. `premium` is a Better Auth user field, so it's in the signed
  // cookie-cached session — readable here with no DB round-trip (replaces the
  // old HMAC premium cookie). When the cache is stale (older than its maxAge)
  // we let the request through and let the page enforce, rather than risk a
  // false logout/paywall.
  const cached = await getCookieCache(request);
  const premium = (cached?.user as { premium?: boolean } | undefined)?.premium;
  if (cached?.user && premium !== true) {
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
