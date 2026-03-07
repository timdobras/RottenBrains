// components/video/VideoContextSetter.tsx
'use client';

import { useEffect } from 'react';
import { useVideo, VideoState } from './VideoProvider';

interface VideoContextSetterProps {
  media_type: VideoState['media_type'];
  media_id: VideoState['media_id'];
  season_number?: VideoState['season_number'];
  episode_number?: VideoState['episode_number'];
  resumePosition?: number; // playback position in seconds from watch history
}

export default function VideoContextSetter({
  media_type,
  media_id,
  season_number,
  episode_number,
  resumePosition,
}: VideoContextSetterProps) {
  const { setState } = useVideo();

  useEffect(() => {
    // Enter "full" mode with the new media
    setState({
      media_type,
      media_id,
      season_number,
      episode_number,
      mode: 'full',
      resumePosition,
    });

    return () => {
      // Revert to mini when unmounting
      setState((s) => ({ ...s, mode: 'mini' }));
    };
  }, [media_type, media_id, season_number, episode_number, resumePosition, setState]);

  return null;
}
