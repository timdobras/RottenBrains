"use client";

import { useUser } from "@/hooks/UserContext";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

const UserIconNavBottom = () => {
  const { user } = useUser();
  const pathname = usePathname();
  const href = "/protected/user-mobile";
  const isActive = pathname.includes(href.split("/").pop()!);
  return (
    <Link
      href={"/protected/user-mobile"}
      className={`flex flex-1 flex-col items-center justify-center opacity-80`}
    >
      <div
        className={`flex w-full flex-col items-center justify-center rounded-full p-1 hover:bg-secondary/20 hover:text-accent ${
          isActive ? `bg-secondary/20 text-accent` : `text-foreground`
        }`}
      >
        <img
          src={user?.image_url}
          alt="User Avatar"
          className={`aspect-square h-[24px] rounded-full`}
        />
      </div>
      <p className="text-xs">You</p>
    </Link>
  );
};

export default UserIconNavBottom;
