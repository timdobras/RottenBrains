import { NextRequest, NextResponse } from 'next/server';
import { createInvite } from '@/lib/family/server';
import { getCurrentUser } from '@/lib/server/current-user';

export const dynamic = 'force-dynamic';

/**
 * POST /api/family/invite — create a redeemable invite code for a family.
 * Requires the caller to be an admin/owner of the family.
 * Body: { familyId, expiresInDays?, maxUses? }
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const familyId = typeof body.familyId === 'string' ? body.familyId : '';
  if (!familyId) return NextResponse.json({ error: 'familyId is required' }, { status: 400 });

  try {
    const { code } = await createInvite(user.id, familyId, {
      expiresInDays: typeof body.expiresInDays === 'number' ? body.expiresInDays : null,
      maxUses: typeof body.maxUses === 'number' ? body.maxUses : null,
    });
    return NextResponse.json({ success: true, code });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create invite';
    const status = message.includes('admins') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
