/**
 * Family server-side helpers
 *
 * A "family" is a household group that owns integrations (Jellyfin, and later
 * Jellyseerr / Sonarr / Radarr). Members of a family share access to the
 * family's integrations.
 *
 * These helpers use the service-role client (RLS-bypassing) and therefore
 * enforce authorization explicitly. Always pass the *authenticated* user id —
 * routes must verify the session (supabase.auth.getUser()) before calling.
 */

import { logger } from '@/lib/logger';
import { createServiceClient } from '@/lib/supabase/serviceClient';

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
  const supabase = createServiceClient();

  const { data: owned } = await supabase
    .from('family_members')
    .select('family_id, families!inner(owner_id, created_at)')
    .eq('user_id', userId)
    .eq('role', 'owner')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (owned?.family_id) {
    return owned.family_id;
  }

  // No owned family — create a personal one named after the user.
  const { data: profile } = await supabase
    .from('users')
    .select('name, username')
    .eq('id', userId)
    .maybeSingle();

  const label = profile?.name || profile?.username || 'My';
  return createFamily(userId, `${label}'s Family`);
}

/**
 * Create a new family owned by the user and add them as the owner member.
 * Returns the new family id.
 */
export async function createFamily(userId: string, name: string): Promise<string> {
  const supabase = createServiceClient();

  const { data: family, error } = await supabase
    .from('families')
    .insert({ name: name.trim() || 'My Family', owner_id: userId })
    .select('id')
    .single();

  if (error || !family) {
    throw new Error(`Failed to create family: ${error?.message ?? 'unknown error'}`);
  }

  const { error: memberError } = await supabase
    .from('family_members')
    .insert({ family_id: family.id, user_id: userId, role: 'owner' });

  if (memberError) {
    // Best-effort cleanup so we don't leave an ownerless family behind.
    await supabase.from('families').delete().eq('id', family.id);
    throw new Error(`Failed to add owner to family: ${memberError.message}`);
  }

  return family.id;
}

/** List all families the user belongs to, with members and the user's role. */
export async function listUserFamilies(userId: string): Promise<FamilyWithMembers[]> {
  const supabase = createServiceClient();

  const { data: memberships, error } = await supabase
    .from('family_members')
    .select('family_id, role, families!inner(id, name, owner_id, created_at)')
    .eq('user_id', userId);

  if (error || !memberships?.length) return [];

  const familyIds = memberships.map((m) => m.family_id);

  const { data: allMembers } = await supabase
    .from('family_members')
    .select('family_id, user_id, role, created_at')
    .in('family_id', familyIds);

  // family_members.user_id FKs to auth.users, so PostgREST can't embed public.users
  // directly — fetch the profiles separately and merge by id.
  const memberUserIds = [...new Set((allMembers ?? []).map((am) => am.user_id))];
  const { data: profiles } = await supabase
    .from('users')
    .select('id, username, name, image_url')
    .in('id', memberUserIds);
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  return memberships.map((m) => {
    const fam = m.families as unknown as {
      id: string;
      name: string;
      owner_id: string;
      created_at: string;
    };
    return {
      id: fam.id,
      name: fam.name,
      owner_id: fam.owner_id,
      created_at: fam.created_at,
      role: m.role as FamilyRole,
      members: (allMembers ?? [])
        .filter((am) => am.family_id === fam.id)
        .map((am) => ({
          user_id: am.user_id,
          role: am.role as FamilyRole,
          created_at: am.created_at,
          user: profileMap.get(am.user_id) ?? null,
        })),
    };
  });
}

/** Whether the user is an owner/admin of the family. */
export async function isFamilyAdmin(userId: string, familyId: string): Promise<boolean> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('family_members')
    .select('role')
    .eq('family_id', familyId)
    .eq('user_id', userId)
    .maybeSingle();
  return data?.role === 'owner' || data?.role === 'admin';
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

  const supabase = createServiceClient();
  const expiresAt =
    opts.expiresInDays && opts.expiresInDays > 0
      ? new Date(Date.now() + opts.expiresInDays * 86_400_000).toISOString()
      : null;

  const { data, error } = await supabase
    .from('family_invites')
    .insert({
      family_id: familyId,
      created_by: userId,
      expires_at: expiresAt,
      max_uses: opts.maxUses ?? null,
    })
    .select('code')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create invite: ${error?.message ?? 'unknown error'}`);
  }
  return { code: data.code };
}

/**
 * Redeem an invite code, adding the user to the family as a member.
 * Idempotent: re-redeeming when already a member is a no-op success.
 */
export async function redeemInvite(
  userId: string,
  code: string
): Promise<{ familyId: string; familyName: string }> {
  const supabase = createServiceClient();

  const { data: invite } = await supabase
    .from('family_invites')
    .select('id, family_id, expires_at, max_uses, uses, families!inner(name)')
    .eq('code', code.trim())
    .maybeSingle();

  if (!invite) {
    throw new Error('Invalid invite code');
  }
  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
    throw new Error('This invite has expired');
  }
  if (invite.max_uses != null && invite.uses >= invite.max_uses) {
    throw new Error('This invite has reached its usage limit');
  }

  const familyName = (invite.families as unknown as { name: string }).name;

  // Already a member? No-op.
  const { data: existing } = await supabase
    .from('family_members')
    .select('id')
    .eq('family_id', invite.family_id)
    .eq('user_id', userId)
    .maybeSingle();

  if (!existing) {
    const { error: insertError } = await supabase
      .from('family_members')
      .insert({ family_id: invite.family_id, user_id: userId, role: 'member' });
    if (insertError) {
      throw new Error(`Failed to join family: ${insertError.message}`);
    }
    await supabase
      .from('family_invites')
      .update({ uses: invite.uses + 1 })
      .eq('id', invite.id);
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
  const supabase = createServiceClient();

  const { data: family } = await supabase
    .from('families')
    .select('owner_id')
    .eq('id', familyId)
    .maybeSingle();

  if (!family) throw new Error('Family not found');
  if (targetUserId === family.owner_id) {
    throw new Error('The family owner cannot be removed');
  }

  const isSelf = actingUserId === targetUserId;
  if (!isSelf && !(await isFamilyAdmin(actingUserId, familyId))) {
    throw new Error('Only family admins can remove other members');
  }

  const { error } = await supabase
    .from('family_members')
    .delete()
    .eq('family_id', familyId)
    .eq('user_id', targetUserId);

  if (error) {
    logger.error('Failed to remove family member', { familyId, targetUserId, error: error.message });
    throw new Error('Failed to remove member');
  }
}
