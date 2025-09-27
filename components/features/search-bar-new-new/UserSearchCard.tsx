import React from "react";
import { SearchCardProps } from "./MediaSearchCard";
import Link from "next/link";

const UserSearchCard = ({ media: user, onClick }: SearchCardProps) => {
  return (
    <div
      onClick={onClick}
      className={`flex h-32 w-full cursor-pointer flex-row gap-4 p-4 hover:bg-foreground/10`}
    >
      {user.image_url && user.image_url !== "" ? (
        <img
          src={user.image_url}
          alt=""
          className="aspect-square h-full flex-shrink-0 overflow-hidden rounded-full object-cover object-center"
        />
      ) : (
        <div className="aspect-square h-full flex-shrink-0 rounded-full bg-foreground/20"></div>
      )}
      <div className="flex h-full w-full flex-col">
        <p className="line-clamp-1 font-medium">{user.name}</p>
        <p className="text-sm text-foreground/50">@{user.username}</p>
      </div>
    </div>
  );
};

export default UserSearchCard;
