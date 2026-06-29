import { NextRequest, NextResponse } from 'next/server';
import { removeMember } from '@/lib/family/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/family/members — remove a member from a family.
 * Admins can remove anyone (except the owner); members can remove themselves (leave).
 * Body: { familyId, userId }
 */
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const familyId = typeof body.familyId === 'string' ? body.familyId : '';
  const targetUserId = typeof body.userId === 'string' ? body.userId : '';
  if (!familyId || !targetUserId) {
    return NextResponse.json({ error: 'familyId and userId are required' }, { status: 400 });
  }

  try {
    await removeMember(user.id, familyId, targetUserId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to remove member';
    const status = message.includes('admins') || message.includes('owner') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
