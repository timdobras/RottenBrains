'use server';

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/server/current-user';
import { handleError as handleAppError } from '@/lib/errors';
import { logger } from '@/lib/logger';

/**
 * Server-action ports of the *inline* supabase data calls that previously lived
 * in client components (`supabase.from(...)` / `supabase.rpc(...)`). Moving them
 * behind `'use server'` lets each run Prisma server-side; the call site just
 * `await`s the action instead of poking supabase-js from the browser.
 *
 * Conventions mirror `lib/db/queries.ts` / `lib/db/client-actions.ts`:
 * `prisma.<model>` for table CRUD, identity from `getCurrentUserId()`, and
 * RLS-equivalent ownership enforced in the `where` clause (a user can only touch their own
 * rows) using `updateMany`/`deleteMany` so a non-owner attempt is a safe no-op.
 *
 * Storage (`supabase.storage.*`), auth (`supabase.auth.*`) and realtime
 * (`.channel()`) calls are intentionally NOT ported here — they belong to other
 * migration phases and are left untouched in their components.
 */

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

// ── Comments ──────────────────────────────────────────────────────────────

/**
 * Insert a comment (or reply) and bump the post's comment counter.
 *
 * Unlike `likes` (whose `total_likes` is maintained by the `trg_likes_count`
 * trigger), `posts.total_comments` has NO count trigger — the old client called
 * the real `increment_comments` RPC after inserting. We replicate that here as a
 * single transaction so the insert + increment stay consistent.
 *
 * Identity is resolved server-side (RLS equivalent: `user_id = auth.uid()`), so
 * the comment is always authored as the authenticated user.
 *
 * Returns the post's new `total_comments` (post-increment, authoritative) so the
 * caller can update its displayed count without a full reload. Replies count too
 * — every comment row bumps the same counter.
 */
export async function addComment(params: {
  postId: string;
  content: string;
  parentId?: string | null;
}): Promise<{ total_comments: number }> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('You must be logged in to comment');

  const content = params.content.trim();
  if (!content) throw new Error('Comment content is required');

  try {
    const [, updatedPost] = await prisma.$transaction([
      prisma.comments.create({
        data: {
          post_id: params.postId,
          user_id: userId,
          content,
          parent_id: params.parentId ?? null,
        },
      }),
      prisma.posts.update({
        where: { id: params.postId },
        data: { total_comments: { increment: 1 } },
        select: { total_comments: true },
      }),
    ]);
    // bigint → number for the JSON/client boundary.
    return { total_comments: Number(updatedPost.total_comments ?? 0) };
  } catch (error) {
    logger.error('Database error in addComment:', error);
    handleAppError(error, 'addComment');
    throw error;
  }
}

// ── Posts ─────────────────────────────────────────────────────────────────

export interface PostInput {
  media_id: number;
  media_type: string;
  vote_user: number;
  review_user: string;
  season_number: number | null;
  image_path: string | null;
}

/** Create a post authored by the current user. Returns `{ error }` (null on success). */
export async function createPost(input: PostInput): Promise<{ error: string | null }> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: 'You must be logged in to post' };

  try {
    await prisma.posts.create({
      data: {
        creatorid: userId,
        media_id: Number(input.media_id),
        media_type: input.media_type,
        vote_user: Number(input.vote_user),
        review_user: input.review_user,
        season_number: input.season_number,
        image_path: input.image_path,
      },
    });
    return { error: null };
  } catch (error) {
    logger.error('Database error in createPost:', error);
    return { error: error instanceof Error ? error.message : 'Failed to create post' };
  }
}

/**
 * Update an existing post. Ownership-scoped: only the creator can edit
 * (`updateMany` on `{ id, creatorid }` → no-op for non-owners).
 */
export async function updatePost(
  postId: string,
  input: PostInput
): Promise<{ error: string | null }> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: 'You must be logged in to edit a post' };

  try {
    const result = await prisma.posts.updateMany({
      where: { id: postId, creatorid: userId },
      data: {
        media_id: Number(input.media_id),
        media_type: input.media_type,
        vote_user: Number(input.vote_user),
        review_user: input.review_user,
        season_number: input.season_number,
        image_path: input.image_path,
      },
    });
    if (result.count === 0) return { error: 'Post not found or not owned by you' };
    return { error: null };
  } catch (error) {
    logger.error('Database error in updatePost:', error);
    return { error: error instanceof Error ? error.message : 'Failed to update post' };
  }
}

/** Delete a post. Ownership-scoped to the creator. */
export async function deletePost(postId: string): Promise<{ error: string | null }> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: 'You must be logged in to delete a post' };

  try {
    await prisma.posts.deleteMany({ where: { id: postId, creatorid: userId } });
    return { error: null };
  } catch (error) {
    logger.error('Database error in deletePost:', error);
    return { error: error instanceof Error ? error.message : 'Failed to delete post' };
  }
}

// ── User settings (profile) ─────────────────────────────────────────────────

/**
 * Update the current user's editable profile fields. Identity comes from the
 * session (RLS equivalent: a user can only edit their own row).
 */
