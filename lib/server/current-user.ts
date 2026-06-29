import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

/**
 * Identity seam — the single place the app resolves the current user.
 *
 * Now backed by Better Auth (was Supabase during the data-migration phase).
 * Every migrated data module + API route calls these helpers, so flipping this
 * one file moved the whole app's identity over. Request-scoped memoized.
 */
export const getCurrentUser = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
});

export async function getCurrentUserId(): Promise<string | null> {
  return (await getCurrentUser())?.id ?? null;
}
