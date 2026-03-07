import type { EnrichedMediaItem } from '@/lib/tmdb/types';
import { ErrorBoundary } from '@/components/common/ErrorBoundry';
import BrandRow from '@/components/features/home/BrandRow';
import ContinueWatchingSection from '@/components/features/home/ContinueWatchingSection';
import UpNextSection from '@/components/features/home/UpNextSection';
import FollowedPostsSection from '@/components/features/home/FollowedPostsSection';
import GenreRow from '@/components/features/home/GenreRow';
import MediaRow from '@/components/features/home/MediaRow';
import HeroCarousel from '@/components/features/hero/HeroCarousel';
import { STUDIOS, NETWORKS } from '@/lib/constants';
import movieGenresJson from '@/lib/constants/movie_genres.json';
import tvGenresJson from '@/lib/constants/tv_genres.json';
import { logger } from '@/lib/logger';
import { getCurrentUser } from '@/lib/supabase/serverQueries';
import {
  getPopular,
  getMovieDetails,
  getTVDetails,
  getPopularMovies,
  getPopularTVShows,
} from '@/lib/tmdb';
import TestNavbar from './TestNavbar';

/**
 * Enrich a TMDB result with full details (images, genres, runtime, etc.).
 * Failures are caught so one bad item doesn't break the whole page.
 */
async function enrichItem(item: EnrichedMediaItem): Promise<EnrichedMediaItem> {
  try {
    const details =
      item.media_type === 'movie' ? await getMovieDetails(item.id) : await getTVDetails(item.id);
    return {
      ...item,
      images: details?.images,
      genres: details?.genres,
      runtime: details?.runtime,
      number_of_episodes: details?.number_of_episodes,
      number_of_seasons: details?.number_of_seasons,
      release_date: details?.release_date || item.release_date,
      first_air_date: details?.first_air_date || item.first_air_date,
    };
  } catch (error) {
    logger.error(`Failed to enrich media item ${item.id}:`, error);
    return item;
  }
}

export default async function DesignPage() {
  const [trending, currentUser, popularMoviesRes, popularTVRes] = await Promise.all([
    getPopular(),
    getCurrentUser(),
    getPopularMovies(),
    getPopularTVShows(),
  ]);

  // TMDB APIs return untyped data; cast to our enriched type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: EnrichedMediaItem[] = (trending?.results ?? []) as any[];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawMovies: EnrichedMediaItem[] = (popularMoviesRes?.results ?? []).map((m: any) => ({
    ...m,
    media_type: 'movie',
  }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawTV: EnrichedMediaItem[] = (popularTVRes?.results ?? []).map((m: any) => ({
    ...m,
    media_type: 'tv',
  }));

  // Top 10 trending with backdrop images for the hero carousel
  const top = results.filter((m) => m.backdrop_path).slice(0, 10);

  // Enrich all items in parallel
  const [heroMedia, popularMovies, popularTV] = await Promise.all([
    Promise.all(top.map(enrichItem)),
    Promise.all(rawMovies.map(enrichItem)),
    Promise.all(rawTV.map(enrichItem)),
  ]);

  const userId = currentUser ? String(currentUser.id) : undefined;

  return (
    <>
      <TestNavbar />
      <HeroCarousel media={heroMedia} />
      <div className="flex flex-col gap-8 overflow-hidden pb-16 pt-4 sm:gap-10">
        {/* Continue Watching */}
        {currentUser && (
          <ErrorBoundary
            fallback={<div className="px-4 md:px-8">Could not load continue watching.</div>}
          >
            <ContinueWatchingSection userId={String(currentUser.id)} variant="full-bleed" />
          </ErrorBoundary>
        )}

        {/* Up Next */}
        {currentUser && (
          <ErrorBoundary fallback={<div className="px-4 md:px-8">Could not load up next.</div>}>
            <UpNextSection userId={String(currentUser.id)} variant="full-bleed" />
          </ErrorBoundary>
        )}

        {/* Posts from followed users */}
        {currentUser && (
          <ErrorBoundary fallback={<div className="px-4 md:px-8">Could not load posts.</div>}>
            <section className="w-full min-w-0">
              <h2 className="mb-4 pl-4 text-lg font-semibold sm:text-xl md:pl-8">Posts</h2>
              <FollowedPostsSection userId={String(currentUser.id)} variant="full-bleed" />
            </section>
          </ErrorBoundary>
        )}

        {/* Popular Movies */}
        <MediaRow title="Popular Movies" items={popularMovies} userId={userId} />

        {/* Movie Genres */}
        <GenreRow title="Movie Genres" genres={movieGenresJson.genres} mediaType="movie" />

        {/* Studios */}
        <BrandRow title="Studios" brands={STUDIOS} type="studio" />

        {/* Popular TV Shows */}
        <MediaRow title="Popular TV Shows" items={popularTV} userId={userId} />

        {/* TV Show Genres */}
        <GenreRow title="TV Show Genres" genres={tvGenresJson.genres} mediaType="tv" />

        {/* Networks */}
        <BrandRow title="Networks" brands={NETWORKS} type="network" />
      </div>
    </>
  );
}
