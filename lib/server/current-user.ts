import 'server-only';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

/**
 * Identity seam for the coexistence migration.
 *
 * During the strangler phase, auth still lives on Supabase, so this resolves
 * the current user from the Supabase session. Migrated Prisma/data modules call
 * THESE helpers (never supabase.auth directly) to get the current user id — so
 * at the final cutover we swap only this file over to Better Auth
 * (`lib/server/auth-session.ts#getServerUser`) and every data module follows.
 *
 * Request-scoped memoized so one render shares a single lookup.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export async function getCurrentUserId(): Promise<string | null> {
  return (await getCurrentUser())?.id ?? null;
}
