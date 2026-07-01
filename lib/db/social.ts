'use server';

import { rpc } from '@/lib/db/rpc';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/server/current-user';

/**
 * Prisma/db-server ports of the social-interaction helpers that previously used
 * the supabase-js browser client (`lib/client/updatePostData`, `updateFollowingData`,
 * `searchUsers`, `commentLikes`). Those hit Supabase cloud while posts/comments
 * live on db-server — a split brain. These server actions move likes/saves/follows/
 * comment-likes/search onto the same db-server the rest of `lib/db` uses.
 *
 * Signatures and return shapes mirror the old helpers exactly so callers are
 * unchanged. Writes resolve identity from the session (`getCurrentUserId`) and
 * ignore any client-supplied user id — a non-owner attempt is a safe no-op.
 * Counters are trigger-owned: `likes` bumps `posts.total_likes` via
 * `trg_likes_count`; comment likes call the increment/decrement functions.
 */

type MutationResult = { data: any; error: any };

// ── Saves ───────────────────────────────────────────────────────────────────

export async function savePost(_userId: string, postId: string): Promise<MutationResult> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');
    // Idempotent: unique(user_id, post_id) + skipDuplicates → re-save is a no-op.
    await prisma.saves.createMany({
      data: [{ user_id: userId, post_id: postId }],
      skipDuplicates: true,
    });
    return { data: null, error: null };
  } catch (error) {
    logger.error('Error during savePost:', error);
    return { data: null, error };
  }
}

export async function removeSave(_userId: string, postId: string): Promise<MutationResult> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');
    await prisma.saves.deleteMany({ where: { user_id: userId, post_id: postId } });
    return { data: null, error: null };
  } catch (error) {
    logger.error('Error during removeSave:', error);
    return { data: null, error };
  }
}

export async function getSavedStatus(userId: string, postId: string): Promise<boolean> {
  try {
    const row = await prisma.saves.findFirst({
      where: { user_id: userId, post_id: postId },
      select: { id: true },
    });
    return row !== null;
  } catch {
    return false;
  }
}

// ── Likes ───────────────────────────────────────────────────────────────────

export async function likePost(_userId: string, postId: string): Promise<MutationResult> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');
    // Idempotent like; posts.total_likes is maintained by the trg_likes_count trigger.
    await prisma.likes.createMany({
      data: [{ user_id: userId, post_id: postId }],
      skipDuplicates: true,
    });
    return { data: null, error: null };
  } catch (error) {
    logger.error('Error during likePost:', error);
    return { data: null, error };
  }
}

export async function removeLike(_userId: string, postId: string): Promise<MutationResult> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');
    // total_likes is decremented by the trg_likes_count trigger.
    await prisma.likes.deleteMany({ where: { user_id: userId, post_id: postId } });
    return { data: null, error: null };
  } catch (error) {
    logger.error('Error during removeLike:', error);
    return { data: null, error };
  }
}

export async function getLikedStatus(userId: string, postId: string): Promise<boolean> {
  try {
    const row = await prisma.likes.findFirst({
      where: { user_id: userId, post_id: postId },
      select: { id: true },
    });
    return row !== null;
  } catch {
    return false;
  }
}

// ── Follows ─────────────────────────────────────────────────────────────────

export async function followUser(_userId: string, user_to_follow_id: string) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');
    // No unique constraint on follows → guard against a duplicate follow row.
    const existing = await prisma.follows.findFirst({
      where: { user_id: userId, following_id: user_to_follow_id },
      select: { id: true },
    });
    if (!existing) {
      await prisma.follows.create({
        data: { user_id: userId, following_id: user_to_follow_id },
      });
    }
    return { data: null, error: null };
  } catch (error) {
    logger.error('Error following user:', error);
    return;
  }
}

export async function unFollowUser(_userId: string, user_to_follow_id: string) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');
    await prisma.follows.deleteMany({
      where: { user_id: userId, following_id: user_to_follow_id },
    });
    return { data: null, error: null };
  } catch (error) {
    logger.error('Error unfollowing user:', error);
    return { data: null, error };
  }
}

export async function getFollowStatus(userId: string, user_to_follow_id: string): Promise<boolean> {
  try {
    const row = await prisma.follows.findFirst({
      where: { user_id: userId, following_id: user_to_follow_id },
      select: { id: true },
    });
    return row !== null;
  } catch {
    return false;
  }
}

// ── Comment likes ───────────────────────────────────────────────────────────

/** Which of the given comment ids the user has liked. Empty set on any error. */
export async function getLikedCommentIds(
  userId: string | undefined,
  commentIds: string[]
): Promise<Set<string>> {
  if (!userId || !commentIds.length) return new Set();
  try {
    const rows = await prisma.comment_likes.findMany({
      where: { user_id: userId, comment_id: { in: commentIds } },
      select: { comment_id: true },
    });
    return new Set(rows.map((r) => r.comment_id));
  } catch {
    return new Set();
  }
}

/** Like/unlike a comment, keeping comments.total_likes in step via the RPCs. */
export async function toggleCommentLike(
  _userId: string | undefined,
  commentId: string,
  like: boolean
): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');
  if (like) {
    // Only increment when a new row is actually inserted (no double-count).
    const existing = await prisma.comment_likes.findFirst({
      where: { user_id: userId, comment_id: commentId },
      select: { id: true },
    });
    if (existing) return;
    await prisma.comment_likes.create({ data: { user_id: userId, comment_id: commentId } });
    await rpc('increment_comment_likes', { p_comment_id: commentId });
  } else {
    const res = await prisma.comment_likes.deleteMany({
      where: { user_id: userId, comment_id: commentId },
    });
    if (res.count > 0) await rpc('decrement_comment_likes', { p_comment_id: commentId });
  }
}

// ── User search ─────────────────────────────────────────────────────────────

export async function searchUsers(searchQuery: string) {
  try {
    const q = searchQuery.trim();
    if (!q) return [];
    // Old supabase version searched a non-existent `display_name` column (so it
    // errored out); db-server has `username` + `name`.
    const data = await prisma.users.findMany({
      where: {
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 10,
    });

    const query = q.toLowerCase();
    // Rank: exact match, then starts-with, then contains.
    const ranked = [...data].sort((a: any, b: any) => {
      const aU = a.username?.toLowerCase() || '';
      const bU = b.username?.toLowerCase() || '';
      const aN = a.name?.toLowerCase() || '';
      const bN = b.name?.toLowerCase() || '';
      if (aU === query || aN === query) return -1;
      if (bU === query || bN === query) return 1;
      if (aU.startsWith(query) || aN.startsWith(query)) return -1;
      if (bU.startsWith(query) || bN.startsWith(query)) return 1;
      return 0;
    });
    return ranked;
  } catch (error) {
    logger.error('Error in searchUsers:', error);
    return null;
  }
}
