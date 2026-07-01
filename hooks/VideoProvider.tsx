// components/video/VideoProvider.tsx

'use client';
import { createContext, useContext, useMemo, useState } from 'react';
import { useMotionValue, type MotionValue } from 'framer-motion';

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
  // Continuous full⟷mini morph position: 0 = full (docked in the page), 1 = mini
  // (floating window). Driven by VideoShell (drag + spring animations); READ by
  // WatchOverlay (fade its content/backdrop) and MainContent (reveal the origin
  // page) so the player, the surrounding chrome, and the page all move together.
  // A MotionValue (not React state) so the drag updates it at 60fps with no
  // re-renders.
  progress: MotionValue<number>;
}>({
  state: { mode: 'mini' },
  setState: () => {},
  progress: undefined as unknown as MotionValue<number>,
});

export function useVideo() {
  return useContext(VideoContext);
}

export default function VideoProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<VideoState>({ mode: 'mini' });
  // Starts at 1 (mini/hidden) — no player is open on first load.
  const progress = useMotionValue(1);

  const value = useMemo(() => ({ state, setState, progress }), [state, progress]);

  return <VideoContext.Provider value={value}>{children}</VideoContext.Provider>;
}
