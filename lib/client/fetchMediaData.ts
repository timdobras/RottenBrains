import { getMovieDetails, getTVDetails } from "../tmdb/index";

// utils/fetchMediaData.ts
export async function fetchMediaData(media_type: string, media_id: number) {
  const actionFunctionMapping: {
    [key: string]: (id: number) => Promise<any>;
  } = {
    movie: getMovieDetails,
    tv: getTVDetails,
  };

  const fetchFunction = actionFunctionMapping[media_type];
  if (!fetchFunction) {
    throw new Error(`Invalid media type: ${media_type}`);
  }

  try {
    return await fetchFunction(media_id);
  } catch (err) {
    console.error("Failed to fetch data", err);
    throw err;
  }
}
