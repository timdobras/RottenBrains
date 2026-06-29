import { NextRequest, NextResponse } from 'next/server';
import { authenticateByName, getServerInfo } from '@/lib/jellyfin/client';
import { linkJellyfinAccount } from '@/lib/jellyfin/sync';
import { logger } from '@/lib/logger';
import { getCurrentUser } from '@/lib/server/current-user';

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
    // Authenticate the RottenBrains user
    const user = await getCurrentUser();

    if (!user) {
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

    // Connect the account — attaches/creates the family Jellyfin integration
    // and the user's personal member link.
    try {
      await linkJellyfinAccount({
        userId: user.id,
        serverUrl: server_url,
        apiKey: authResult.accessToken,
        jellyfinUserId: authResult.userId,
        jellyfinUsername: authResult.userName,
      });
    } catch (linkError) {
      logger.error('Failed to save Jellyfin config:', linkError);
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
