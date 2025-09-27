"use client";
import React, { useEffect, useState, useMemo } from "react";
import { redirect, usePathname, useRouter } from "next/navigation";
import { useUser } from "@/hooks/UserContext";

import movie_genres_json from "@/lib/constants/movie_genres.json";
import tv_genres_json from "@/lib/constants/tv_genres.json";
import {
  getTopMovieGenresForUser,
  getTopTvGenresForUser,
  updateUserFeedGenres,
} from "@/lib/supabase/clientQueries";
import Modal from "@/components/features/profile/Modal";

export interface Genre {
  id: number;
  name: string;
  media_type: "movie" | "tv";
}

interface RecommendedGenre {
  genre_code: string;
  media_type: "movie" | "tv";
  value?: number;
}

type UnifiedGenre = Genre | RecommendedGenre;

interface FeedGenre {
  genre_code: string;
  media_type: "movie" | "tv";
}

type GenreSelectorProps = {
  media_type?: string;
  genre_id?: number;
};

const GenreSelector: React.FC<GenreSelectorProps> = ({
  media_type,
  genre_id,
}) => {
  const { user } = useUser();
  const router = useRouter();

  const [feedGenres, setFeedGenres] = useState<FeedGenre[]>(
    user?.feed_genres || [],
  );
  const [topRecommendedGenres, setTopRecommendedGenres] = useState<
    RecommendedGenre[]
  >([]);
  const [selectedCategory, setSelectedCategory] = useState<
    "Recommended" | "movie" | "tv" | "Home"
  >("Recommended");

  const [loading, setLoading] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const user_id = user?.id;

  useEffect(() => {
    if (user?.feed_genres) {
      setFeedGenres(user.feed_genres);
    }
  }, [user?.feed_genres]);

  // ---------------------------
  // 2. GENRE DATA
  // ---------------------------
  const movieGenres: Genre[] = movie_genres_json.genres.map((genre: any) => ({
    ...genre,
    media_type: "movie",
  }));
  const tvGenres: Genre[] = tv_genres_json.genres.map((genre: any) => ({
    ...genre,
    media_type: "tv",
  }));

  // Update selected category based on the URL
  useEffect(() => {
    if (media_type === "movie" || media_type === "tv") {
      setSelectedCategory(media_type);
    } else {
      setSelectedCategory("Recommended");
    }
  }, [media_type]);

  // ---------------------------
  // 4. FETCH RECOMMENDED GENRES
  // ---------------------------
  useEffect(() => {
    const fetchRecommendedGenres = async () => {
      if (!user_id) return; // Make sure we have the user ID
      setLoading(true);
      try {
        // Fetch top genres for this user from Supabase
        const [topMovies, topTVs] = await Promise.all([
          getTopMovieGenresForUser(undefined, user),
          getTopTvGenresForUser(undefined, user),
        ]);

        // Combine movie and TV recommended genres
        const combinedGenres: RecommendedGenre[] = [
          ...(topMovies?.map((genre: any) => ({
            ...genre,
            media_type: "movie",
          })) || []),
          ...(topTVs?.map((genre: any) => ({
            ...genre,
            media_type: "tv",
          })) || []),
        ];

        setTopRecommendedGenres(combinedGenres);
      } catch (error) {
        console.error("Error fetching recommended genres:", error);
      } finally {
        setLoading(false);
      }
    };

    const getGenresNoUser = async () => {
      console.log("NO USER");
      setTopRecommendedGenres([]);
    };

    if (selectedCategory === "Recommended") {
      if (user) {
        fetchRecommendedGenres();
      } else {
        getGenresNoUser();
      }
    }
  }, [user_id, selectedCategory]);

  // ---------------------------
  // 5. DISPLAYED GENRES
  // ---------------------------
  // Decide which set of genres to display in the category row
  const getGenres = useMemo<UnifiedGenre[]>(() => {
    switch (selectedCategory) {
      case "movie":
        return movieGenres;
      case "tv":
        return tvGenres;
      case "Recommended":
        return topRecommendedGenres;
      default:
        return [];
    }
  }, [selectedCategory, topRecommendedGenres, movieGenres, tvGenres]);

  // Helper to retrieve genre name from ID
  const getGenreName = (genreId: number, mediaType: string) => {
    let genres = mediaType === "movie" ? movieGenres : tvGenres;
    const genre = genres.find((g) => g.id === genreId);
    return genre ? genre.name : "Unknown";
  };

  // Type guard to check if item is a standard Genre (vs. recommended)
  const isGenre = (genre: UnifiedGenre): genre is Genre => {
    return (genre as Genre).id !== undefined;
  };

  // ---------------------------
  // 6. CLICK HANDLERS
  // ---------------------------
  const handleGenreClick = (genreId: number, mediaType: "movie" | "tv") => {
    router.push(`/genre/${mediaType}/${genreId}`);
  };

  const handleRecommendedClick = () => {
    setSelectedCategory("Recommended");
    redirect("/");
  };

  // Add genre to feed (optimistic update)
  const addGenreToFeed = async (genreId: number, mediaType: "movie" | "tv") => {
    if (!user_id) return;

    const oldFeedGenres = [...feedGenres];
    const newGenre = {
      genre_code: genreId.toString(),
      media_type: mediaType,
    };

    const updatedFeedGenres = [...feedGenres, newGenre];
    // Optimistic update
    setFeedGenres(updatedFeedGenres);

    // Persist to Supabase
    const { error } = await updateUserFeedGenres(
      user_id.toString(),
      updatedFeedGenres,
    );
    if (error) {
      console.error("Failed to add genre:", error);
      // Revert on error
      setFeedGenres(oldFeedGenres);
    }
  };

  // Remove genre from feed (optimistic update)
  const removeGenreFromFeed = async (
    genreId: number,
    mediaType: "movie" | "tv",
  ) => {
    if (!user_id) return;

    const oldFeedGenres = [...feedGenres];
    const updatedFeedGenres = feedGenres.filter(
      (item) =>
        !(
          item.genre_code === genreId.toString() &&
          item.media_type === mediaType
        ),
    );

    // Optimistic update
    setFeedGenres(updatedFeedGenres);

    // Persist to Supabase
    const { error } = await updateUserFeedGenres(
      user_id.toString(),
      updatedFeedGenres,
    );
    if (error) {
      console.error("Failed to remove genre:", error);
      // Revert on error
      setFeedGenres(oldFeedGenres);
    }
  };

  // ---------------------------
  // 7. RENDER
  // ---------------------------

  return (
    <div className="hidden-scrollbar top-20 -mb-4 flex h-12 flex-row items-center gap-2 overflow-x-auto bg-background px-2 py-2 text-sm transition-all duration-300 md:sticky md:z-10 md:h-14 md:px-0 md:pb-4">
      {/* Category buttons */}
      {user ? (
        <button
          className="flex h-full flex-shrink-0 items-center justify-center rounded-full bg-foreground/10 p-2"
          onClick={() => setIsSettingsModalOpen(true)}
        >
          <img
            src="/assets/icons/tune-outline.svg"
            alt="settings"
            className="invert-on-dark aspect-square h-full"
          />
        </button>
      ) : (
        <></>
      )}

      {user ? (
        <button
          className={`h-full rounded-full px-4 ${
            selectedCategory === "Recommended"
              ? "bg-foreground text-background"
              : "bg-foreground/10"
          }`}
          onClick={handleRecommendedClick}
        >
          Recommended
        </button>
      ) : (
        <button
          className={`h-full rounded-full px-4 ${
            selectedCategory === "Recommended"
              ? "bg-foreground text-background"
              : "bg-foreground/10"
          }`}
          onClick={handleRecommendedClick}
        >
          Home
        </button>
      )}
      <button
        className={`h-full rounded-full px-4 ${
          selectedCategory === "movie"
            ? "bg-foreground text-background"
            : "bg-foreground/10"
        }`}
        onClick={() => setSelectedCategory("movie")}
      >
        Movies
      </button>
      <button
        className={`h-full rounded-full px-4 ${
          selectedCategory === "tv"
            ? "bg-foreground text-background"
            : "bg-foreground/10"
        }`}
        onClick={() => setSelectedCategory("tv")}
      >
        TV
      </button>

      {!loading &&
        getGenres.map((genre) => {
          let genreName: string;
          let genreId: number;
          let mediaType: "movie" | "tv";

          if (isGenre(genre)) {
            // It's a standard Genre
            genreName = genre.name;
            genreId = genre.id;
            mediaType = genre.media_type;
          } else {
            // It's a RecommendedGenre
            genreId = Number(genre.genre_code);
            mediaType = genre.media_type;
            genreName = getGenreName(genreId, mediaType);
          }

          // Highlight if this genre matches the URL
          const isSelected =
            media_type === mediaType && Number(genre_id) === genreId;

          return (
            <button
              key={`${mediaType}-${genreId}`}
              className={`flex h-full flex-shrink-0 items-center rounded-full px-4 ${
                isSelected
                  ? "bg-foreground text-background"
                  : "bg-foreground/10"
              }`}
              onClick={() => handleGenreClick(genreId, mediaType)}
            >
              {genreName}
            </button>
          );
        })}

      {/* Settings Modal */}
      <Modal
        isOpen={isSettingsModalOpen}
        onClose={() => {
          setIsSettingsModalOpen(false);
        }}
        title="Personalized Feed"
      >
        <div className="w-full">
          <h2 className="mb-2 text-lg font-medium">Your Genres</h2>
          <p className="mb-4 text-sm text-foreground/60">
            These genres will be used to build your custom feed. You can also
            filter out the content on your feed by removing the genres you
            don&apos;t want to see on your home page.
          </p>

          {/* Movie Genres in Feed */}
          <h3 className="mb-2 font-medium">Movie</h3>
          <div className="mb-4 flex w-full flex-row flex-wrap gap-4">
            {movieGenres
              .filter((genre) =>
                feedGenres.some(
                  (feedGenre) =>
                    feedGenre.genre_code === genre.id.toString() &&
                    feedGenre.media_type === "movie",
                ),
              )
              .map((genre) => (
                <button
                  onClick={() => removeGenreFromFeed(genre.id, "movie")}
                  key={genre.id}
                  className="flex flex-shrink-0 flex-row items-center gap-2 rounded-[8px] bg-foreground px-3 py-1 text-background"
                >
                  <p>{genre.name}</p>
                  <p className="text-xl font-semibold">&times;</p>
                </button>
              ))}
          </div>

          {/* TV Genres in Feed */}
          <h3 className="mb-2 font-medium">TV</h3>
          <div className="mb-8 flex w-full flex-row flex-wrap gap-4">
            {tvGenres
              .filter((genre) =>
                feedGenres.some(
                  (feedGenre) =>
                    feedGenre.genre_code === genre.id.toString() &&
                    feedGenre.media_type === "tv",
                ),
              )
              .map((genre) => (
                <button
                  onClick={() => removeGenreFromFeed(genre.id, "tv")}
                  key={genre.id}
                  className="flex flex-shrink-0 flex-row items-center gap-2 rounded-[8px] bg-foreground px-3 py-1 text-background"
                >
                  <p>{genre.name}</p>
                  <p className="text-xl font-semibold">&times;</p>
                </button>
              ))}
          </div>

          <h2 className="mb-2 text-lg font-medium">Other Genres</h2>
          <p className="mb-4 text-sm text-foreground/60">
            Genres that are here will not be included in your recommendations
            and will not show up on your home page.
          </p>

          {/* Excluded Movie Genres */}
          <h3 className="mb-2 font-medium">Movies</h3>
          <div className="mb-4 flex w-full flex-row flex-wrap gap-4">
            {movieGenres
              .filter(
                (genre) =>
                  !feedGenres.some(
                    (feedGenre) =>
                      feedGenre.genre_code === genre.id.toString() &&
                      feedGenre.media_type === "movie",
                  ),
              )
              .map((genre) => (
                <button
                  onClick={() => addGenreToFeed(genre.id, "movie")}
                  key={genre.id}
                  className="flex flex-shrink-0 flex-row items-center gap-2 rounded-[8px] bg-foreground/10 px-3 py-1"
                >
                  <p>{genre.name}</p>
                  <p className="text-xl font-semibold">&#10003;</p>
                </button>
              ))}
          </div>

          {/* Excluded TV Genres */}
          <h3 className="mb-2 font-medium">TV</h3>
          <div className="mb-4 flex min-h-16 w-full flex-row flex-wrap gap-4">
            {tvGenres
              .filter(
                (genre) =>
                  !feedGenres.some(
                    (feedGenre) =>
                      feedGenre.genre_code === genre.id.toString() &&
                      feedGenre.media_type === "tv",
                  ),
              )
              .map((genre) => (
                <button
                  onClick={() => addGenreToFeed(genre.id, "tv")}
                  key={genre.id}
                  className="flex flex-shrink-0 flex-row items-center gap-2 rounded-[8px] bg-foreground/10 px-3 py-1"
                >
                  <p>{genre.name}</p>
                  <p className="text-xl font-semibold">&#10003;</p>
                </button>
              ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default GenreSelector;
