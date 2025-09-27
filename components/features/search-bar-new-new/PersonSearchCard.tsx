import React from "react";
import { SearchCardProps } from "./MediaSearchCard";
import Link from "next/link";

const PersonSearchCard = ({ media: person, onClick }: SearchCardProps) => {
  return (
    <div
      onClick={onClick}
      className={`flex h-32 w-full cursor-pointer flex-row gap-4 p-4 hover:bg-foreground/10`}
    >
      {person.profile_path && person.profile_path !== "" ? (
        <img
          src={`https://image.tmdb.org/t/p/w200${person.profile_path}`}
          alt=""
          className="aspect-square h-full flex-shrink-0 overflow-hidden rounded-[8px] object-cover object-center"
        />
      ) : (
        <div className="aspect-square h-full flex-shrink-0 rounded-[8px] bg-foreground/20"></div>
      )}
      <div className="flex h-full w-full flex-col">
        <p className="truncate font-medium">{person.name}</p>
      </div>
    </div>
  );
};

export default PersonSearchCard;
