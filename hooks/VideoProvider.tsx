// components/video/VideoProvider.tsx

'use client';
import { createContext, useContext, useMemo, useState } from 'react';

export type VideoState = {
  media_type?: string;
  media_id?: number;
  season_number?: number;
  episode_number?: number;
  mode: 'mini' | 'full';
  provider?: string;
  resumePosition?: number; // playback position in seconds for resume (from DB)
  theaterMode?: boolean; // edge-to-edge immersive player on desktop
  // True while the current title was opened via the @watch intercepting overlay
  // (soft nav) rather than a hard-loaded /watch page. Decides whether minimize/
  // close pop the overlay (router.back) or fall back to pushing '/'.
  isOverlay?: boolean;
  // The page you were on when you opened the watch overlay. Minimize returns
  // HERE — not router.back(), which after episode-hopping would only step back
  // to the previous episode rather than the page you originally came from.
  originUrl?: string;
};

const VideoContext = createContext<{
  state: VideoState;
  setState: React.Dispatch<React.SetStateAction<VideoState>>;
}>({
  state: { mode: 'mini' },
  setState: () => {},
});

export function useVideo() {
  return useContext(VideoContext);
}

export default function VideoProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<VideoState>({ mode: 'mini' });

  const value = useMemo(() => ({ state, setState }), [state]);

  return <VideoContext.Provider value={value}>{children}</VideoContext.Provider>;
}
