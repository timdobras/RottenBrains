"use client";
import { useUser } from "@/hooks/UserContext";
import React from "react";

const Profile = () => {
  const { user } = useUser();
  return (
    <a
      href={`/protected/profile`}
      className="flex w-full flex-row items-center gap-4 p-4"
    >
      <img
        src={user.image_url}
        alt="User Avatar"
        className={`aspect-square h-16 rounded-full`}
      />
      <div className="flex h-max flex-col">
        <span className="text-2xl font-bold">{user.username}</span>
        <span className="text-xs lowercase text-foreground/50">
          @{user.username}
        </span>
      </div>
    </a>
  );
};

export default Profile;
