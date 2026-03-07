import { type ClassValue, clsx } from 'clsx';
import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';
import { twMerge } from 'tailwind-merge';
import movieGenres from '@/lib/constants/movie_genres.json';
import tvGenres from '@/lib/constants/tv_genres.json';
import { logger } from '@/lib/logger';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(inputDate: string): string {
  try {
    // Parse the input into a Date object
    const date = parseISO(inputDate);

    // Validate the parsed date
    if (!isValid(date)) {
      throw new Error(`Invalid date: ${inputDate}`);
    }

    // Format and return
    return format(date, 'do MMMM yyyy');
  } catch (error) {
    // Log the error for debugging
    logger.error('Error formatting date:', error);

    // Return a user-friendly fallback
    return 'Invalid date';
  }
}

export function transformRuntime(minutes: number): string {
  const hours: number = Math.floor(minutes / 60);
  const remainingMinutes: number = minutes % 60;

  const formattedMinutes: string = remainingMinutes.toString().padStart(2, '0');
  if (hours > 0) {
    const formattedHours: string = hours.toString();
    return `${formattedHours}:${formattedMinutes}`;
  } else {
    return `${formattedMinutes}m`;
  }
}

export const formatEpisodeCode = (seasonNumber: number, episodeNumber: number) => {
  return `S${String(seasonNumber).padStart(2, '0')}E${String(episodeNumber).padStart(2, '0')}`;
};

type Genre = {
  id: number;
  name: string;
};

export function getGenreNameById(genreId: number): string {
  // Combine genres into one array
  const combinedGenres: Genre[] = [...movieGenres.genres, ...tvGenres.genres];

  // Verify the genreId type
  if (typeof genreId !== 'number') {
    throw new Error(`Invalid genreId type: ${typeof genreId}. Expected a number.`);
  }

  // Find the genre by ID
  const genre = combinedGenres.find((g) => {
    return g.id === genreId;
  });

  // Handle missing genre
  if (!genre) {
    throw new Error(`Genre with ID ${genreId} not found.`);
  }

  // Return the genre name
  return genre.name;
}

export function getRelativeTime(dateString: string): string {
  try {
    if (!dateString) {
      throw new Error('No date string provided.');
    }

    const date = parseISO(dateString);
    if (!isValid(date)) {
      throw new Error(`Invalid date: ${dateString}`);
    }

    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error: unknown) {
    logger.error('Error in getRelativeTime:', error);
    // Return a fallback string, or you could re-throw the error if desired
    return 'Invalid date';
  }
}

export function getImageUrl(media: any, season_number?: number, episode_number?: number) {
  return (
    media?.images?.backdrops?.[0]?.file_path ||
    (season_number && episode_number ? media.still_path : media.backdrop_path)
  );
}

/**
 * Extract the release/air year from a media item.
 */
export function getMediaYear(item: { release_date?: string; first_air_date?: string }): string {
  const date = item.release_date || item.first_air_date;
  if (!date) return '';
  const year = new Date(date).getFullYear();
  return Number.isNaN(year) ? '' : year.toString();
}

/**
 * Format a media item's duration: "Xh Ym" for movies,
 * "N Season(s) · M Episodes" for TV.
 */
export function getMediaDuration(item: {
  media_type: string;
  runtime?: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
}): string {
  if (item.media_type === 'movie' && item.runtime) {
    const hours = Math.floor(item.runtime / 60);
    const mins = item.runtime % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }
  if (item.media_type === 'tv') {
    const parts: string[] = [];
    if (item.number_of_seasons) {
      parts.push(`${item.number_of_seasons} Season${item.number_of_seasons > 1 ? 's' : ''}`);
    }
    if (item.number_of_episodes) {
      parts.push(`${item.number_of_episodes} Episodes`);
    }
    return parts.join(' · ') || '';
  }
  return '';
}

/**
 * Pick the best English logo from a TMDB images.logos array.
 * Falls back to the first logo if no English logos exist.
 */
export function getEnglishLogoPath(
  logos?: { file_path: string; iso_639_1: string; vote_average: number }[]
): string | null {
  if (!logos || logos.length === 0) return null;

  const english = logos
    .filter((l) => l.iso_639_1 === 'en')
    .sort((a, b) => b.vote_average - a.vote_average);

  const best = english[0] || logos[0];
  return best?.file_path ?? null;
}

export function getHrefFromMedia(
  media_type?: string,
  media_id?: number,
  season_number?: number,
  episode_number?: number
) {
  if (!media_type || !media_id) {
    return '';
  }
  return media_type === 'movie'
    ? `/protected/watch/${media_type}/${media_id}`
    : season_number && episode_number
      ? `/protected/watch/${media_type}/${media_id}/${season_number}/${episode_number}`
      : `/protected/watch/${media_type}/${media_id}/1/1`;
}
