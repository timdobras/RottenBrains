// components/video/VideoContextSetter.tsx
"use client";

import { useEffect } from "react";
import { useVideo, VideoState } from "./VideoProvider";

interface VideoContextSetterProps {
  media_type: VideoState["media_type"];
  media_id: VideoState["media_id"];
  season_number?: VideoState["season_number"];
  episode_number?: VideoState["episode_number"];
}

export default function VideoContextSetter({
  media_type,
  media_id,
  season_number,
  episode_number,
}: VideoContextSetterProps) {
  const { setState } = useVideo();

  useEffect(() => {
    // enter “full” mode with the new media
    setState({
      media_type,
      media_id,
      season_number,
      episode_number,
      mode: "full",
    });

    return () => {
      // revert to mini when unmounting
      setState((s) => ({ ...s, mode: "mini" }));
    };
  }, [media_type, media_id, season_number, episode_number, setState]);

  return null;
}
