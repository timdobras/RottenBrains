import { getMovieRecommendationsForUser, getTvRecommendationsForUser } from '@/lib/recommendations';
import { logger } from '@/lib/logger';
import { getBatchWatchedItemsForUser } from '../supabase/clientQueries';
import movieGenresJson from '@/lib/constants/movie_genres.json';
import tvGenresJson from '@/lib/constants/tv_genres.json';

// Build a static genre ID -> name lookup map at module level (one-time cost)
const genreLookup = new Map<number, string>();
movieGenresJson.genres.forEach((g) => genreLookup.set(g.id, g.name));
tvGenresJson.genres.forEach((g) => genreLookup.set(g.id, g.name));

const shuffleArray = (array: any[]) => {
  if (!array || array.length === 0) return [];
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Convert discover API genre_ids (number[]) to genres ({id, name}[])
 * using our local static genre JSON files.
 */
function mapGenreIds(genreIds: number[]): { id: number; name: string }[] {
  if (!genreIds) return [];
  return genreIds
    .map((id) => {
      const name = genreLookup.get(id);
      return name ? { id, name } : null;
    })
    .filter(Boolean) as { id: number; name: string }[];
}

export async function fetchInfiniteScrollHome(
  movie_genres: any,
  tv_genres: any,
  page: number = 1,
  user_id: string
) {
  const [movie_rec, tv_rec] = await Promise.all([
    getMovieRecommendationsForUser(movie_genres, page),
    getTvRecommendationsForUser(tv_genres, page),
  ]);

  // Handle null responses gracefully
  const resMovies = (movie_rec?.results || []).map((movie: any) => ({
    ...movie,
    media_type: 'movie',
  }));
  const resTv = (tv_rec?.results || []).map((tvShow: any) => ({
    ...tvShow,
    media_type: 'tv',
  }));

  const combined_not_shuffled = [...resTv, ...resMovies];
  if (combined_not_shuffled.length === 0) {
    return [];
  }

  const combined = shuffleArray(combined_not_shuffled);

  // Fetch watched items to filter them out (single DB call)
  const watched_items = await getBatchWatchedItemsForUser(user_id, combined);

  const watchedSet = new Set(
    (watched_items || []).map((item: any) => `${item.media_type}-${item.media_id}`)
  );

  // Use discover response data directly instead of making ~40 individual TMDB detail calls.
  // The discover endpoint already returns: id, title/name, overview, poster_path, backdrop_path,
  // vote_average, release_date/first_air_date, genre_ids, popularity, etc.
  // We just need to map genre_ids to genre objects using our local JSON.
  const unwatched_items = combined
    .map((media: any) => {
      const key = `${media.media_type}-${media.id}`;
      if (watchedSet.has(key)) return null;

      // Map genre_ids from discover response to genre objects with names
      const genres = mapGenreIds(media.genre_ids || []);

      return {
        ...media,
        media_id: media.id,
        genres,
        // Discover data uses different field names for movies vs TV
        // Normalize so MediaCardUI can handle both
        watch_time: 0,
      };
    })
    .filter(Boolean);

  return unwatched_items;
}
