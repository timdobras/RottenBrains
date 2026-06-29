import { NextRequest, NextResponse } from 'next/server';
import { pollJellyfinWatchHistory } from '@/lib/jellyfin/sync';
import { logger } from '@/lib/logger';
import { getCurrentUser } from '@/lib/server/current-user';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('[Jellyfin poll] Manual sync triggered by user', { userId: user.id });

    const result = await pollJellyfinWatchHistory(user.id);

    logger.info('[Jellyfin poll] Manual sync completed', {
      userId: user.id,
      processed: result.itemsProcessed,
      synced: result.itemsSynced,
      skipped: result.itemsSkipped,
      errors: result.errors.length,
    });

    return NextResponse.json({
      success: result.success,
      itemsProcessed: result.itemsProcessed,
      itemsSynced: result.itemsSynced,
      itemsSkipped: result.itemsSkipped,
      errors: result.errors,
    });
  } catch (error) {
    logger.error('Error in Jellyfin poll endpoint:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
