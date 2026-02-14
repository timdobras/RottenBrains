import { ErrorBoundary } from '@/components/common/ErrorBoundry';
import ContinueWatchingSection from '@/components/features/home/ContinueWatchingSection';
import FollowedPostsSection from '@/components/features/home/FollowedPostsSection';
import GenreSelector from '@/components/features/home/GenreSelector';
import InfiniteScrollHome from '@/components/features/home/InfiniteScroll';
import NavTop from '@/components/features/navigation/mobile/NavTop';
import { MobileVideoProvider } from '@/hooks/MobileVideoContext';
import {
  getCurrentUser,
  getTopMovieGenresForUser,
  getTopTvGenresForUser,
} from '@/lib/supabase/serverQueries';

export default async function Page() {
  const user = await getCurrentUser();

  // Only fetch genre data eagerly (lightweight, needed for GenreSelector + InfiniteScroll)
  // Continue watching and posts are deferred via Suspense boundaries below
  let movie_genres: any[] = [];
  let tv_genres: any[] = [];

  if (user) {
    const [movieGenresResult, tvGenresResult] = await Promise.allSettled([
      getTopMovieGenresForUser(undefined, user),
      getTopTvGenresForUser(undefined, user),
    ]);
    movie_genres = movieGenresResult.status === 'fulfilled' ? movieGenresResult.value : [];
    tv_genres = tvGenresResult.status === 'fulfilled' ? tvGenresResult.value : [];
  }

  return (
    <MobileVideoProvider>
      <div className="flex w-full flex-col gap-8 md:w-auto md:py-0" id="main-content">
        <NavTop />
        {/* Continue Watching — streams independently via Suspense */}
        <ErrorBoundary fallback={<div>Could not load &quot;Continue Watching&quot;.</div>}>
          {user ? (
            <ContinueWatchingSection userId={user.id} />
          ) : (
            <div className="col mt-16 flex h-52 w-full flex-col items-center justify-center gap-4 bg-foreground/10 md:mt-0 md:rounded-[16px]">
              <img
                src="/assets/images/logo_new_black.svg"
                alt=""
                className="invert-on-dark aspect-square h-12 opacity-50"
                loading="lazy"
              />
              <p className="text-foreground/50">Log in to see your watch history</p>
            </div>
          )}
        </ErrorBoundary>
        {/* Followed Posts — streams independently via Suspense */}
        <ErrorBoundary fallback={<div>Could not load posts.</div>}>
          {user && <FollowedPostsSection userId={user.id} />}
        </ErrorBoundary>

        <GenreSelector
          initialRecommendedGenres={[
            ...movie_genres.map((g: any) => ({ ...g, media_type: 'movie' as const })),
            ...tv_genres.map((g: any) => ({ ...g, media_type: 'tv' as const })),
          ]}
        />

        <InfiniteScrollHome user_id={user?.id} movie_genres={movie_genres} tv_genres={tv_genres} />

        <div className="h-16 w-full" />
      </div>
    </MobileVideoProvider>
  );
}
