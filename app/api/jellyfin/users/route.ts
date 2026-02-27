import { NextRequest, NextResponse } from 'next/server';
import { listUsers } from '@/lib/jellyfin/client';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/jellyfin/users
 *
 * Lists users on a Jellyfin server.
 * Used in settings UI to let users pick which Jellyfin account to sync with.
 * Requires authentication.
 *
 * Body: { server_url, api_key }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { server_url, api_key } = body;

    if (!server_url || !api_key) {
      return NextResponse.json(
        { error: 'Missing required fields: server_url, api_key' },
        { status: 400 }
      );
    }

    const users = await listUsers(server_url, api_key);

    // Return only safe fields (no sensitive data)
    const safeUsers = users.map((u) => ({
      Id: u.Id,
      Name: u.Name,
    }));

    return NextResponse.json({ success: true, users: safeUsers });
  } catch (error) {
    logger.error('Error in Jellyfin users endpoint:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to fetch Jellyfin users. Check server URL and API key.' },
      { status: 500 }
    );
  }
}
