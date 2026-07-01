/**
 * Follow/unfollow helpers. Ported off the supabase-js browser client (Supabase
 * cloud) onto Prisma/db-server server actions in `lib/db/social`. Re-exported
 * from here so existing import paths keep working unchanged.
 */
export { followUser, unFollowUser, getFollowStatus } from '@/lib/db/social';
