// app/api/daily-new-episodes/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { dailyNewEpisodesJob } from '@/lib/new_episodes';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // If CRON_SECRET is set, require it; otherwise allow in development only
    if (cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else if (process.env.NODE_ENV !== 'development') {
      // In production without CRON_SECRET, deny all requests
      logger.warn('new-episodes endpoint called without CRON_SECRET configured');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dailyNewEpisodesJob();
    return NextResponse.json({
      message: 'Daily new episodes job completed successfully.',
    });
  } catch (error) {
    logger.error('Error in dailyNewEpisodesJob:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to run daily new episodes job.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
