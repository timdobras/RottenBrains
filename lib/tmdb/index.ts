import { fetchFromApi } from "./tmdbApi";

export const discoverMovies = async () => {
  return fetchFromApi(
    "discover/movie?include_adult=false&include_video=false&language=en-US&page=1&sort_by=popularity.desc",
  );
};

export const searchMovies = async (query: string, page: number = 1) => {
  return fetchFromApi(
    `search/movie?query=${query}&include_adult=false&language=en-US&page=${page}`,
  );
};

export const searchTv = async (query: string, page: number = 1) => {
  return fetchFromApi(
    `search/tv?query=${query}&include_adult=false&language=en-US&page=${page}`,
  );
};

export const searchPerson = async (query: string, page: number = 1) => {
  return fetchFromApi(
    `search/person?query=${query}&include_adult=false&language=en-US&page=${page}`,
  );
};

export const searchMulti = async (query: string, page: number = 1) => {
  return fetchFromApi(
    `search/multi?query=${query}&include_adult=false&language=en-US&page=${page}`,
  );
};

export const getNowPlayingMovies = async () => {
  return fetchFromApi("movie/now_playing?language=en-US&page=1");
};

export const getTrendingTV = async () => {
  return fetchFromApi("trending/tv/day?language=en-US");
};

export const getTrendingMovies = async () => {
  return fetchFromApi("trending/movie/day?language=en-US");
};

export const getPopular = async (page?: number) => {
  const page_string = page ? `&page=${page}` : "";
  return fetchFromApi(
    `trending/all/week?language=en-US${page_string}`,
    "images",
  );
};

export const getAiringToday = async () => {
  return fetchFromApi("tv/airing_today?language=en-US&page=1");
};

export const getMovieDetails = async (movieId: number) => {
  return fetchFromApi(`movie/${movieId}?language=en`, "images");
};

export const getTVDetails = async (tvId: number) => {
  return fetchFromApi(`tv/${tvId}?language=en`, "images");
};

export const getMovieCredits = async (movieId: number) => {
  return fetchFromApi(`movie/${movieId}/credits?language=en-US`);
};
export const getTVCredits = async (tvId: number) => {
  return fetchFromApi(`tv/${tvId}/credits?language=en-US`);
};

export const getSeasonDetails = async (tvId: number, season_number: number) => {
  return fetchFromApi(`tv/${tvId}/season/${season_number}?language=en-US`);
};
export const getEpisodeDetails = async (
  tvId: number,
  season_number: number,
  episode_number: number,
) => {
  return fetchFromApi(
    `tv/${tvId}/season/${season_number}/episode/${episode_number}?language=en-US`,
  );
};

export const getMediaDetails = async (
  media_type: string,
  media_id: number,
  season_number?: number,
  episode_number?: number,
): Promise<any> => {
  // Validate the media_id
  if (media_id <= 0) {
    throw new Error(
      `Invalid media_id: ${media_id}. It must be a positive number.`,
    );
  }

  // Validate that both season_number and episode_number are provided together (if at all)
  if (
    (season_number !== undefined || episode_number !== undefined) &&
    (season_number === undefined || episode_number === undefined)
  ) {
    throw new Error(
      "Both season_number and episode_number must be provided together.",
    );
  }

  try {
    switch (media_type) {
      case "tv":
        if (season_number !== undefined && episode_number !== undefined) {
          if (season_number < 0 || episode_number < 0) {
            throw new Error("Season and episode numbers must be non-negative.");
          }
          // Return episode details for a TV show
          return await getEpisodeDetails(
            media_id,
            season_number,
            episode_number,
          );
        } else {
          // Return TV show details
          return await getTVDetails(media_id);
        }

      case "movie":
        // Return movie details
        return await getMovieDetails(media_id);

      default:
        // This should be unreachable because media_type is of type MediaType
        throw new Error(`Unsupported media type: ${media_type}`);
    }
  } catch (error: any) {
    // Log the error for debugging purposes
    console.error(
      `Error fetching details for media_type: ${media_type}, media_id: ${media_id}`,
      error,
    );
    // Optionally, you could wrap or process the error further before rethrowing
    throw new Error(`Failed to get media details: ${error.message || error}`);
  }
};

