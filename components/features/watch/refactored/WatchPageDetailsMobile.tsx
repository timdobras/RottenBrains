'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useCallback } from 'react';
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
  const [dragY, setDragY] = useState(0);
  const dragStartY = useRef(0);
  const isDragging = useRef(false);

  const handleClose = useCallback(() => {
    setShowDetails(false);
    setDragY(0);
  }, []);

  // Swipe-to-dismiss handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    isDragging.current = true;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const currentY = e.touches[0].clientY;
    const delta = currentY - dragStartY.current;
    // Only allow dragging downward
    if (delta > 0) {
      setDragY(delta);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false;
    // If dragged more than 100px down, close the dialog
    if (dragY > 100) {
      handleClose();
    } else {
      setDragY(0);
    }
  }, [dragY, handleClose]);

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
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50"
              onClick={handleClose}
            />
            {/* Bottom sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              style={{ translateY: dragY }}
              className="small-screen-watch-margin-info-premium fixed left-0 top-0 z-50 flex h-full w-full flex-col overflow-y-auto bg-background text-foreground"
              role="dialog"
              aria-modal="true"
              aria-label="Media description"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Swipe handle indicator */}
              <div className="flex w-full justify-center pb-1 pt-3">
                <div className="h-1 w-10 rounded-full bg-foreground/20" />
              </div>
              <div className="flex w-full flex-row items-center justify-between border-b border-foreground/20">
                <h2 className="p-4 text-lg font-semibold">Description</h2>
                <button
                  className="flex items-center justify-center p-4 text-foreground/70 transition-colors hover:text-foreground"
                  onClick={handleClose}
                  aria-label="Close description"
                >
                  <X className="h-5 w-5" />
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
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
};

export default WatchPageDetailsMobile;
