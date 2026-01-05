'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import ActionButtons from './ActionButtons';
import MediaCard from './MediaCard';
import MediaInfo from './MediaInfo';

const cardVariants = {
  hidden: { y: '100%' }, // Start off-screen at the bottom
  visible: { y: 0, transition: { duration: 0.2 } }, // Slide to the original position
  exit: { y: '100%', transition: { duration: 0.3 } }, // Slide back off-screen
};

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

      <AnimatePresence>
        {showDetails && (
          <motion.dialog
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            open={showDetails}
            className={`small-screen-watch-margin-info-premium fixed left-0 top-0 z-40 h-full w-full flex-col overflow-y-auto bg-background text-foreground`}
          >
            <div className="flex w-full flex-row items-center justify-between border-b border-foreground/20">
              <h2 className="p-4 text-lg font-semibold">Description</h2>
              <button
                className="p-4 font-medium text-foreground"
                onClick={() => setShowDetails(false)}
              >
                X
              </button>
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
          </motion.dialog>
        )}
      </AnimatePresence>
    </section>
  );
};

export default WatchPageDetailsMobile;
