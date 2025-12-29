/**
 * TMDB Mock Router
 * Uses real TMDB data downloaded for offline development
 */

import {
  mockMovies,
  mockMovieDetails,
  getMovieById,
  getTrendingMovies,
  getPopularMovies,
  getNowPlayingMovies,
  getTopRatedMovies,
} from './movies';
import {
  mockTvShows,
  mockTvDetails,
  getTvShowById,
  getTrendingTv,
  getPopularTv,
  getAiringToday,
  getTopRatedTv,
  getSeasonDetails,
} from './tv-shows';
import {
  getPersonById,
  getPersonMovieCredits,
  getPersonTvCredits,
  getPersonImages,
  searchPerson,
  mockPeoplePopular,
} from './people';
import {
  movieGenres,
  tvGenres,
} from './genres';

/**
 * Main router function that maps TMDB API endpoints to mock data
 */
export function getMockTMDBData(
  endpoint: string,
  appendToResponse?: string
): any {
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;

  // Parse query parameters
  const [pathPart, queryString] = cleanEndpoint.split('?');
  const queryParams = parseQueryString(queryString || '');

  // Split path into segments
  const segments = pathPart.split('/').filter(Boolean);

  if (segments.length === 0) {
    return { error: 'Invalid endpoint' };
  }

  const [resource, ...rest] = segments;

  switch (resource) {
    case 'trending':
      return handleTrending(rest);
    case 'movie':
      return handleMovie(rest, appendToResponse, queryParams);
    case 'tv':
      return handleTv(rest, appendToResponse, queryParams);
    case 'person':
      return handlePerson(rest);
    case 'search':
      return handleSearch(rest, queryParams);
    case 'discover':
      return handleDiscover(rest, queryParams);
    case 'genre':
      return handleGenre(rest);
    default:
      console.warn(`[Mock TMDB] Unhandled endpoint: ${endpoint}`);
      return { results: [], page: 1, total_pages: 0, total_results: 0 };
  }
}

function parseQueryString(queryString: string): Record<string, string> {
  if (!queryString) return {};
  return queryString.split('&').reduce((acc, pair) => {
    const [key, value] = pair.split('=');
    if (key) acc[decodeURIComponent(key)] = decodeURIComponent(value || '');
    return acc;
  }, {} as Record<string, string>);
}

function handleTrending(segments: string[]): any {
  const [mediaType] = segments;
  if (mediaType === 'movie') return getTrendingMovies();
  if (mediaType === 'tv') return getTrendingTv();
  if (mediaType === 'all') {
    const movies = getTrendingMovies().results.map((m: any) => ({ ...m, media_type: 'movie' }));
    const tv = getTrendingTv().results.map((t: any) => ({ ...t, media_type: 'tv' }));
    return {
      page: 1,
      results: [...movies.slice(0, 10), ...tv.slice(0, 10)],
      total_pages: 1,
      total_results: 20,
    };
  }
  return getTrendingMovies();
}

function handleMovie(segments: string[], appendToResponse?: string, queryParams?: Record<string, string>): any {
  const [idOrAction, subAction] = segments;

  switch (idOrAction) {
    case 'popular': return getPopularMovies();
    case 'now_playing': return getNowPlayingMovies();
    case 'top_rated': return getTopRatedMovies();
    case 'upcoming': return getNowPlayingMovies();
  }

  const movieId = parseInt(idOrAction);
  if (isNaN(movieId)) return { error: 'Invalid movie ID' };

  const movie = getMovieById(movieId);
  if (!movie) return getMovieById(Object.keys(mockMovieDetails)[0] as any);

  if (subAction) {
    switch (subAction) {
      case 'credits': return movie.credits || { cast: [], crew: [] };
      case 'videos': return movie.videos || { results: [] };
      case 'images': return movie.images || { backdrops: [], posters: [] };
      case 'recommendations': return getRecommendations('movie');
      case 'similar': return getSimilar('movie');
    }
  }

  return movie;
}

function handleTv(segments: string[], appendToResponse?: string, queryParams?: Record<string, string>): any {
  const [idOrAction, subAction, subId] = segments;

  switch (idOrAction) {
    case 'popular': return getPopularTv();
    case 'airing_today': return getAiringToday();
    case 'on_the_air': return getAiringToday();
    case 'top_rated': return getTopRatedTv();
  }

  const tvId = parseInt(idOrAction);
  if (isNaN(tvId)) return { error: 'Invalid TV ID' };

  const tvShow = getTvShowById(tvId);
  if (!tvShow) return getTvShowById(Object.keys(mockTvDetails)[0] as any);

  if (subAction) {
    switch (subAction) {
      case 'credits': return tvShow.credits || { cast: [], crew: [] };
      case 'videos': return tvShow.videos || { results: [] };
      case 'images': return tvShow.images || { backdrops: [], posters: [] };
      case 'recommendations': return getRecommendations('tv');
      case 'similar': return getSimilar('tv');
      case 'season':
        const seasonNum = parseInt(subId);
        if (!isNaN(seasonNum)) return getSeasonDetails(tvId, seasonNum);
        break;
    }
  }

  return tvShow;
}

