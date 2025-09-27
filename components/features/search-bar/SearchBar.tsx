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
      <form action="" className="z-50" onSubmit={handleSearch}>
        <div className="max-w-screen">
          <SearchMovies
            ref={ref} // Forward the ref to SearchMovies
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
