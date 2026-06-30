'use client';

import { Drawer } from '@base-ui/react/drawer';
import { useState } from 'react';
import { X } from 'lucide-react';
import ActionButtons from './ActionButtons';
import MediaCard from './MediaCard';
import MediaInfo from './MediaInfo';

interface Genre {
  id: number;
  name: string;
}

interface Media {
  id: number;
  name?: string;
  title?: string;
  overview: string;
  genres: Genre[];
  release_date: string;
  first_air_date?: string;
  poster_path: string;
}

interface WatchPageDetailsMobileProps {
  media: Media;
  media_type: string;
  media_id: number;
  episode?: {
    name: string;
    air_date: string;
    overview: string;
  };
  season_number?: number;
  episode_number?: number;
}

const WatchPageDetailsMobile: React.FC<WatchPageDetailsMobileProps> = ({
  media,
  media_type,
  media_id,
  episode,
  season_number,
  episode_number,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <section className="relative mx-auto flex w-full p-4 md:hidden md:p-0">
      <div className="flex flex-col gap-6">
        <MediaInfo
          media={media}
          media_type={media_type}
          episode={episode}
          season_number={season_number}
          episode_number={episode_number}
          onClick={() => setShowDetails(true)}
          isDesktop={false}
        />
        <ActionButtons media_type={media_type} media_id={media_id} />
      </div>

      {/* Bottom sheet — Base UI Drawer provides scroll lock, focus trap, Escape,
          outside-press and native swipe-to-dismiss (swipeDirection="down"). */}
      <Drawer.Root open={showDetails} onOpenChange={setShowDetails} swipeDirection="down">
        <Drawer.Portal>
          <Drawer.Backdrop className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
          <Drawer.Popup
            aria-label="Media description"
            className="small-screen-watch-margin-info-premium fixed left-0 top-0 z-50 flex h-full w-full flex-col overflow-y-auto bg-background text-foreground outline-none transition-transform duration-300 data-[ending-style]:translate-y-full data-[starting-style]:translate-y-full"
          >
            {/* Swipe handle indicator */}
            <div className="flex w-full justify-center pb-1 pt-3">
              <div className="h-1 w-10 rounded-full bg-foreground/20" />
            </div>
            <div className="flex w-full flex-row items-center justify-between border-b border-foreground/20">
              <Drawer.Title className="p-4 text-lg font-semibold">Description</Drawer.Title>
              <Drawer.Close
                className="flex items-center justify-center p-4 text-foreground/70 transition-colors hover:text-foreground"
                aria-label="Close description"
              >
                <X className="h-5 w-5" />
              </Drawer.Close>
            </div>
            <div className="flex flex-col gap-4 p-4">
              <MediaInfo
                media={media}
                media_type={media_type}
                episode={episode}
                season_number={season_number}
                episode_number={episode_number}
                isDesktop={false}
              />
              <MediaCard media={media} media_type={media_type} />
            </div>
          </Drawer.Popup>
        </Drawer.Portal>
      </Drawer.Root>
    </section>
  );
};

export default WatchPageDetailsMobile;
