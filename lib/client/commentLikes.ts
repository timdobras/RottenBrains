'use client';

import { createClient } from '@/lib/supabase/client';

// comment_likes + the increment/decrement RPCs (migration 20260624000) are now in
// the generated types. Calls still fail soft in the UI layer so a transient error
// never breaks rendering.
const db = createClient();

/** Which of the given comment ids the user has liked. Empty set on any error. */
export async function getLikedCommentIds(
  userId: string | undefined,
  commentIds: string[]
): Promise<Set<string>> {
  if (!userId || !commentIds.length) return new Set();
  try {
    const { data, error } = await db
      .from('comment_likes')
      .select('comment_id')
      .eq('user_id', userId)
      .in('comment_id', commentIds);
    if (error) throw error;
    return new Set((data ?? []).map((r: any) => r.comment_id));
  } catch {
    return new Set();
  }
}

/** Like (like=true) or unlike a comment, keeping comments.total_likes in step. */
export async function toggleCommentLike(
  userId: string | undefined,
  commentId: string,
  like: boolean
): Promise<void> {
  if (!userId) throw new Error('Not authenticated');
  if (like) {
    const { error } = await db
      .from('comment_likes')
      .insert([{ user_id: userId, comment_id: commentId }]);
    if (error) throw error;
    await db.rpc('increment_comment_likes', { p_comment_id: commentId });
  } else {
    const { error } = await db
      .from('comment_likes')
      .delete()
      .eq('user_id', userId)
      .eq('comment_id', commentId);
    if (error) throw error;
    await db.rpc('decrement_comment_likes', { p_comment_id: commentId });
  }
}
