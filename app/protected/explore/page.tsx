import ExploreTab from "@/components/features/explore/ExploreTab";
import { getPopular } from "@/lib/tmdb";
import React from "react";
import { getAverageColor } from "fast-average-color-node";
import MediaCarouselNew from "@/components/features/explore/MediaCarouselNew";
import Banner_90x728 from "@/components/features/ads/Banner_90x728";
import { getCurrentUser } from "@/lib/supabase/serverQueries";
import AdBanner from "@/components/features/ads/GoogleDisplayAd";

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

const page = async () => {
  const movies = await getPopular();
  const moviesWithColors = await fetchMoviesWithColors(movies.results);
  const user = await getCurrentUser();
  return (
    <div className="flex w-full flex-col items-center">
      <MediaCarouselNew movies={moviesWithColors}></MediaCarouselNew>
      <div className="z-10 mt-4 flex w-full flex-col gap-8" id="explore">
        <div className="flex flex-col gap-4">
          <ExploreTab
            action="Now_in_cinemas"
            containerId="cinemasNow"
          ></ExploreTab>
        </div>
        <div className="flex flex-col gap-4">
          <ExploreTab
            action="Popular_Today"
            containerId="popularToday"
          ></ExploreTab>
        </div>
        <div className="flex flex-col gap-4">
          <ExploreTab action="Trending_TV" containerId="trendngTV"></ExploreTab>
        </div>
        <div className="flex flex-col gap-4">
          <ExploreTab
            action="Trending_Movies"
            containerId="trendngmovies"
          ></ExploreTab>
        </div>
      </div>
    </div>
  );
};

export default page;
