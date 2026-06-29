import { NextRequest, NextResponse } from 'next/server';
import { validateConnection } from '@/lib/jellyfin/client';
import { linkJellyfinAccount } from '@/lib/jellyfin/sync';
import { logger } from '@/lib/logger';
import { getCurrentUser } from '@/lib/server/current-user';

/**
 * POST /api/jellyfin/validate
 *
 * Validates a Jellyfin connection and optionally saves the config.
 * Requires authentication.
 *
 * Body: { server_url, api_key, jellyfin_user_id, save?: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { server_url, api_key, jellyfin_user_id, save } = body;

    // Validate required fields
    if (!server_url || !api_key || !jellyfin_user_id) {
      return NextResponse.json(
        { error: 'Missing required fields: server_url, api_key, jellyfin_user_id' },
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

    // Test the connection
    const result = await validateConnection(server_url, api_key, jellyfin_user_id);

    if (!result.valid) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    // Optionally save the configuration
    if (save) {
      try {
        await linkJellyfinAccount({
          userId: user.id,
          serverUrl: server_url,
          apiKey: api_key,
          jellyfinUserId: jellyfin_user_id,
        });
      } catch (linkError) {
        logger.error('Failed to save Jellyfin config:', linkError);
        return NextResponse.json(
          { success: false, error: 'Connection valid but failed to save configuration' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      serverName: result.serverName,
      saved: !!save,
    });
  } catch (error) {
    logger.error('Error in Jellyfin validate endpoint:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
