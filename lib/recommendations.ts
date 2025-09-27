import { fetchFromApi } from "@/lib/tmdb/tmdbApi";

export function formatGenreCodes(arr: { genre_code: string }[]): string {
  return arr.map((item) => item.genre_code).join("%7C");
}

export const getMovieRecommendationsForUser = async (
  genres: any,
  page: number = 1,
) => {
  const joinedGenres = formatGenreCodes(genres);
  return fetchFromApi(
    `discover/movie?include_adult=false&include_video=false&language=en-US&page=${page}&sort_by=popularity.desc&with_genres=${joinedGenres}`,
  );
};

export const getTvRecommendationsForUser = async (
  genres: any,
  page: number = 1,
) => {
  const joinedGenres = formatGenreCodes(genres);
  return fetchFromApi(
    `discover/tv?include_adult=false&include_video=false&language=en-US&with_original_language=en&without_genres
=10763%7C10767&page=${page}&sort_by=popularity.desc&with_genres=${joinedGenres}`,
  );
};

// discover/movie?include_adult=false&include_video=false&language=en-US&page=1&sort_by=popularity.desc&with_genres=28%7C12
