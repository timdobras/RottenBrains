'use client';

import React, { useState } from 'react';
import { Drawer } from '@base-ui/react/drawer';
import VersionDisplay from '@/components/features/navigation/VersionDisplay';
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
  FeedIcon,
} from '../../../ui/Icon';
import { Menu } from 'lucide-react';
import NavLinkMobile from './SidebarLink';

const NavMenuSidebarButton: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <Drawer.Root open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      {/* Menu Button */}
      <Drawer.Trigger aria-label="Open Menu">
        <Menu className="h-6 w-6" />
      </Drawer.Trigger>

      <Drawer.Portal>
        <Drawer.Backdrop className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Drawer.Popup className="fixed left-0 top-0 z-50 h-screen w-3/4 overflow-y-auto bg-background pb-20 outline-none drop-shadow-md transition-transform duration-200 data-[ending-style]:-translate-x-full data-[starting-style]:-translate-x-full">
          <Drawer.Title className="sr-only">Navigation menu</Drawer.Title>
          <div className="w-full bg-background">
            <Drawer.Close aria-label="Close Menu" className="p-4 text-lg text-foreground">
              X
            </Drawer.Close>
            <ul className="flex flex-col justify-start px-4 py-2">
              <NavLinkMobile href="/" icon={HomeIcon} icon_fill={HomeIconFill} label="Home" />
              <NavLinkMobile href="/protected/feed" icon={FeedIcon} label="Feed" />
              <NavLinkMobile href="/protected/explore" icon={ExploreIcon} label="Explore" />
              <div className="mx-auto my-2 h-[1px] w-[90%] bg-foreground/20"></div>
              <NavLinkMobile href="/protected/profile" icon={ProfileIcon} label="Your profile" />
              <NavLinkMobile href="/protected/watch-list" icon={WatchListIcon} label="Library" />
              <NavLinkMobile href="/protected/watch-history" icon={HistoryIcon} label="History" />
              <div className="mx-auto my-2 h-[1px] w-[90%] bg-foreground/20"></div>
              <NavLinkMobile href="/premium" icon={PremiumIcon} label="Premium" />
              <NavLinkMobile href="/donations" icon={DonationsIcon} label="Donations" />
              <div className="mx-auto my-2 h-[1px] w-[90%] bg-foreground/20"></div>
              <NavLinkMobile href="/info" icon={InfoIcon} label="Info" />
              <NavLinkMobile href="/legal" icon={LegalIcon} label="Legal" />
              <NavLinkMobile href="/help" icon={HelpIcon} label="Help" />
              <NavLinkMobile href="/cookie-policy" icon={CookiesIcon} label="Cookies" />
              <NavLinkMobile
                href="https://docs.google.com/forms/d/e/1FAIpQLSdg0X5LLOozhWX5ZIu1y2shBfYuUFExE_guAts7KCzvVNNwWw/viewform?pli=1"
                icon={FeedbackIcon}
                label="Feedback"
              />
              <div className="mx-auto my-2 h-[1px] w-[90%] bg-foreground/20"></div>
            </ul>
          </div>
        </Drawer.Popup>
      </Drawer.Portal>
    </Drawer.Root>
  );
};

export default NavMenuSidebarButton;
