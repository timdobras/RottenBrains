'use client';

import { useVideo } from '@/hooks/VideoProvider';

const VideoEmbed = () => {
  const { state } = useVideo();
  const isTheater = state.theaterMode && state.mode === 'full';

  return (
    <section
      // mobile: stick to the live bottom edge of the (hide-on-scroll) navbar so
      // the player rides up/down with it. desktop: normal flow (md:relative).
      className={`sticky top-[var(--watch-player-top,3rem)] w-full flex-col md:relative md:top-0 ${
        isTheater ? 'bg-black' : 'bg-background'
      }`}
    >
      <div
        className={`w-full bg-black ${isTheater ? 'mx-auto flex items-center justify-center' : ''}`}
      >
        <div
          id="video-inline-placeholder"
          className={`relative w-full overflow-hidden bg-black ${
            isTheater
              ? 'aspect-[16/9] max-h-[calc(100vh-4rem)]'
              : 'aspect-[16/9] bg-foreground/10 md:rounded-[8px]'
          }`}
          style={
            isTheater
              ? {
                  // Cap width so the 16:9 player fits within the available
                  // viewport height (below the 4rem navbar). Prevents the
                  // video from overflowing below the fold.
                  maxWidth: 'calc((100vh - 4rem) * 16 / 9)',
                }
              : undefined
          }
        />
      </div>
    </section>
  );
};

export default VideoEmbed;
