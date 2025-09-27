"use client";

import Link from "next/link";
import React, { useEffect, useRef } from "react";
import { useUser } from "@/hooks/UserContext";
import MenuButtonWithSidebar from "./NavMenuSidebarButton";
import ProfilePictureNew from "@/components/features/navigation/NavProfilePicture";
import NotificationButton from "../../notifications/NotificationButton";
import NavAdMobile from "../../ads/NavAdMobile";

const NavTop = () => {
  const { user } = useUser();
  const topBarRef = useRef<HTMLDivElement>(null);

  // Initialize with 0 instead of accessing window.scrollY
  const lastScrollY = useRef(0);
  // Store the current translation offset (in pixels)
  const currentTranslateY = useRef(0);
  const topBarHeight = 48; // height in pixels

  // This function updates the nav offset based on scroll delta
  const controlNavbar = () => {
    const currentScrollY = window.scrollY;
    const deltaY = currentScrollY - lastScrollY.current;

    // Calculate new translate value and clamp it between -topBarHeight and 0
    let newTranslateY = currentTranslateY.current - deltaY;
    newTranslateY = Math.min(0, Math.max(-topBarHeight, newTranslateY));
    currentTranslateY.current = newTranslateY;

    if (topBarRef.current) {
      topBarRef.current.style.transform = `translateY(${newTranslateY}px)`;
    }
    lastScrollY.current = currentScrollY;
  };

  // Wrap scroll handling in a callback
  const onScroll = () => {
    window.requestAnimationFrame(controlNavbar);
  };

  useEffect(() => {
    // Now it's safe to access window because this effect runs only in the browser
    lastScrollY.current = window.scrollY;
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className="fixed left-0 top-0 z-30 flex w-full flex-col"
      ref={topBarRef}
      style={{ transform: "translateY(0)", willChange: "transform" }}
    >
      <div className="flex h-12 w-full items-center justify-between bg-background px-4 transition-transform duration-100 ease-out md:hidden">
        {/* Left side */}
        <div className="flex flex-row gap-4">
          {/* <MenuButtonWithSidebar /> */}
          <Link href="/" className="flex flex-row items-center gap-1">
            <img
              src="/assets/images/logo_text_new.svg"
              alt="text-logo"
              className="invert-on-dark h-4 w-auto"
            />
          </Link>
        </div>
        {/* Right side */}
        {user ? (
          <div className="flex flex-row items-center gap-4">
            <NotificationButton user_id={user.id} />
            {/* <ProfilePictureNew /> */}
          </div>
        ) : (
          <Link
            href="/login"
            className="flex flex-row items-center gap-2 rounded-full bg-foreground/10 px-4 py-1"
          >
            <img
              src="/assets/icons/account-circle-outline.svg"
              className="invert-on-dark h-5 w-5"
              alt="Sign in"
            />
            <p>Sign in</p>
          </Link>
        )}
      </div>
    </div>
  );
};

export default NavTop;
