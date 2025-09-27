import { getGenreNameById, getHrefFromMedia } from "@/lib/utils";
import Link from "next/link";
import React from "react";

export type SearchCardProps = {
  media: any;
  onClick: () => void;
};

const MediaSearchCard = ({ media, onClick }: SearchCardProps) => {
  return (
    <div
      onClick={onClick}
      className={`flex h-auto w-full cursor-pointer flex-row gap-4 p-4 hover:bg-foreground/10 md:h-32`}
    >
      {media.poster_path && media.poster_path !== "" ? (
        <img
          src={`https://image.tmdb.org/t/p/w200${media.poster_path}`}
          alt=""
          className="aspect-square h-24 flex-shrink-0 overflow-hidden rounded-[8px] object-cover object-center md:h-full"
        />
      ) : (
        <div className="aspect-square h-full flex-shrink-0 rounded-[8px] bg-foreground/20"></div>
      )}
      <div className="flex h-full w-full flex-col justify-between gap-2 md:gap-0">
        <p className="line-clamp-1 font-medium">{media.title || media.name}</p>
        <p className="line-clamp-1 text-sm text-foreground/50">
          {media.overview}
        </p>
        <div className="flex flex-row flex-wrap gap-2">
          {media.genre_ids.map((id: number) => {
            const genre_name = getGenreNameById(id);
            return (
              <Link
                href={`/${media.media_type}/${id}`}
                key={id}
                className="rounded-[4px] bg-foreground/10 px-3 py-1 text-xs"
              >
                {genre_name}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MediaSearchCard;
