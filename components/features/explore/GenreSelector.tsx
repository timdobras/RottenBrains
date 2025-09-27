"use client";

import React, { useEffect, useRef, useState } from "react";
import movieGenres from "@/lib/constants/movie_genres.json";
import tvGenres from "@/lib/constants/tv_genres.json";
import Link from "next/link";
import { useInView } from "react-intersection-observer";
import { getFromGenres } from "@/lib/tmdb";
import { motion } from "framer-motion";

const GenreSelector: React.FC = () => {
  const [selectedType, setSelectedType] = useState<"movie" | "tv">("movie");
  const [mediaGenre, setMediaGenre] = useState<any[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string>("14");
  const [loading, setLoading] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const { ref, inView } = useInView();

  const targetRef = useRef<HTMLDivElement>(null);

  const variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  useEffect(() => {
    const loadMore = async () => {
      if (inView && hasMore && !loading) {
        setLoading(true);
        try {
          const result = await getFromGenres(selectedType, page, selectedGenre);
          const res = result.results;
          if (res.length === 0) {
            setHasMore(false); // No more posts to load
          } else {
            setMediaGenre((prevMediaGenre: any) => [...prevMediaGenre, ...res]);
            setPage((prevPage) => prevPage + 1);
          }
        } catch (error) {
          console.error("Error fetching posts:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadMore();
  }, [inView, hasMore, loading, page, selectedType, selectedGenre]);

  const handleButtonClick = (type: "movie" | "tv") => {
    setSelectedType(type);
  };

  const handleGenreClick = (genre_id: string) => {
    setMediaGenre([]);
    setSelectedGenre(genre_id);
  };

  const handleScrollToTarget = () => {
    targetRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const genres =
    selectedType === "movie" ? movieGenres.genres : tvGenres.genres;
  // Add selectedType to dependencies to fetch when type changes

  return (
    <div
      className="flex w-full flex-col justify-center gap-4 p-2"
      ref={targetRef}
    >
      {/* <button
				onClick={handleScrollToTarget}
				className="fixed bottom-[25px] right-[25px] bg-accent p-8 rounded-full min-h-10 min-w-10 hidden md:block"
			></button> */}
      <div className="mt-4 flex flex-row justify-center gap-4">
        <button
          key={"movie"}
          onClick={() => handleButtonClick("movie")}
          className={`rounded-[8px] p-2 px-6 text-xl hover:bg-accent/30 ${
            selectedType === "movie" ? "bg-accent/30" : "bg-foreground/10"
          }`}
        >
          Movie Genres
        </button>
        <button
          key={"tv"}
          onClick={() => handleButtonClick("tv")}
          className={`rounded-[8px] p-2 px-6 text-xl hover:bg-accent/30 ${
            selectedType === "tv" ? "bg-accent/30" : "bg-foreground/10"
          }`}
        >
          TV Genres
        </button>
      </div>
      <div className="mb-4 flex justify-center">
        <ul className="custom-scrollbar flex flex-row items-center gap-4 overflow-x-auto pb-2">
          {genres.map((genre) => (
            <li key={genre.id} className="flex-shrink-0">
              <button
                key={genre.id}
                className={`rounded-[8px] p-2 px-6 hover:bg-accent/30 ${
                  genre.id.toString() === selectedGenre
                    ? "bg-accent/30"
                    : "bg-foreground/10"
                }`}
                onClick={() => handleGenreClick(genre.id.toString())}
              >
                {genre.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="mx-auto grid w-full grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
        {mediaGenre && mediaGenre.length > 0 ? (
          mediaGenre.map((media: any) => (
            <Link href={`/protected/media/${selectedType}/${media.id}`}>
              <motion.div
                key={media.id}
                variants={variants}
                initial="hidden"
                animate="visible"
                transition={{
                  delay: 0.15,
                  ease: "easeInOut",
                  duration: 0.25,
                }}
                viewport={{ amount: 0 }}
              >
                <img
                  src={`https://image.tmdb.org/t/p/w500${media.poster_path}`}
                  alt={media.title || media.name}
                  className="rounded-[8px] bg-foreground/10 hover:opacity-80"
                  loading="lazy"
                />
              </motion.div>
            </Link>
          ))
        ) : (
          <p>Select a Genre</p>
        )}
      </div>
      {loading && <></>}
      {!loading && hasMore && <div ref={ref}></div>}
    </div>
  );
};

export default GenreSelector;
