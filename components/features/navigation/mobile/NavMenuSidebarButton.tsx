"use client";

import React, { useState } from "react";
import VersionDisplay from "@/components/features/navigation/VersionDisplay";
import NavLinkMobile from "./SidebarLink";
import {
  ExploreIcon,
  HistoryIcon,
  HomeIcon,
  HomeIconFill,
  LikedPostsIcon,
  ProfileIcon,
  SavedPostsIcon,
  WatchLaterIcon,
  WatchListIcon,
  YouIcon,
  DevBlogIcon,
  PremiumIcon,
  DonationsIcon,
  HelpIcon,
  FeedbackIcon,
  GithubIcon,
  CookiesIcon,
  LegalIcon,
  InfoIcon,
} from "../../../ui/Icon";

const NavMenuSidebarButton: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
  };

  return (
    <>
      {/* Menu Button */}
      <button onClick={toggleMenu} aria-label="Open Menu">
        <img
          src="/assets/icons/menu.svg"
          alt="menu icon"
          className="invert-on-dark h-6 w-6"
        />
      </button>

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 z-50 h-screen w-3/4 transform overflow-y-auto bg-background pb-20 drop-shadow-md transition-all duration-200 ${
          isMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="w-full bg-background">
          <button
            onClick={toggleMenu}
            aria-label="Close Menu"
            className="p-4 text-lg text-foreground"
          >
            X
          </button>
          <ul className="flex flex-col justify-start px-4 py-2">
            <NavLinkMobile
              href="/"
              icon={HomeIcon}
              icon_fill={HomeIconFill}
              label="Home"
            />
            <NavLinkMobile
              href="/protected/explore"
              icon={ExploreIcon}
              label="Explore"
            />
            <div className="mx-auto my-2 h-[1px] w-[90%] bg-foreground/20"></div>
            <NavLinkMobile
              href="/protected/profile"
              icon={ProfileIcon}
              label="Your profile"
            />
            <NavLinkMobile
              href="/protected/watch-list"
              icon={WatchListIcon}
              label="Library"
            />
            <NavLinkMobile
              href="/protected/watch-history"
              icon={HistoryIcon}
              label="History"
            />
            <div className="mx-auto my-2 h-[1px] w-[90%] bg-foreground/20"></div>
            <NavLinkMobile href="/premium" icon={PremiumIcon} label="Premium" />
            <NavLinkMobile
              href="/donations"
              icon={DonationsIcon}
              label="Donations"
            />
            <div className="mx-auto my-2 h-[1px] w-[90%] bg-foreground/20"></div>
            <NavLinkMobile href="/info" icon={InfoIcon} label="Info" />
            <NavLinkMobile href="/legal" icon={LegalIcon} label="Legal" />
            <NavLinkMobile href="/help" icon={HelpIcon} label="Help" />
            <NavLinkMobile
              href="/cookie-policy"
              icon={CookiesIcon}
              label="Cookies"
            />
            <NavLinkMobile
              href="https://docs.google.com/forms/d/e/1FAIpQLSdg0X5LLOozhWX5ZIu1y2shBfYuUFExE_guAts7KCzvVNNwWw/viewform?pli=1"
              icon={FeedbackIcon}
              label="Feedback"
            />
            <div className="mx-auto my-2 h-[1px] w-[90%] bg-foreground/20"></div>
          </ul>
        </div>
      </div>

      {/* Backdrop (optional, to close the menu when clicking outside) */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50"
          onClick={toggleMenu}
        />
      )}
    </>
  );
};

export default NavMenuSidebarButton;
