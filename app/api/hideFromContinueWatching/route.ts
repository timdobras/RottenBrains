import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

interface HideItemData {
  media_type: string;
  media_id: number;
  season_number?: number;
  episode_number?: number;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data: HideItemData = await req.json();

    // For TV shows: hide ALL episodes of the series
    // For Movies: hide just the movie
    const timestamp = new Date().toISOString();

    let error;

    if (data.media_type === 'tv') {
      // Hide all episodes of this TV series for this user
      const result = await supabase
        .from('watch_history')
        .update({ hidden_until: timestamp })
        .eq('user_id', user.id)
        .eq('media_type', 'tv')
        .eq('media_id', data.media_id); // Match all episodes of this series

      error = result.error;
    } else {
      // For movies, hide just this specific entry
      const result = await supabase
        .from('watch_history')
        .update({ hidden_until: timestamp })
        .eq('user_id', user.id)
        .eq('media_type', data.media_type)
        .eq('media_id', data.media_id)
        .eq('season_number', data.season_number ?? -1)
        .eq('episode_number', data.episode_number ?? -1);

      error = result.error;
    }

    if (error) {
      logger.error('Error hiding from continue watching:', error);
      return NextResponse.json({ message: 'Error hiding from continue watching' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Item hidden from continue watching successfully',
    });
  } catch (error) {
    logger.error('Error hiding from continue watching:', error);
    return NextResponse.json({ message: 'Error hiding from continue watching' }, { status: 500 });
  }
}
