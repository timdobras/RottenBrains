import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/server/current-user';
import { logger } from '@/lib/logger';

interface HideItemData {
  media_type: string;
  media_id: number;
  season_number?: number;
  episode_number?: number;
}

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data: HideItemData = await req.json();

    // For TV shows: hide ALL episodes of the series
    // For Movies: hide just the movie
    const timestamp = new Date();

    if (data.media_type === 'tv') {
      // Hide all episodes of this TV series for this user
      await prisma.watch_history.updateMany({
        where: {
          user_id: user.id,
          media_type: 'tv',
          media_id: data.media_id, // Match all episodes of this series
        },
        data: { hidden_until: timestamp },
      });
    } else {
      // For movies, hide just this specific entry
      await prisma.watch_history.updateMany({
        where: {
          user_id: user.id,
          media_type: data.media_type,
          media_id: data.media_id,
          season_number: data.season_number ?? -1,
          episode_number: data.episode_number ?? -1,
        },
        data: { hidden_until: timestamp },
      });
    }

    return NextResponse.json({
      message: 'Item hidden from continue watching successfully',
    });
  } catch (error) {
    logger.error('Error hiding from continue watching:', error);
    return NextResponse.json({ message: 'Error hiding from continue watching' }, { status: 500 });
  }
}
