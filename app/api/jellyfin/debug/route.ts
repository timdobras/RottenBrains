import { NextRequest, NextResponse } from 'next/server';
import { validateConnection } from '@/lib/jellyfin/client';
import { getJellyfinConfigForPlayback } from '@/lib/jellyfin/sync';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/server/current-user';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await getJellyfinConfigForPlayback(user.id);

    if (!config) {
      return NextResponse.json({
        configured: false,
        message: 'No Jellyfin configuration found',
      });
    }

    const webhookUrl = `${req.nextUrl.origin}/api/jellyfin/webhook?token=${config.webhook_secret}`;

    const connectivityResult = await validateConnection(
      config.server_url,
      config.api_key,
      config.jellyfin_user_id
    );

    const watchHistoryStats = await prisma.watch_history.findMany({
      where: {
        user_id: user.id,
        sync_source: 'jellyfin',
      },
      select: {
        media_type: true,
        media_id: true,
        percentage_watched: true,
        sync_source: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      configured: true,
      syncEnabled: config.sync_enabled,
      serverUrl: config.server_url,
      webhookUrl,
      serverName: connectivityResult.serverName,
      serverReachable: connectivityResult.valid,
      serverError: connectivityResult.error || null,
      jellyfinWatchHistory: watchHistoryStats || [],
    });
  } catch (error) {
    logger.error('Error in Jellyfin debug endpoint:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
