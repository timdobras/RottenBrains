import { Suspense } from 'react';
import type { EnrichedMediaItem } from '@/lib/tmdb/types';
import { ErrorBoundary } from '@/components/common/ErrorBoundry';
import BrandRow from '@/components/features/home/BrandRow';
import ContinueWatchingSection from '@/components/features/home/ContinueWatchingSection';
import UpNextSection from '@/components/features/home/UpNextSection';
import FollowedPostsSection from '@/components/features/home/FollowedPostsSection';
import GenreRow from '@/components/features/home/GenreRow';
import PopularRow from '@/components/features/home/PopularRow';
import MediaRowSkeleton from '@/components/features/home/MediaRowSkeleton';
import HeroCarousel from '@/components/features/hero/HeroCarousel';
import { STUDIOS, NETWORKS } from '@/lib/constants';
import movieGenresJson from '@/lib/constants/movie_genres.json';
import tvGenresJson from '@/lib/constants/tv_genres.json';
import { getCurrentUser } from '@/lib/db/queries';
import { getPopular } from '@/lib/tmdb';
import { enrichItem } from '@/lib/tmdb/enrich';

export default async function Page() {
  const [trending, currentUser] = await Promise.all([getPopular(), getCurrentUser()]);

  // TMDB APIs return untyped data; cast to our enriched type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: EnrichedMediaItem[] = (trending?.results ?? []) as any[];

  // Top 10 trending with backdrop images for the hero carousel
  const top = results.filter((m) => m.backdrop_path).slice(0, 10);

  // Only the hero is enriched on the critical path (it's the LCP element and
  // needs logos/images up front). The two "Popular" rows enrich themselves
  // inside <Suspense> below, so their ~40 detail calls stream in and no longer
  // block the hero + shell first paint.
  const heroMedia = await Promise.all(top.map(enrichItem));

  const userId = currentUser ? String(currentUser.id) : undefined;

  return (
    <div className="-mt-14 md:-mt-16">
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

        {/* Popular Movies — streams behind Suspense (self-fetches + enriches) */}
        <Suspense fallback={<MediaRowSkeleton title="Popular Movies" />}>
          <PopularRow title="Popular Movies" type="movie" userId={userId} />
        </Suspense>

        {/* Movie Genres */}
        <GenreRow title="Movie Genres" genres={movieGenresJson.genres} mediaType="movie" />

        {/* Studios */}
        <BrandRow title="Studios" brands={STUDIOS} type="studio" />

        {/* Popular TV Shows — streams behind Suspense (self-fetches + enriches) */}
        <Suspense fallback={<MediaRowSkeleton title="Popular TV Shows" />}>
          <PopularRow title="Popular TV Shows" type="tv" userId={userId} />
        </Suspense>

        {/* TV Show Genres */}
        <GenreRow title="TV Show Genres" genres={tvGenresJson.genres} mediaType="tv" />

        {/* Networks */}
        <BrandRow title="Networks" brands={NETWORKS} type="network" />
      </div>
    </div>
  );
}
