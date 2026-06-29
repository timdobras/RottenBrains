import 'server-only';
import { headers } from 'next/headers';
import { cache } from 'react';
import { auth } from '@/lib/auth';

/**
 * Server-side session/user access (replaces `supabase.auth.getUser()` /
 * `getCurrentUser()`). Request-scoped memoized so multiple server components
 * in one render share a single lookup.
 */
export const getServerSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

export const getServerUser = cache(async () => {
  const session = await getServerSession();
  return session?.user ?? null;
});

/** Convenience: the current user id or null. */
export async function getServerUserId(): Promise<string | null> {
  const user = await getServerUser();
  return user?.id ?? null;
}
