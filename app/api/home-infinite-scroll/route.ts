// app/api/home-infinite-scroll/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchInfiniteScrollHome } from '@/lib/server/fetchInfiniteScrollHome';
import { getPopular } from '@/lib/tmdb';
import { logger } from '@/lib/logger';

/**
 * Safely parse a JSON string containing genre objects
 * Returns an array of objects with genre_code property
 */
function parseGenres(str: string | null): { genre_code: string }[] {
  if (!str) return [];
  try {
    const parsed = JSON.parse(str);
    if (!Array.isArray(parsed)) return [];
    // Filter to only valid genre objects and limit to prevent abuse
    return parsed
      .filter((g): g is { genre_code: string } =>
        typeof g === 'object' && g !== null && typeof g.genre_code === 'string'
      )
      .slice(0, 50);
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const userId = searchParams.get('userId');
  const movieGenres = parseGenres(searchParams.get('movieGenres'));
  const tvGenres = parseGenres(searchParams.get('tvGenres'));

  try {
    if (userId) {
      // Authenticated users get personalized content - don't cache
      const results = await fetchInfiniteScrollHome(movieGenres, tvGenres, page, userId);
      return NextResponse.json(results || [], {
        headers: {
          'Cache-Control': 'private, no-store, max-age=0',
        },
      });
    } else {
      // Anonymous users get public content - cache at CDN for 5 minutes
      const combined_results = await getPopular(page);
      return NextResponse.json(combined_results?.results || [], {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
        },
      });
    }
  } catch (error) {
    logger.error('Error fetching home page data:', error);
    // Return empty array instead of 500 to allow page to render
    return NextResponse.json([], {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  }
}
