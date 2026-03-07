'use client';

import { useVideo } from '@/hooks/VideoProvider';

interface WatchPageWrapperProps {
  children: React.ReactNode;
}

/**
 * Client wrapper for watch pages that applies theater mode styling on desktop.
 * Theater mode: player stretches full-bleed while info/episodes/recommendations
 * below get horizontal padding and a max-width so they remain readable.
 */
const WatchPageWrapper: React.FC<WatchPageWrapperProps> = ({ children }) => {
  const { state } = useVideo();
  const isTheater = state.theaterMode && state.mode === 'full';

  return (
    <div
      className={`relative mx-auto mb-16 w-full ${
        isTheater ? 'max-w-full md:px-0 md:pt-0' : 'max-w-7xl md:px-8 md:pt-6'
      }`}
    >
      <div
        className={`mx-auto flex w-full flex-col md:gap-4 ${
          isTheater
            ? '[&>*:not(:first-child)]:mx-auto [&>*:not(:first-child)]:w-full [&>*:not(:first-child)]:max-w-7xl [&>*:not(:first-child)]:md:px-8'
            : ''
        }`}
      >
        {children}
      </div>
    </div>
  );
};

export default WatchPageWrapper;
