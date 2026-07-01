/**
 * Family server-side helpers
 *
 * A "family" is a household group that owns integrations (Jellyfin, and later
 * Jellyseerr / Sonarr / Radarr). Members of a family share access to the
 * family's integrations.
 *
 * These helpers run server-side via Prisma (db-server) and enforce authorization
 * explicitly. Always pass the *authenticated* user id — routes must verify the
 * session (Better Auth `getServerUser()`) before calling.
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

export type FamilyRole = 'owner' | 'admin' | 'member';

export interface FamilyMemberRow {
  user_id: string;
  role: FamilyRole;
  created_at: string;
  user?: {
    id: string;
    username: string | null;
    name: string | null;
    image_url: string | null;
  } | null;
}

export interface FamilyWithMembers {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  role: FamilyRole;
  members: FamilyMemberRow[];
}

/**
 * Return the user's "primary" family — the first family they own — creating a
 * personal one if they don't own any yet. Used as the default attach point when
 * a user connects an integration before explicitly creating a family.
 */
export async function getOrCreatePrimaryFamily(userId: string): Promise<string> {
  const owned = await prisma.family_members.findFirst({
    where: { user_id: userId, role: 'owner' },
    orderBy: { families: { created_at: 'asc' } },
    select: { family_id: true },
  });

  if (owned?.family_id) {
    return owned.family_id;
  }

  // No owned family — create a personal one named after the user.
  const profile = await prisma.users.findUnique({
    where: { id: userId },
    select: { name: true, username: true },
  });

  const label = profile?.name || profile?.username || 'My';
  return createFamily(userId, `${label}'s Family`);
}

/**
 * Create a new family owned by the user and add them as the owner member.
 * Returns the new family id.
 */
export async function createFamily(userId: string, name: string): Promise<string> {
  try {
    // Transaction: family + owner member are created together or not at all
    // (no ownerless family left behind on failure).
    return await prisma.$transaction(async (tx) => {
      const family = await tx.families.create({
        data: { name: name.trim() || 'My Family', owner_id: userId },
        select: { id: true },
      });
      await tx.family_members.create({
        data: { family_id: family.id, user_id: userId, role: 'owner' },
      });
      return family.id;
    });
  } catch (error) {
    throw new Error(
      `Failed to create family: ${error instanceof Error ? error.message : 'unknown error'}`
    );
  }
}

/** List all families the user belongs to, with members and the user's role. */
export async function listUserFamilies(userId: string): Promise<FamilyWithMembers[]> {
  const memberships = await prisma.family_members.findMany({
    where: { user_id: userId },
    select: {
      role: true,
      families: {
        select: {
          id: true,
          name: true,
          owner_id: true,
          created_at: true,
          family_members: {
            select: {
              user_id: true,
              role: true,
              created_at: true,
              users: { select: { id: true, username: true, name: true, image_url: true } },
            },
          },
        },
      },
    },
  });

  return memberships.map((m) => ({
    id: m.families.id,
    name: m.families.name,
    owner_id: m.families.owner_id,
    created_at: m.families.created_at.toISOString(),
    role: m.role as FamilyRole,
    members: m.families.family_members.map((am) => ({
      user_id: am.user_id,
      role: am.role as FamilyRole,
      created_at: am.created_at.toISOString(),
      user: am.users
        ? {
            id: am.users.id,
            username: am.users.username,
            name: am.users.name,
            image_url: am.users.image_url,
          }
        : null,
    })),
  }));
}

/** Whether the user is an owner/admin of the family. */
export async function isFamilyAdmin(userId: string, familyId: string): Promise<boolean> {
  const member = await prisma.family_members.findFirst({
    where: { family_id: familyId, user_id: userId },
    select: { role: true },
  });
  return member?.role === 'owner' || member?.role === 'admin';
}

export interface CreateInviteOptions {
  expiresInDays?: number | null;
  maxUses?: number | null;
}

/** Create a redeemable invite code for a family. Requires admin. */
export async function createInvite(
  userId: string,
  familyId: string,
  opts: CreateInviteOptions = {}
): Promise<{ code: string }> {
  if (!(await isFamilyAdmin(userId, familyId))) {
    throw new Error('Only family admins can create invites');
  }

  const expiresAt =
    opts.expiresInDays && opts.expiresInDays > 0
      ? new Date(Date.now() + opts.expiresInDays * 86_400_000)
      : null;

  try {
    // `code` is DB-generated (random hex) — created without a value, read back.
    const data = await prisma.family_invites.create({
      data: {
        family_id: familyId,
        created_by: userId,
        expires_at: expiresAt,
        max_uses: opts.maxUses ?? null,
      },
      select: { code: true },
    });
    return { code: data.code };
  } catch (error) {
    throw new Error(
      `Failed to create invite: ${error instanceof Error ? error.message : 'unknown error'}`
    );
  }
}

/**
 * Redeem an invite code, adding the user to the family as a member.
 * Idempotent: re-redeeming when already a member is a no-op success.
 */
export async function redeemInvite(
  userId: string,
  code: string
): Promise<{ familyId: string; familyName: string }> {
  const invite = await prisma.family_invites.findUnique({
    where: { code: code.trim() },
    select: {
      id: true,
      family_id: true,
      expires_at: true,
      max_uses: true,
      uses: true,
      families: { select: { name: true } },
    },
  });

  if (!invite) {
    throw new Error('Invalid invite code');
  }
  if (invite.expires_at && invite.expires_at.getTime() < Date.now()) {
    throw new Error('This invite has expired');
  }
  if (invite.max_uses != null && invite.uses >= invite.max_uses) {
    throw new Error('This invite has reached its usage limit');
  }

  const familyName = invite.families.name;

  // Already a member? No-op.
  const existing = await prisma.family_members.findFirst({
    where: { family_id: invite.family_id, user_id: userId },
    select: { id: true },
  });

  if (!existing) {
    try {
      await prisma.$transaction([
        prisma.family_members.create({
          data: { family_id: invite.family_id, user_id: userId, role: 'member' },
        }),
        prisma.family_invites.update({
          where: { id: invite.id },
          data: { uses: { increment: 1 } },
        }),
      ]);
    } catch (error) {
      throw new Error(
        `Failed to join family: ${error instanceof Error ? error.message : 'unknown error'}`
      );
    }
  }

  return { familyId: invite.family_id, familyName };
}

/**
 * Remove a member from a family. Admins can remove anyone (except the owner);
 * any member may remove themselves (leave).
 */
export async function removeMember(
  actingUserId: string,
  familyId: string,
  targetUserId: string
): Promise<void> {
  const family = await prisma.families.findUnique({
    where: { id: familyId },
    select: { owner_id: true },
  });

  if (!family) throw new Error('Family not found');
  if (targetUserId === family.owner_id) {
    throw new Error('The family owner cannot be removed');
  }

  const isSelf = actingUserId === targetUserId;
  if (!isSelf && !(await isFamilyAdmin(actingUserId, familyId))) {
    throw new Error('Only family admins can remove other members');
  }

  try {
    await prisma.family_members.deleteMany({
      where: { family_id: familyId, user_id: targetUserId },
    });
  } catch (error) {
    logger.error('Failed to remove family member', {
      familyId,
      targetUserId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error('Failed to remove member');
  }
}