export async function updateUserSettings(input: {
  name: string;
  username: string;
  bio: string;
}): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('You must be logged in to update settings');

  try {
    await prisma.users.update({
      where: { id: userId },
      data: { name: input.name, username: input.username, bio: input.bio },
    });
  } catch (error) {
    logger.error('Database error in updateUserSettings:', error);
    handleAppError(error, 'updateUserSettings');
    throw error;
  }
}

// ── VPN known IP addresses ──────────────────────────────────────────────────

export interface IpAddressRow {
  id: string;
  ip_address: string;
  label: string | null;
  is_trusted: boolean;
  created_at: string;
}

/** List a user's saved IP addresses, newest first. */
export async function getIpAddresses(userId: string): Promise<IpAddressRow[]> {
  try {
    const rows = await prisma.user_ip_addresses.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
    return rows.map((row) => ({
      id: row.id,
      // ip_address is an `inet` column — Prisma returns it as a string.
      ip_address: String(row.ip_address),
      label: row.label ?? null,
      is_trusted: row.is_trusted ?? false,
      created_at: row.created_at ? row.created_at.toISOString() : '',
    }));
  } catch (error) {
    logger.error('Error fetching IP addresses:', error);
    throw error;
  }
}

/**
 * Add a known IP for the user. Returns `{ error: { code } | null }` so the
 * caller can still distinguish a duplicate (`23505`, mapped from Prisma's
 * `P2002`) from a generic failure, exactly as the supabase version did.
 */
export async function addIpAddress(params: {
  userId: string;
  ipAddress: string;
  label?: string | null;
}): Promise<{ error: { code: string } | null }> {
  try {
    await prisma.user_ip_addresses.create({
      data: {
        user_id: params.userId,
        ip_address: params.ipAddress,
        label: params.label || null,
        is_trusted: true,
      },
    });
    return { error: null };
  } catch (error) {
    logger.error('Error adding IP address:', error);
    if (isUniqueViolation(error)) return { error: { code: '23505' } };
    return { error: { code: 'unknown' } };
  }
}

/** Delete one of the user's saved IPs. Ownership-scoped via `user_id`. */
export async function deleteIpAddress(id: string, userId: string): Promise<void> {
  try {
    await prisma.user_ip_addresses.deleteMany({ where: { id, user_id: userId } });
  } catch (error) {
    logger.error('Error deleting IP address:', error);
    throw error;
  }
}

/** Flip the trusted flag on one of the user's saved IPs. Ownership-scoped. */
export async function setIpTrusted(
  id: string,
  userId: string,
  isTrusted: boolean
): Promise<void> {
  try {
    await prisma.user_ip_addresses.updateMany({
      where: { id, user_id: userId },
      data: { is_trusted: isTrusted },
    });
  } catch (error) {
    logger.error('Error updating IP address:', error);
    throw error;
  }
}

// ── Jellyfin integration ────────────────────────────────────────────────────

export interface JellyfinConfig {
  id: string;
  server_url: string;
  jellyfin_user_id: string;
  jellyfin_username: string | null;
  sync_enabled: boolean;
  webhook_secret: string;
  created_at: string;
}

/**
 * Resolve the current user's Jellyfin config, or null.
 *
 * Post-families model: a per-member `integration_member_links` row pointing at a
 * shared `family_integrations` row of type 'jellyfin' (server_url + webhook live
 * on the integration; the per-user jellyfin id/sync live on the link). The
 * returned shape (incl. `id` = the link id) matches the component's row type.
 */
export async function getJellyfinConfig(userId: string): Promise<JellyfinConfig | null> {
  try {
    const link = await prisma.integration_member_links.findFirst({
      where: { user_id: userId, family_integrations: { type: 'jellyfin' } },
      orderBy: { created_at: 'asc' },
      select: {
        id: true,
        sync_enabled: true,
        external_user_id: true,
        external_username: true,
        created_at: true,
        family_integrations: { select: { server_url: true, webhook_secret: true } },
      },
    });
    if (!link) return null;
    return {
      id: link.id,
      server_url: link.family_integrations.server_url ?? '',
      jellyfin_user_id: link.external_user_id ?? '',
      jellyfin_username: link.external_username,
      sync_enabled: link.sync_enabled,
      webhook_secret: link.family_integrations.webhook_secret,
      created_at: link.created_at.toISOString(),
    };
  } catch (error) {
    logger.error('Error loading Jellyfin config:', error);
    throw error;
  }
}

/** Enable/disable watch-history sync on the caller's own member link. */
export async function setJellyfinSyncEnabled(linkId: string, enabled: boolean): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');
  try {
    await prisma.integration_member_links.updateMany({
      where: { id: linkId, user_id: userId },
      data: { sync_enabled: enabled, updated_at: new Date() },
    });
  } catch (error) {
    logger.error('Error toggling Jellyfin sync:', error);
    throw error;
  }
}

/** Remove the caller's own Jellyfin member link. */
export async function deleteJellyfinConfig(linkId: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');
  try {
    await prisma.integration_member_links.deleteMany({ where: { id: linkId, user_id: userId } });
  } catch (error) {
    logger.error('Error disconnecting Jellyfin:', error);
    throw error;
  }
}
