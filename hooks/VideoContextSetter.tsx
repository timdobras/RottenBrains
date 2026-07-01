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
  // Set by the @watch intercepting overlay so the player knows it can pop the
  // overlay (router.back) on minimize/close. Defaults to false for the real
  // (hard-loaded) /watch page, preserving the previous push('/') behavior.
  isOverlay?: boolean;
}

export default function VideoContextSetter({
  media_type,
  media_id,
  season_number,
  episode_number,
  resumePosition,
  isOverlay = false,
}: VideoContextSetterProps) {
  const { setState } = useVideo();

  useEffect(() => {
    // Enter "full" mode with the new media.
    setState({
      media_type,
      media_id,
      season_number,
      episode_number,
      mode: 'full',
      resumePosition,
      isOverlay,
    });
    // NO cleanup-minimize on purpose. The overlay is kept alive, so hopping
    // between titles unmounts this VideoContextSetter and mounts the next one
    // ASYNCHRONOUSLY (after the next title's RSC loads). A cleanup-minimize would
    // fire in that gap → a max→mini→max flash that briefly reveals the origin
    // page. Minimize is driven explicitly instead: the minimize button, the link
    // interceptor (navigating away), and the popstate handler (browser back).
  }, [media_type, media_id, season_number, episode_number, resumePosition, isOverlay, setState]);

  return null;
}
