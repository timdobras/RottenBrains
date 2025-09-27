"use client";
import React, { forwardRef } from "react";
import SearchMovies from "./SearchMovies";

// SEARCH BAR!
const SearchBar = forwardRef<HTMLInputElement, any>(
  ({ media, setMedia, link }, ref) => {
    const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
    };

    return (
      <form action="" className="h-full" onSubmit={handleSearch}>
        <div className="max-w-screen h-full">
          <SearchMovies
            ref={ref}
            media={media}
            setMedia={setMedia}
            link={link}
          />
        </div>
      </form>
    );
  },
);

export default SearchBar;
