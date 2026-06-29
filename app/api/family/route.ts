import { NextRequest, NextResponse } from 'next/server';
import { createFamily, listUserFamilies } from '@/lib/family/server';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/** GET /api/family — list the families the current user belongs to. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const families = await listUserFamilies(user.id);
    return NextResponse.json({ families });
  } catch (error) {
    logger.error('Failed to list families', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    return NextResponse.json({ error: 'Failed to list families' }, { status: 500 });
  }
}

/** POST /api/family — create a new family owned by the current user. Body: { name } */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) return NextResponse.json({ error: 'Family name is required' }, { status: 400 });

  try {
    const familyId = await createFamily(user.id, name);
    return NextResponse.json({ success: true, familyId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create family' },
      { status: 500 }
    );
  }
}
