import { NextRequest, NextResponse } from 'next/server';
import { authenticateByName, getServerInfo } from '@/lib/jellyfin/client';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/jellyfin/auth
 *
 * Authenticates with a Jellyfin server using username and password.
 * Returns an access token scoped to the authenticated user and saves the config.
 * The password is used once for authentication and is NOT stored.
 *
 * Body: { server_url, username, password }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate the RottenBrains user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { server_url, username, password } = body;

    if (!server_url || !username || !password) {
      return NextResponse.json(
        { error: 'Missing required fields: server_url, username, password' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      const urlToTest = server_url.startsWith('http') ? server_url : `http://${server_url}`;
      new URL(urlToTest);
    } catch {
      return NextResponse.json({ error: 'Invalid server URL format' }, { status: 400 });
    }

    // Authenticate with Jellyfin
    const authResult = await authenticateByName(server_url, username, password);

    // Fetch server name for display
    let serverName = '';
    try {
      const serverInfo = await getServerInfo({
        server_url,
        api_key: authResult.accessToken,
      });
      serverName = serverInfo.ServerName || '';
    } catch {
      // Non-critical — the connection works, we just couldn't get the name
    }

    // Save the configuration
    const { error: upsertError } = await supabase.from('user_jellyfin_config').upsert(
      {
        user_id: user.id,
        server_url,
        api_key: authResult.accessToken,
        jellyfin_user_id: authResult.userId,
        jellyfin_username: authResult.userName,
        sync_enabled: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (upsertError) {
      logger.error('Failed to save Jellyfin config:', upsertError);
      return NextResponse.json(
        { success: false, error: 'Authentication succeeded but failed to save configuration' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      serverName,
      jellyfinUserName: authResult.userName,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication failed';
    logger.error('Error in Jellyfin auth endpoint:', { error: message });

    // Return a user-friendly error for invalid credentials
    if (message === 'Invalid username or password') {
      return NextResponse.json({ success: false, error: message }, { status: 401 });
    }

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
