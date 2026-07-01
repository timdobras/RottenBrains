/**
 * Post like/save helpers. Ported off the supabase-js browser client (Supabase
 * cloud) onto Prisma/db-server server actions in `lib/db/social`. Re-exported
 * from here so existing import paths keep working unchanged.
 */
export {
  savePost,
  removeSave,
  getSavedStatus,
  likePost,
  removeLike,
  getLikedStatus,
} from '@/lib/db/social';
