import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from './lib/supabase/middleware';

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

  // Check premium status from cookie first to avoid DB query on every request
  const premiumCookie = request.cookies.get('premium_status');
  let isPremium = false;

  if (premiumCookie?.value === 'true') {
    // Cookie exists and is valid — skip DB query
    isPremium = true;
  } else {
    // Cookie missing or expired — check DB and set cookie
    const { data: userData } = await supabase
      .from('users')
      .select('premium')
      .eq('id', user.id)
      .single();

    isPremium = userData?.premium === true;

    // Cache premium status in a cookie for 5 minutes
    response.cookies.set('premium_status', isPremium ? 'true' : 'false', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 5 * 60, // 5 minutes
      path: '/',
    });
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
