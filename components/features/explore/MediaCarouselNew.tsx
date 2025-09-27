"use client";

import React, { useState } from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Link from "next/link";
import { Genre } from "@/components/features/home/GenreSelector";
import movie_genres from "@/lib/constants/movie_genres.json";
import tv_genres from "@/lib/constants/tv_genres.json";
import { getGenreNameById } from "@/lib/utils";

const TopMovieCarousel = ({ movies }: any) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const toggleDropdown = () => {
    setIsDropdownOpen((prev) => !prev);
  };

  const settings = {
    dots: false,
    infinite: true,
    fade: true,
    waitForAnimate: false,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 7000,
    pauseOnHover: false,
    arrows: false,
  };

  const movieGenres: Genre[] = movie_genres.genres.map((genre: any) => ({
    ...genre,
    media_type: "movie",
  }));
  const tvGenres: Genre[] = tv_genres.genres.map((genre: any) => ({
    ...genre,
    media_type: "tv",
  }));

  return (
    <div className="w-full">
      <Slider {...settings} className="h-full w-full">
        {movies &&
          movies.slice(0, 5).map((media: any, index: number) => {
            const watchLink =
              media.media_type === "movie"
                ? `/protected/watch/${media.media_type}/${media.id}`
                : `/protected/watch/${media.media_type}/${media.id}/1/1`;

            return (
              <div
                className="h-[75vh] w-full overflow-hidden md:h-[85vh] md:rounded-[16px]"
                key={index}
              >
                <div className="h-full w-full">
                  <div className="relative h-full w-full">
                    <div className="absolute left-0 top-0 z-20 flex h-full w-full flex-col justify-between p-4 md:p-8">
                      <div className="flex flex-row gap-4">
                        <div className="relative">
                          <button
                            onClick={toggleDropdown}
                            className="flex flex-row items-center gap-2 rounded-full bg-black/20 px-3 py-1 backdrop-blur-xl"
                          >
                            <p className="text-white">Categories</p>
                            <img
                              src="/assets/icons/drop_down_arrow_solid.svg"
                              alt="dropdown arrow"
                              className=""
                            />
                          </button>
                          {isDropdownOpen && (
                            <div className="backdrop-blur/xl custom-scrollbar absolute left-0 top-full z-50 mt-2 flex max-h-[60vh] w-max flex-col overflow-y-auto rounded-lg bg-background p-2 shadow-lg md:flex-row">
                              <div>
                                <h3 className="border-b border-foreground/10 px-4 py-2">
                                  Movies
                                </h3>
                                <ul className="grid grid-cols-2 gap-2 p-2 text-foreground">
                                  {movieGenres.map((genre: any) => (
                                    <Link
                                      href={`/movie/${genre.id}`}
                                      key={genre.id}
                                      className="cursor-pointer rounded-[4px] px-2 py-1 hover:bg-foreground/10"
                                    >
                                      {genre.name}
                                    </Link>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <h3 className="border-b border-foreground/10 px-4 py-2">
                                  TV
                                </h3>
                                <ul className="grid grid-cols-2 gap-2 p-2 text-foreground">
                                  {tvGenres.map((genre: any) => (
                                    <Link
                                      href={`/tv/${genre.id}`}
                                      key={genre.id}
                                      className="cursor-pointer rounded-[4px] px-2 py-1 hover:bg-foreground/10"
                                    >
                                      {genre.name}
                                    </Link>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="self-start rounded-full bg-black/20 px-3 py-1 text-white backdrop-blur-xl">
                          🔥Now Popular
                        </div>
                      </div>

                      <div className="flex flex-col gap-4">
                        <div className="flex flex-row gap-2">
                          {media.genre_ids.slice(0, 2).map((genre: any) => {
                            return (
                              <div
                                key={genre}
                                className="rounded-full bg-black/20 px-3 py-1 text-sm text-white backdrop-blur-xl"
                              >
                                {getGenreNameById(genre)}
                              </div>
                            );
                          })}
                        </div>
                        <h2 className="text-4xl font-bold text-white">
                          {media.title || media.name}
                        </h2>
                        <h3 className="line-clamp-[2] text-white md:line-clamp-[4] md:w-1/3">
                          {media.overview}
                        </h3>
                        <div className="flex flex-col gap-4 md:flex-row">
                          <Link
                            href={watchLink}
                            className="flex flex-row items-center gap-2 rounded-full bg-white px-6 py-3 text-lg text-black"
                          >
                            <img
                              src="/assets/icons/play-solid.svg"
                              alt=""
                              className="h-[20px] w-[20px]"
                            />
                            <p>Watch Now</p>
                          </Link>
                          <Link
                            href={`/protected/media/${media.media_type}/${media.id}`}
                            className="rounded-full bg-black/20 px-6 py-3 text-lg text-white backdrop-blur-xl"
                          >
                            View Details
                          </Link>
                        </div>
                      </div>
                    </div>
                    <div className="gradient-explore absolute right-0 top-0 z-10 h-full w-full"></div>
                    <img
                      src={`https://image.tmdb.org/t/p/original${media.backdrop_path}`}
                      alt=""
                      className="h-full w-full bg-background object-cover object-center"
                    />
                  </div>
                </div>
              </div>
            );
          })}
      </Slider>
    </div>
  );
};

export default React.memo(TopMovieCarousel);
