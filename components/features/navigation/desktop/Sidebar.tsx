'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { LogoMark, LogoWordmark } from '@/components/ui/Logo';
import { useSidebar } from '@/hooks/SidebarContext';
import useHasMounted from '@/hooks/useHasMounted';
import useLocalStorage from '@/hooks/useLocalStorage';
import { useUser } from '@/hooks/UserContext';
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
import NavLink from './NavLink';

const Sidebar = () => {
  const { isSidebarOpen, toggleSidebar } = useSidebar(); // Client-only state from context
  const mounted = useHasMounted();
  const { user } = useUser();

  // Until the component is mounted on the client, render nothing
  if (!mounted) {
    return null;
  }

  return (
    <aside
      className={`fixed left-0 top-0 z-30 hidden h-full min-h-screen bg-background px-2 transition-all duration-300 md:flex ${
        isSidebarOpen ? 'w-52' : 'w-24'
      }`}
    >
      {isSidebarOpen ? (
        <ul className="flex h-full w-full flex-col justify-start">
          <div className="my-8 flex w-full flex-row items-center gap-4 px-4">
            <Link href={'/'} className="flex flex-row items-center gap-4">
              <LogoWordmark className="h-4 w-auto text-foreground" />
            </Link>
            {/* <button
              onClick={toggleSidebar}
              className="absolute -right-0 rounded-full bg-background p-1 hover:bg-foreground/20"
            >
              <img
                src="/assets/icons/chevron-back.svg"
                alt="menu-icon"
                width={24}
                height={24}
                className="invert-on-dark"
              />
            </button> */}
          </div>
          <NavLink href="/" icon={HomeIcon} icon_fill={HomeIconFill} label="Home" />
          <NavLink href="/protected/feed" icon={FeedIcon} label="Feed" />
          <NavLink href="/protected/explore" icon={ExploreIcon} label="Explore" />
          <div className="mx-auto my-2 h-[1px] w-[90%] bg-foreground/20"></div>
          <NavLink href="/protected/profile" icon={ProfileIcon} label="Your profile" />
          <NavLink href="/protected/watch-list" icon={WatchListIcon} label="Library" />
          <NavLink href="/protected/watch-history" icon={HistoryIcon} label="History" />
          {/* <div className="mx-auto my-2 h-[1px] w-[90%] bg-foreground/20"></div> */}
          {/* <NavLink href="/premium" icon={PremiumIcon} label="Premium" />
          <NavLink href="/donations" icon={DonationsIcon} label="Donations" /> */}
          {/* <div className="mx-auto my-2 h-[1px] w-[90%] bg-foreground/20"></div>
          <NavLink href="/blog" icon={DevBlogIcon} label="Developer Blog" />
          <NavLink href="/github" icon={GithubIcon} label="Github" /> */}
          <div className="mx-auto my-2 h-[1px] w-[90%] bg-foreground/20"></div>
          <NavLink href="/info" icon={InfoIcon} label="Info" />
          <NavLink href="/legal" icon={LegalIcon} label="Legal" />
          <NavLink href="/help" icon={HelpIcon} label="Help" />
          <NavLink href="/cookie-policy" icon={CookiesIcon} label="Cookies" />
          <NavLink
            href="https://docs.google.com/forms/d/e/1FAIpQLSdg0X5LLOozhWX5ZIu1y2shBfYuUFExE_guAts7KCzvVNNwWw/viewform?pli=1"
            icon={FeedbackIcon}
            label="Feedback"
          />
        </ul>
      ) : (
        <ul className="flex h-full flex-col justify-start rounded-[8px] bg-foreground/10 p-2">
          <div className="my-8 flex w-full flex-row items-center justify-center">
            <Link href={'/'} className="flex flex-shrink-0 flex-row items-center gap-4">
              <LogoMark className="h-6 w-6 text-foreground" />
            </Link>
            <button
              onClick={toggleSidebar}
              className="absolute -right-0 rounded-full bg-background p-1 hover:bg-foreground/20"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>
          <NavLink href="/" icon={HomeIcon} />
          <NavLink href="/protected/feed" icon={FeedIcon} />
          <NavLink href="/protected/explore" icon={ExploreIcon} />
          <div className="mx-auto my-2 h-[1px] w-[90%] bg-foreground/20"></div>
          <NavLink href="/protected/profile" icon={ProfileIcon} />
          <NavLink href="/protected/watch-list" icon={WatchListIcon} />
          <NavLink href="/protected/watch-history" icon={HistoryIcon} />
          <div className="mx-auto my-2 h-[1px] w-[90%] bg-foreground/20"></div>
          <NavLink href="/premium" icon={PremiumIcon} />
          <NavLink href="/donations" icon={DonationsIcon} />
          {/* <div className="mx-auto my-2 h-[1px] w-[90%] bg-foreground/20"></div>
          <NavLink href="/blog" icon={DevBlogIcon} />
          <NavLink href="/github" icon={GithubIcon} /> */}
          <div className="mx-auto my-2 h-[1px] w-[90%] bg-foreground/20"></div>
          <NavLink href="/info" icon={InfoIcon} />
          <NavLink href="/legal" icon={LegalIcon} />
          <NavLink href="/help" icon={HelpIcon} />
          <NavLink href="/cookie-policy" icon={CookiesIcon} />
          <NavLink href="/feedback" icon={FeedbackIcon} />
          <div className="mx-auto my-2 h-[1px] w-[90%] bg-foreground/20"></div>
        </ul>
      )}
    </aside>
  );
};

export default Sidebar;
