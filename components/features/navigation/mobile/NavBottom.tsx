import { usePathname } from 'next/navigation';
import {
  ExploreIcon,
  FeedIcon,
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
  PlusIcon,
} from '../../../ui/Icon';
// import NavSearchIconNew from "./NavSearchIconNew";
import AdBanner from '../../ads/GoogleDisplayAd';
import NavAdMobile from '../../ads/NavAdMobile';
import NavLinkMobile from './NavBottomLink';
import NavSearchIconNew from './NavSearchIconNew';
import NavSearchIconWithOverlay from './NavSearchIconWithOverlay';
import UserIconNavBottom from './UserIconNavBottom';

const NavBottom = () => {
  const pathname = usePathname();

  // Hide the bottom bar on specific routes
  if (pathname.includes('watch/tv') || pathname.includes('watch/movie')) {
    return null;
  }

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex w-full flex-col border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden">
        <ul className="relative flex h-14 w-full flex-row items-center justify-between px-4">
          {/* Home Link */}
          <NavLinkMobile href={'/'} icon={HomeIcon} label={'Home'}></NavLinkMobile>
          <NavLinkMobile
            href={'/protected/feed'}
            icon={FeedIcon}
            label={'Feed'}
          ></NavLinkMobile>
          {/* <NavSearchIconWithOverlay /> */}
          <NavSearchIconNew></NavSearchIconNew>
          <NavLinkMobile
            href={'/protected/create-post'}
            icon={PlusIcon}
            label={'Create'}
          ></NavLinkMobile>
          {/* <NavLinkMobile
            href={"/protected/watch-list"}
            icon={WatchListIcon}
            label={"Library"}
          ></NavLinkMobile> */}
          <UserIconNavBottom></UserIconNavBottom>
        </ul>
      </nav>
    </>
  );
};

export default NavBottom;
