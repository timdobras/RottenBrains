import ExploreTab from "@/components/features/explore/ExploreTab";
import { getPopular } from "@/lib/tmdb";
import React, { Suspense } from "react";
import { getAverageColor } from "fast-average-color-node";
import MediaCarouselNew from "@/components/features/explore/MediaCarouselNew";
import Banner_90x728 from "@/components/features/ads/Banner_90x728";
import { getCurrentUser } from "@/lib/supabase/serverQueries";
import AdBanner from "@/components/features/ads/GoogleDisplayAd";
import HomeMediaCardSkeleton from "@/components/features/media/MediaCardSkeleton";

const fetchMoviesWithColors = async (movies: any) => {
  const moviesWithColors = await Promise.all(
    movies.map(async (movie: any) => {
      let color;
      try {
        color = await getAverageColor(
          `https://image.tmdb.org/t/p/w200${movie.backdrop_path}`,
        );
      } catch (error) {
        console.log(error);
        color = { hex: "#FFFFFF" }; // Default color for movies without colors
      }

      return { ...movie, averageColor: color.hex };
    }),
  );
  return moviesWithColors;
};

// Skeleton fallback for loading states
const TabSkeleton = () => (
  <div className="flex w-full flex-col gap-8 border-foreground/20 md:gap-8 md:rounded-[16px] md:border md:p-8">
    <div className="h-8 w-48 animate-pulse rounded bg-foreground/10" />
    <div className="grid w-full grid-cols-2 gap-4 md:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <HomeMediaCardSkeleton key={i} />
      ))}
    </div>
  </div>
);

const page = async () => {
  // Parallelize all initial data fetching
  const [movies, user] = await Promise.all([
    getPopular(),
    getCurrentUser(),
  ]);

  // Fetch colors after getting movies (can't parallelize this with getPopular)
  const moviesWithColors = await fetchMoviesWithColors(movies.results);

  return (
    <div className="flex w-full flex-col items-center">
      <MediaCarouselNew movies={moviesWithColors}></MediaCarouselNew>
      <div className="z-10 mt-4 flex w-full flex-col gap-8" id="explore">
        <div className="flex flex-col gap-4">
          <Suspense fallback={<TabSkeleton />}>
            <ExploreTab
              action="Now_in_cinemas"
              containerId="cinemasNow"
            ></ExploreTab>
          </Suspense>
        </div>
        <div className="flex flex-col gap-4">
          <Suspense fallback={<TabSkeleton />}>
            <ExploreTab
              action="Popular_Today"
              containerId="popularToday"
            ></ExploreTab>
          </Suspense>
        </div>
        <div className="flex flex-col gap-4">
          <Suspense fallback={<TabSkeleton />}>
            <ExploreTab action="Trending_TV" containerId="trendngTV"></ExploreTab>
          </Suspense>
        </div>
        <div className="flex flex-col gap-4">
          <Suspense fallback={<TabSkeleton />}>
            <ExploreTab
              action="Trending_Movies"
              containerId="trendngmovies"
            ></ExploreTab>
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default page;
