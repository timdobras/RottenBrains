import { NextRequest, NextResponse } from 'next/server';
import { upsertWatchHistory } from '@/lib/supabase/serverQueries';
import { logger } from '@/lib/logger';

interface WatchTimeData {
  time_spent: number;
  percentage_watched: string;
  user_id: string;
  media_type: string;
  media_id: number;
  season_number?: number | null;
  episode_number?: number | null;
}

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const data: WatchTimeData = await req.json();

    logger.debug('Received watch time request:', {
      user_id: data.user_id,
      media_type: data.media_type,
      media_id: data.media_id,
      time_spent: data.time_spent,
      percentage_watched: data.percentage_watched,
      season_number: data.season_number,
      episode_number: data.episode_number,
    });

    // Validate required fields
    if (!data.user_id || !data.media_type || !data.media_id) {
      logger.error('Missing required fields in saveWatchTime:', {
        hasUserId: !!data.user_id,
        hasMediaType: !!data.media_type,
        hasMediaId: !!data.media_id,
        receivedData: data,
      });
      return NextResponse.json(
        { message: 'Missing required fields: user_id, media_type, and media_id are required' },
        { status: 400 }
      );
    }

    // Validate data types
    if (typeof data.time_spent !== 'number' || data.time_spent < 0) {
      logger.error('Invalid time_spent value:', data.time_spent);
      return NextResponse.json(
        { message: 'time_spent must be a non-negative number' },
        { status: 400 }
      );
    }

    if (typeof data.percentage_watched !== 'string' || !/^\d+(\.\d+)?$/.test(data.percentage_watched)) {
      logger.error('Invalid percentage_watched value:', data.percentage_watched);
      return NextResponse.json(
        { message: 'percentage_watched must be a valid number string' },
        { status: 400 }
      );
    }

    // Convert string parameters to numbers if needed
    const media_id = typeof data.media_id === 'string' ? parseInt(data.media_id, 10) : data.media_id;
    const season_number = data.season_number
      ? (typeof data.season_number === 'string' ? parseInt(data.season_number, 10) : data.season_number)
      : null;
    const episode_number = data.episode_number
      ? (typeof data.episode_number === 'string' ? parseInt(data.episode_number, 10) : data.episode_number)
      : null;

    const result = await upsertWatchHistory(
      data.user_id,
      data.media_type,
      media_id,
      data.time_spent,
      data.percentage_watched,
      season_number,
      episode_number
    );

    logger.debug('Watch time saved successfully:', {
      action: result.action,
      user_id: data.user_id,
      media_id: data.media_id,
      media_type: data.media_type,
    });

    return NextResponse.json({
      success: true,
      message: 'Watch time saved successfully',
      data: {
        action: result.action,
        media_id: data.media_id,
        media_type: data.media_type,
      },
    });
  } catch (error) {
    logger.error('Error in saveWatchTime endpoint:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        success: false,
        message: 'Error saving watch time',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
