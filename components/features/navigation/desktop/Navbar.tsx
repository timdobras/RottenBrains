"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/hooks/UserContext";
import useLocalStorage from "@/hooks/useLocalStorage";
import { useSidebar } from "@/hooks/SidebarContext";
import NotificationButton from "../../notifications/NotificationButton";
import ProfilePictureNew from "./ProfilePictureNew";
import SearchBar from "../../search-bar-new-new/SearchBar";

const Navbar = ({ children }: any) => {
  const pathname = usePathname();
  const { user } = useUser();

  const [mounted, setMounted] = useState(false);

  const { isSidebarOpen, toggleSidebar } = useSidebar(); // Destructure from context

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <nav
      className={`fixed top-0 z-30 hidden h-20 px-4 py-4 transition-all duration-300 ${
        isSidebarOpen
          ? "left-52 w-[calc(100vw-208px)]"
          : "left-24 w-[calc(100vw-96px)]"
      } justify-center bg-background md:flex`}
    >
      <div className="flex w-full flex-col items-center">
        {/* This container holds all elements in a row */}
        <div className="flex w-full items-center justify-between gap-4 pr-4">
          {/* Middle Section: The search bar expands to fill available space */}
          <div className="h-full w-full flex-1">
            {/* <SearchBar link={true} user={true}></SearchBar> */}
            <SearchBar></SearchBar>
          </div>

          {/* Right Section: Icons & Profile - do not shrink */}
          <div className="flex h-full flex-shrink-0 items-center gap-4">
            {user ? (
              <>
                <Link
                  href="/protected/create-post"
                  className={`flex aspect-square h-full items-center justify-center rounded-full bg-foreground/10 ${
                    pathname.includes("create-post")
                      ? "text-primary"
                      : "text-foreground"
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    height="24px"
                    width="24px"
                    viewBox="0 -960 960 960"
                    className="fill-current"
                  >
                    <path d="M440-280h80v-160h160v-80H520v-160h-80v160H280v80h160v160Zm40 200q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z" />
                  </svg>
                </Link>
                <div className="flex aspect-square h-full items-center justify-center rounded-full bg-foreground/10">
                  <NotificationButton user_id={user.id} />
                </div>
                <div className="flex items-center">
                  <ProfilePictureNew />
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/register"
                  className="flex flex-row items-center gap-2 rounded-full bg-foreground/10 px-4 py-2"
                >
                  <img
                    src="/assets/icons/account-circle-outline.svg"
                    className="invert-on-dark opacity-80"
                    alt=""
                  />
                  <p>Create Account</p>
                </Link>
                <Link
                  href="/login"
                  className="flex flex-row items-center gap-2 rounded-full bg-foreground/10 px-4 py-2"
                >
                  <img
                    src="/assets/icons/account-circle-outline.svg"
                    className="invert-on-dark opacity-80"
                    alt=""
                  />
                  <p>Log in</p>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
