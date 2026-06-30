import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

/**
 * Current authenticated user (Better Auth session → users row, incl. `premium`).
 * Used by the client UserContext so it reads the SAME source as the server —
 * replaces the old Supabase `supabase.auth.getUser()` client lookup, which
 * returned null after the Supabase→Better Auth migration and made the UI show
 * "Sign in"/non-premium even while the server session was valid.
 */
export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({ user: user ?? null });
}
