import React from "react";

const SearchCard = (media: any) => {
  media = media.media;
  return (
    <div className="mb-2 flex h-[128px] w-full flex-row items-center rounded-[12px] p-2">
      <img
        src={`https://image.tmdb.org/t/p/w200${media.poster_path}`}
        alt="Movie Poster Not Available"
        className="aspect-[1/1] h-full overflow-hidden rounded-[4px] object-cover object-center"
      />
      <div className="flex flex-col pl-4">
        <p className="text-lg font-bold text-foreground">
          {media.title || media.name}
        </p>
        <p className="text-foreground/70">
          {media.release_date?.slice(0, 4) || media.first_air_date?.slice(0, 4)}
        </p>
      </div>
    </div>
  );
};

export default SearchCard;