function handlePerson(segments: string[]): any {
  const [idOrAction, subAction] = segments;
  const personId = parseInt(idOrAction);

  if (isNaN(personId)) return { error: 'Invalid person ID' };

  if (subAction) {
    switch (subAction) {
      case 'movie_credits': return getPersonMovieCredits(personId);
      case 'tv_credits': return getPersonTvCredits(personId);
      case 'combined_credits':
        const movie = getPersonMovieCredits(personId);
        const tv = getPersonTvCredits(personId);
        return { cast: [...(movie.cast || []), ...(tv.cast || [])], crew: [] };
      case 'images': return getPersonImages(personId);
    }
  }

  return getPersonById(personId);
}

function handleSearch(segments: string[], queryParams: Record<string, string>): any {
  const [searchType] = segments;
  const query = queryParams.query || '';

  const filterByQuery = (items: any[], nameField: string = 'title') => {
    const lowerQuery = query.toLowerCase();
    const filtered = items.filter((item) => {
      const name = (item[nameField] || item.name || item.title || '').toLowerCase();
      return name.includes(lowerQuery);
    });
    return filtered.length > 0 ? filtered : items.slice(0, 5);
  };

  switch (searchType) {
    case 'movie':
      return {
        page: 1,
        results: filterByQuery(mockMovies, 'title').map((m: any) => ({ ...m, media_type: 'movie' })),
        total_pages: 1,
        total_results: 20,
      };
    case 'tv':
      return {
        page: 1,
        results: filterByQuery(mockTvShows, 'name').map((t: any) => ({ ...t, media_type: 'tv' })),
        total_pages: 1,
        total_results: 20,
      };
    case 'person':
      return searchPerson(query);
    case 'multi':
      const movies = filterByQuery(mockMovies, 'title').slice(0, 5).map((m: any) => ({ ...m, media_type: 'movie' }));
      const tv = filterByQuery(mockTvShows, 'name').slice(0, 5).map((t: any) => ({ ...t, media_type: 'tv' }));
      const people = searchPerson(query).results.slice(0, 3).map((p: any) => ({ ...p, media_type: 'person' }));
      return {
        page: 1,
        results: [...movies, ...tv, ...people],
        total_pages: 1,
        total_results: movies.length + tv.length + people.length,
      };
    default:
      return { page: 1, results: [], total_pages: 0, total_results: 0 };
  }
}

function handleDiscover(segments: string[], queryParams: Record<string, string>): any {
  const [mediaType] = segments;
  const genreIds = queryParams.with_genres?.split(',').map(Number) || [];

  if (mediaType === 'movie') {
    let results = [...mockMovies];
    if (genreIds.length > 0) {
      results = results.filter((m: any) => m.genre_ids?.some((id: number) => genreIds.includes(id)));
    }
    return {
      page: 1,
      results: results.length > 0 ? results : mockMovies.slice(0, 20),
      total_pages: 1,
      total_results: results.length,
    };
  }
  if (mediaType === 'tv') {
    let results = [...mockTvShows];
    if (genreIds.length > 0) {
      results = results.filter((t: any) => t.genre_ids?.some((id: number) => genreIds.includes(id)));
    }
    return {
      page: 1,
      results: results.length > 0 ? results : mockTvShows.slice(0, 20),
      total_pages: 1,
      total_results: results.length,
    };
  }
  return { page: 1, results: [], total_pages: 0, total_results: 0 };
}

function handleGenre(segments: string[]): any {
  const [mediaType, action] = segments;
  if (action === 'list') {
    return { genres: mediaType === 'tv' ? tvGenres : movieGenres };
  }
  return { genres: movieGenres };
}

function getRecommendations(mediaType: string) {
  if (mediaType === 'movie') {
    return {
      page: 1,
      results: mockMovies.slice(0, 10).map((m: any) => ({ ...m, media_type: 'movie' })),
      total_pages: 1,
      total_results: 10,
    };
  }
  return {
    page: 1,
    results: mockTvShows.slice(0, 10).map((t: any) => ({ ...t, media_type: 'tv' })),
    total_pages: 1,
    total_results: 10,
  };
}

function getSimilar(mediaType: string) {
  if (mediaType === 'movie') {
    return {
      page: 1,
      results: mockMovies.slice(5, 15).map((m: any) => ({ ...m, media_type: 'movie' })),
      total_pages: 1,
      total_results: 10,
    };
  }
  return {
    page: 1,
    results: mockTvShows.slice(5, 15).map((t: any) => ({ ...t, media_type: 'tv' })),
    total_pages: 1,
    total_results: 10,
  };
}
