import { NextResponse } from 'next/server';
import { updateGenreStats } from '@/lib/db/queries';
import { getCurrentUser } from '@/lib/server/current-user';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    // Verify authentication
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { genreIds, mediaType } = await request.json();

    if (!genreIds || !mediaType) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Use authenticated user ID instead of client-provided userId.
    // updateGenreStats() resolves (with void) on success and throws on failure,
    // so reaching this point means the update succeeded; failures fall through
    // to the catch block below and return a 500.
    await updateGenreStats({ genreIds, mediaType, userId: user.id });

    return NextResponse.json({ message: 'Genre stats updated successfully' });
  } catch (error) {
    logger.error('Error updating genres:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
