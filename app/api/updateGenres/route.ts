import { NextResponse } from 'next/server';
import { updateGenreStats } from '@/lib/supabase/serverQueries';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
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

    const { genreIds, mediaType } = await request.json();

    if (!genreIds || !mediaType) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Use authenticated user ID instead of client-provided userId
    const response = await updateGenreStats({ genreIds, mediaType, userId: user.id });

    if (response.success) {
      return NextResponse.json({ message: 'Genre stats updated successfully' });
    } else {
      return NextResponse.json(
        { error: 'Failed to update genre stats', details: response.error },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Error updating genres:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
