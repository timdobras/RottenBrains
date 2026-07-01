/**
 * User search. Ported off the supabase-js browser client (Supabase cloud) onto a
 * Prisma/db-server server action in `lib/db/social`. Re-exported from here so
 * existing import paths keep working unchanged.
 */
export { searchUsers } from '@/lib/db/social';
