import { NextRequest, NextResponse } from 'next/server';
import { syncToJellyfin } from '@/lib/jellyfin/sync';
import { logger } from '@/lib/logger';
import { getCurrentUser } from '@/lib/server/current-user';
import { upsertWatchHistory } from '@/lib/db/queries';

interface WatchTimeData {
  time_spent: number;
  percentage_watched: string;
  media_type: string;
  media_id: number;
  season_number?: number | null;
  episode_number?: number | null;
  playback_position?: number | null;
}

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const data: WatchTimeData = await req.json();

    logger.debug('Received watch time request:', {
      user_id: user.id,
      media_type: data.media_type,
      media_id: data.media_id,
      time_spent: data.time_spent,
      percentage_watched: data.percentage_watched,
      season_number: data.season_number,
      episode_number: data.episode_number,
    });

    // Validate required fields
    if (!data.media_type || !data.media_id) {
      logger.error('Missing required fields in saveWatchTime:', {
        hasMediaType: !!data.media_type,
        hasMediaId: !!data.media_id,
        receivedData: data,
      });
      return NextResponse.json(
        { message: 'Missing required fields: media_type and media_id are required' },
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

    if (
      typeof data.percentage_watched !== 'string' ||
      !/^\d+(\.\d+)?$/.test(data.percentage_watched)
    ) {
      logger.error('Invalid percentage_watched value:', data.percentage_watched);
      return NextResponse.json(
        { message: 'percentage_watched must be a valid number string' },
        { status: 400 }
      );
    }

    // Convert string parameters to numbers if needed
    const media_id =
      typeof data.media_id === 'string' ? parseInt(data.media_id, 10) : data.media_id;
    const season_number = data.season_number
      ? typeof data.season_number === 'string'
        ? parseInt(data.season_number, 10)
        : data.season_number
      : null;
    const episode_number = data.episode_number
      ? typeof data.episode_number === 'string'
        ? parseInt(data.episode_number, 10)
        : data.episode_number
      : null;

    // Validate playback_position if provided
    const playback_position =
      data.playback_position != null &&
      typeof data.playback_position === 'number' &&
      data.playback_position >= 0
        ? Math.floor(data.playback_position)
        : null;

    // Use 'videasy' sync_source when playback_position is provided.
    // This tells the RPC to treat percentage as absolute (like Jellyfin)
    // instead of incremental (like the default wall-clock app tracking).
    const sync_source = playback_position != null ? 'videasy' : 'app';

    const result = await upsertWatchHistory(
      user.id,
      data.media_type,
      media_id,
      data.time_spent,
      data.percentage_watched,
      season_number,
      episode_number,
      sync_source,
      playback_position
    );

    logger.debug('Watch time saved successfully:', {
      action: result.action,
      user_id: user.id,
      media_id: data.media_id,
      media_type: data.media_type,
    });

    // Fire-and-forget: sync to Jellyfin if the user has it configured.
    // This runs asynchronously and does not block the API response.
    // Only sync updates originating from the app (not from Jellyfin webhooks).
    const resultData = result.data as { percentage_watched?: string } | null | undefined;
    const totalPercentage = resultData?.percentage_watched
      ? parseFloat(resultData.percentage_watched)
      : parseFloat(data.percentage_watched);

    syncToJellyfin({
      userId: user.id,
      mediaType: data.media_type,
      mediaId: media_id,
      seasonNumber: season_number,
      episodeNumber: episode_number,
      percentageWatched: totalPercentage,
      timeSpent: data.time_spent,
    }).catch((err) => {
      logger.warn('Jellyfin sync failed (non-blocking):', err);
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
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
