import {
  getMovieRecommendationsForUser,
  getTvRecommendationsForUser,
} from "@/lib/recommendations";
import { useMemo } from "react";
import { fetchMediaData } from "./fetchMediaData";
import { getBatchWatchedItemsForUser } from "../supabase/clientQueries";

const shuffleArray = (array: any) => {
  const shuffled = [...array]; // Create a copy to avoid mutating the original array
  for (let i = shuffled.length - 1; i > 0; i--) {
    // Generate a random index from 0 to i
    const j = Math.floor(Math.random() * (i + 1));
    // Swap elements i and j
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export async function fetchInfiniteScrollHome(
  movie_genres: any,
  tv_genres: any,
  page: number = 1,
  user_id: string,
) {
  const [movie_rec, tv_rec] = await Promise.all([
    getMovieRecommendationsForUser(movie_genres, page),
    getTvRecommendationsForUser(tv_genres, page),
  ]);
  const resMovies = movie_rec.results.map((movie: any) => ({
    ...movie,
    media_type: "movie",
  }));
  const resTv = tv_rec.results.map((tvShow: any) => ({
    ...tvShow,
    media_type: "tv",
  }));
  const combined_not_shuffled = [...resTv, ...resMovies];
  const combined = shuffleArray(combined_not_shuffled);

  const [combined_details, watched_items] = await Promise.all([
    Promise.all(
      combined.map((media) => fetchMediaData(media.id, media.media_type)),
    ),
    getBatchWatchedItemsForUser(user_id, combined),
  ]);

  const watchedSet = new Set(
    watched_items.map((item: any) => `${item.media_type}-${item.media_id}`),
  );

  const unwatched_items = combined_details.filter(
    (item) => !watchedSet.has(`${item.media_type}-${item.id}`),
  );

  return unwatched_items;
}