export const fetchMediaDetails = async (mediaItems: any) => {
  try {
    const requests = mediaItems.map((item: any) =>
      fetchFromApi(`${item.type}/${item.tmdb_id}?language=en-US`)
        .then((response) => ({ status: "fulfilled", value: response }))
        .catch((error) => ({ status: "rejected", reason: error })),
    );

    const results = await Promise.all(requests);
    const mediaDetails = results
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value);

    return mediaDetails;
  } catch (error) {
    console.error("Error fetching media details:", error);
    return [];
  }
};

export const fetchHistoryMediaDetails = async (mediaItems: any) => {
  try {
    const requests = mediaItems.map((item: any) =>
      fetchFromApi(`${item.media_type}/${item.media_id}?language=en-US`),
    );
    const mediaDetails = await Promise.all(requests);
    return mediaDetails;
  } catch (error) {
    console.error("Error fetching media details:", error);
    return [];
  }
};

export const getMediaCredits = async (media_type: string, media_id: number) => {
  if (media_type === "movie") {
    return await getMovieCredits(media_id);
  } else {
    return await getTVCredits(media_id);
  }
};

export const getPersonDetails = async (person_id: number) => {
  return fetchFromApi(`person/${person_id}?language=en-US`);
};
export const getPersonImages = async (person_id: number) => {
  return fetchFromApi(`person/${person_id}/tagged_images?page=1`);
};
export const getPersonCredits = async (person_id: number) => {
  return fetchFromApi(`person/${person_id}/combined_credits?language=en-US`);
};

export const getVideos = async (media_type: string, media_id: number) => {
  return fetchFromApi(`${media_type}/${media_id}/videos?language=en-US`);
};

export const getRecommendations = async (
  media_type: string,
  media_id: number,
) => {
  return fetchFromApi(
    `${media_type}/${media_id}/recommendations?language=en-US&page=1`,
    "images",
  );
};

export const getSimilar = async (media_type: string, media_id: number) => {
  return fetchFromApi(
    `${media_type}/${media_id}/similar?language=en-US&page=1`,
  );
};

export const getReviews = async (media_type: string, media_id: number) => {
  return fetchFromApi(
    `${media_type}/${media_id}/reviews?language=en-US&page=1`,
  );
};

export const getCredits = async (media_type: string, media_id: number) => {
  return fetchFromApi(`${media_type}/${media_id}/credits?language=en-US`);
};

export const getFromGenres = async (
  media_type: string,
  page: number,
  genre: string,
) => {
  return fetchFromApi(
    `discover/${media_type}?include_adult=false&include_video=false&language=en-US&with_original_language=en${
      media_type === "tv"
        ? `&without_genres
=10763%7C10767`
        : ""
    }&page=${page}&sort_by=popularity.desc&with_genres=${genre}`,
  );
};

export const getGenreInfo = async (genreId: number) => {
  try {
    return fetchFromApi(`genre/movie/${genreId}`);
  } catch (error) {
    try {
      return fetchFromApi(`genre/tv/${genreId}`);
    } catch (error) {
      console.log("GenreId isnt movie or TV genre ");
    }
  }
};

export async function getLastEpisodeFromTMDB(
  tvId: number,
): Promise<any | null> {
  try {
    const data = await getMediaDetails("tv", tvId);
    if (!data.last_episode_to_air) {
      // Show might be ended or no episodes yet
      return null;
    }

    const { air_date, season_number, episode_number } =
      data.last_episode_to_air;

    return {
      lastAirDate: air_date,
      season_number: season_number,
      episode_number: episode_number,
    };
  } catch (err) {
    console.error("getLastEpisodeFromTMDB error:", err);
    return null;
  }
}
