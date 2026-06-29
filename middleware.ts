import { type NextRequest, NextResponse } from 'next/server';

type SessionUser = { id: string; premium?: boolean };
type Session = { user?: SessionUser } | null;

// Resolve the current session via the Better Auth endpoint — edge-safe (plain
// fetch, no Prisma) and DB-backed, so `premium` is always authoritative. This
// is Better Auth's recommended middleware pattern; cost is one local HTTP hop
// per protected request (same as the old Supabase getUser()).
async function getSession(request: NextRequest): Promise<Session> {
  try {
    const res = await fetch(`${request.nextUrl.origin}/api/auth/get-session`, {
      headers: { cookie: request.headers.get('cookie') || '' },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as Session;
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

  const session = await getSession(request);
  const user = session?.user ?? null;

  // Not authenticated → login.
  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated but premium not required here.
  if (isAuthOnlyRoute(pathname)) return response;

  // Premium gate (authoritative — `premium` comes from the DB-backed session).
  if (user.premium !== true) {
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
