import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from './lib/supabase/middleware';
import {
  PREMIUM_COOKIE_NAME,
  signPremiumStatus,
  verifyPremiumStatus,
} from './lib/auth/premiumCookie';

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
  const { response, user, supabase } = await updateSession(request);

  const pathname = decodeURIComponent(request.nextUrl.pathname || '');
  response.headers.set('x-pathname', pathname);

  // Allow API routes through — they handle their own auth
  if (isApiRoute(pathname)) {
    return response;
  }

  // Allow public routes through without any auth check
  if (isPublicRoute(pathname)) {
    return response;
  }

  // If user is not authenticated, redirect to login
  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', pathname);
    const redirectResponse = NextResponse.redirect(loginUrl);
    // Copy session cookies to the redirect response
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    return redirectResponse;
  }

  // For routes that only need auth (not premium), allow through
  if (isAuthOnlyRoute(pathname)) {
    return response;
  }

  // Check premium status from a SIGNED cookie first to avoid a DB query on
  // every request. The cookie value is HMAC-signed and bound to this user id,
  // so it cannot be forged or replayed (an unsigned `premium_status=true`
  // previously let anyone bypass the paywall).
  const premiumCookie = request.cookies.get(PREMIUM_COOKIE_NAME);
  const cached = await verifyPremiumStatus(premiumCookie?.value, user.id);

  let isPremium: boolean;

  if (cached !== null) {
    // Signature valid and not expired — trust the cached value.
    isPremium = cached;
  } else {
    // Cookie missing, expired, tampered with, or no signing secret configured
    // — fall back to the authoritative DB check.
    const { data: userData } = await supabase
      .from('users')
      .select('premium')
      .eq('id', user.id)
      .single();

    isPremium = userData?.premium === true;

    // Cache the result in a signed cookie for 5 minutes. If no secret is
    // configured signPremiumStatus returns null and we skip the cookie,
    // falling back to a DB check every request (correct but slower).
    const signed = await signPremiumStatus(user.id, isPremium);
    if (signed) {
      response.cookies.set(PREMIUM_COOKIE_NAME, signed, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 5 * 60, // 5 minutes
        path: '/',
      });
    }
  }

  if (!isPremium) {
    const premiumUrl = request.nextUrl.clone();
    premiumUrl.pathname = '/premium';
    const redirectResponse = NextResponse.redirect(premiumUrl);
    // Copy session cookies to the redirect response
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
