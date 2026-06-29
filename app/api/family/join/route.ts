import { NextRequest, NextResponse } from 'next/server';
import { redeemInvite } from '@/lib/family/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/family/join — redeem an invite code to join a family.
 * Body: { code }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const code = typeof body.code === 'string' ? body.code.trim() : '';
  if (!code) return NextResponse.json({ error: 'Invite code is required' }, { status: 400 });

  try {
    const { familyId, familyName } = await redeemInvite(user.id, code);
    return NextResponse.json({ success: true, familyId, familyName });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to join family';
    const status = message.includes('Invalid') ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
