import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import movieGenres from "@/lib/constants/movie_genres.json";
import tvGenres from "@/lib/constants/tv_genres.json";
import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";

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
    return format(date, "do MMMM yyyy");
  } catch (error) {
    // Log the error for debugging
    console.error("Error formatting date:", error);

    // Return a user-friendly fallback
    return "Invalid date";
  }
}

export function transformRuntime(minutes: number): string {
  const hours: number = Math.floor(minutes / 60);
  const remainingMinutes: number = minutes % 60;
  const seconds: number = Math.floor(Math.random() * 60); // Random seconds between 0 and 59

  const formattedMinutes: string = remainingMinutes.toString().padStart(2, "0");
  const formattedSeconds: string = seconds.toString().padStart(2, "0");
  if (hours > 0) {
    const formattedHours: string = hours.toString();
    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
  } else {
    return `${formattedMinutes}:${formattedSeconds}`;
  }
}

export const formatEpisodeCode = (
  seasonNumber: number,
  episodeNumber: number,
) => {
  return `S${String(seasonNumber).padStart(2, "0")}E${String(
    episodeNumber,
  ).padStart(2, "0")}`;
};

type Genre = {
  id: number;
  name: string;
};

export function getGenreNameById(genreId: number): string {
  // Combine genres into one array
  const combinedGenres: Genre[] = [...movieGenres.genres, ...tvGenres.genres];

  // Verify the genreId type
  if (typeof genreId !== "number") {
    throw new Error(
      `Invalid genreId type: ${typeof genreId}. Expected a number.`,
    );
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
      throw new Error("No date string provided.");
    }

    const date = parseISO(dateString);
    if (!isValid(date)) {
      throw new Error(`Invalid date: ${dateString}`);
    }

    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error: unknown) {
    console.error("Error in getRelativeTime:", error);
    // Return a fallback string, or you could re-throw the error if desired
    return "Invalid date";
  }
}

export function getImageUrl(
  media: any,
  season_number?: number,
  episode_number?: number,
) {
  return (
    media?.images?.backdrops?.[0]?.file_path ||
    (season_number && episode_number ? media.still_path : media.backdrop_path)
  );
}

export function getHrefFromMedia(
  media_type?: string,
  media_id?: number,
  season_number?: number,
  episode_number?: number,
) {
  if (!media_type || !media_id) {
    return "";
  }
  return media_type === "movie"
    ? `/protected/watch/${media_type}/${media_id}`
    : season_number && episode_number
      ? `/protected/watch/${media_type}/${media_id}/${season_number}/${episode_number}`
      : `/protected/watch/${media_type}/${media_id}/1/1`;
}
