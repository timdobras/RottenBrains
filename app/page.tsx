import { MobileVideoProvider } from "@/hooks/MobileVideoContext";
import Banner_90x728 from "@/components/features/ads/Banner_90x728";
import {
  fetchContinueWatching,
  fetchNewEpisodes,
} from "@/lib/server/homeFunctions";
import { fetchPostsData } from "@/lib/server/fetchPostsData";
import HomePostCardUI from "@/components/features/posts/HomePostCardUI";
import {
  getCurrentUser,
  getTopMovieGenresForUser,
  getTopTvGenresForUser,
} from "@/lib/supabase/serverQueries";
import MediaCardUI from "@/components/features/media/MediaCardUI";
import NavTop from "@/components/features/navigation/mobile/NavTop";
import GenreSelector from "@/components/features/home/GenreSelector";
import InfiniteScrollHome from "@/components/features/home/InfiniteScroll";
import HorizontalScroll from "@/components/features/home/HorizontalScroll";
import { ErrorBoundary } from "@/components/common/ErrorBoundry";
import AdBanner from "@/components/features/ads/GoogleDisplayAd";
import MobileBannerExo42 from "@/components/features/ads/Notification";
import MobileBannerExoAlt from "@/components/features/ads/Message";
import MobileBannerPem from "@/components/features/ads/Fullscreen";
import VideoContextSetter from "@/hooks/VideoContextSetter";

export default async function Page() {
  const user = await getCurrentUser();

  let followedPosts: any[] = [];
  let continue_watching: any[] = [];
  let movie_genres: any[] = [];
  let tv_genres: any[] = [];

  // Only fetch data if the user is logged in
  if (user) {
    const user_id = user.id.toString();
    // Fetch data in parallel
    const [
      postsResult,
      continueWatchingResult,
      movieGenresResult,
      tvGenresResult,
    ] = await Promise.allSettled([
      fetchPostsData(user_id),
      fetchContinueWatching(user_id),
      getTopMovieGenresForUser(undefined, user),
      getTopTvGenresForUser(undefined, user),
    ]);

    followedPosts = postsResult.status === "fulfilled" ? postsResult.value : [];
    continue_watching =
      continueWatchingResult.status === "fulfilled"
        ? continueWatchingResult.value
        : [];
    movie_genres =
      movieGenresResult.status === "fulfilled" ? movieGenresResult.value : [];
    tv_genres =
      tvGenresResult.status === "fulfilled" ? tvGenresResult.value : [];
  }

  console.log(continue_watching[0]);

  return (
    <MobileVideoProvider>
      <div
        className="flex w-full flex-col gap-8 md:w-auto md:py-0"
        id="main-content"
      >
        <NavTop />
        <ErrorBoundary
          fallback={<div>Could not load "Continue Watching".</div>}
        >
          {user ? (
            <section className="mt-14 md:mt-0">
              <p className="mb-4 hidden font-medium md:flex md:text-lg">
                Continue Watching
              </p>
              {continue_watching.length > 0 ? (
                <>
                  {/* <VideoContextSetter
                    media_type={continue_watching[0].media_type}
                    media_id={continue_watching[0].media_id}
                    episode_number={continue_watching[0].episode_number}
                    season_number={continue_watching[0].season_number}
                  /> */}
                  <HorizontalScroll>
                    {continue_watching.map((media: any) => (
                      <div
                        key={media.id}
                        className="snap-start scroll-ml-4 md:scroll-ml-8"
                      >
                        <MediaCardUI media={media} user_id={user.id} rounded />
                      </div>
                    ))}
                  </HorizontalScroll>
                </>
              ) : (
                <div className="flex w-full items-center justify-center p-8">
                  You have no watch history yet. Start watching something!
                </div>
              )}
            </section>
          ) : (
            <div className="col mt-16 flex h-52 w-full flex-col items-center justify-center gap-4 bg-foreground/10 md:mt-0 md:rounded-[16px]">
              <img
                src="/assets/images/logo_new_black.svg"
                alt=""
                className="invert-on-dark aspect-square h-12 opacity-50"
              />
              <p className="text-foreground/50">
                Log in to see your watch history
              </p>
            </div>
          )}
        </ErrorBoundary>
        {/* Followed Posts Section */}
        <ErrorBoundary fallback={<div>Could not load posts.</div>}>
          <section>
            <div className="relative">
              <div className="gradient-edge absolute right-0 top-0 z-20 h-full w-[5%]" />
              <div
                className="hidden-scrollbar flex snap-x snap-mandatory flex-row gap-4 overflow-x-auto px-4 md:px-0 md:pr-4"
                id="rotten-posts-one"
              >
                {user ? (
                  followedPosts.length > 0 ? (
                    followedPosts.map((post: any) => (
                      <div
                        key={post.id}
                        className="flex w-[80vw] flex-shrink-0 snap-start scroll-ml-4 md:w-fit"
                      >
                        <HomePostCardUI
                          post_media_data={post}
                          user_id={user.id}
                        />
                      </div>
                    ))
                  ) : (
                    <div className="flex h-52 w-full flex-col items-center justify-center gap-4 rounded-[16px] bg-foreground/10">
                      <img
                        src="/assets/images/logo_new_black.svg"
                        alt=""
                        className="invert-on-dark aspect-square h-12 opacity-50"
                      />
                      <p className="text-foreground/50">
                        Start following your friends to see posts.
                      </p>
                    </div>
                  )
                ) : (
                  <></>
                )}
              </div>
            </div>
          </section>
        </ErrorBoundary>

        <GenreSelector />

        <InfiniteScrollHome
          user_id={user?.id}
          movie_genres={movie_genres}
          tv_genres={tv_genres}
        />

        <div className="h-16 w-full" />
      </div>
    </MobileVideoProvider>
  );
}
