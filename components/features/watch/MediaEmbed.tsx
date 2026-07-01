'use client';

import { useEffect } from 'react';

import { useVideo } from '@/hooks/VideoProvider';

const VideoEmbed = () => {
  const { state } = useVideo();
  const isTheater = state.theaterMode && state.mode === 'full';
  // Size the player box to the real content aspect (width/height), defaulting to
  // 16/9 until the <video> reports its dimensions. So a 2.39:1 film isn't
  // letterboxed and a 4:3 show isn't cropped — the box fits the content.
  const ratio = state.aspectRatio && state.aspectRatio > 0 ? state.aspectRatio : 16 / 9;

  // Publish the mobile player height (full width at the content aspect) so the
  // sticky season bar + description drawer track the real bottom edge.
  useEffect(() => {
    document.documentElement.style.setProperty('--watch-player-h', `${(100 / ratio).toFixed(3)}vw`);
  }, [ratio]);

  return (
    <section
      // mobile: pinned to the very top of the watch surface (the navbar is hidden
      // on watch, so there's no bar to offset for). The player's sticky box now
      // exactly matches its in-flow slot (top:0, height 56.25vw), so the details
      // below start flush under it instead of being clipped by a navbar-height
      // gap. desktop: normal flow (md:relative).
      className={`sticky top-0 w-full flex-col md:relative md:top-0 ${
        isTheater ? 'bg-black' : 'bg-background'
      }`}
    >
      <div
        className={`w-full ${isTheater ? 'mx-auto flex items-center justify-center bg-black' : 'bg-background'}`}
      >
        <div
          id="video-inline-placeholder"
          className={`relative w-full overflow-hidden ${
            isTheater ? 'bg-black max-h-[calc(100vh-4rem)]' : 'bg-background md:rounded-[8px]'
          }`}
          style={{
            aspectRatio: String(ratio),
            // Theater: cap width so the box fits within the available viewport
            // height (below the 4rem navbar) instead of overflowing below the fold.
            ...(isTheater ? { maxWidth: `calc((100vh - 4rem) * ${ratio})` } : {}),
          }}
        />
      </div>
    </section>
  );
};

export default VideoEmbed;
