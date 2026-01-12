import {
  getAiringToday,
  getNowPlayingMovies,
  getPopular,
  getTrendingMovies,
  getTrendingTV,
} from '../tmdb/index';
import { logger } from '@/lib/logger';

export async function fetchExploreData(action: string) {
  const actionFunctionMapping: {
    [key: string]: () => Promise<any>;
  } = {
    Now_in_cinemas: getNowPlayingMovies,
    Trending_TV: getTrendingTV,
    Trending_Movies: getTrendingMovies,
    Popular_Today: getPopular,
    Airing_Today: getAiringToday,
  };

  const fetchFunction = actionFunctionMapping[action];
  if (!fetchFunction) {
    throw new Error(`Invalid action type: ${action}`);
  }

  try {
    return await fetchFunction();
  } catch (err) {
    logger.error(`Failed to fetch explore data for action: ${action}`, err);
    throw err;
  }
}
