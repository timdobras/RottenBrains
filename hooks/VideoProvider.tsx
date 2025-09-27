// components/video/VideoProvider.tsx

"use client";
import { createContext, useContext, useState } from "react";

export type VideoState = {
  media_type?: string;
  media_id?: number;
  season_number?: number;
  episode_number?: number;
  mode: "mini" | "full";
  provider?: string;
};

const VideoContext = createContext<{
  state: VideoState;
  setState: React.Dispatch<React.SetStateAction<VideoState>>;
}>({
  state: { mode: "mini" },
  setState: () => {},
});

export function useVideo() {
  return useContext(VideoContext);
}

export default function VideoProvider({ children }: any) {
  const [state, setState] = useState<VideoState>({ mode: "mini" });
  return (
    <VideoContext.Provider value={{ state, setState }}>
      {children}
    </VideoContext.Provider>
  );
}
