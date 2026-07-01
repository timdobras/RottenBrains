// components/video/VideoContextSetter.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
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
  const router = useRouter();
  const seededRef = useRef(false);

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

  // Direct load only (the real /watch page, isOverlay=false): convert it into the
  // same overlay-over-home setup the in-app path uses, so a drag/minimize
  // dissolves through to a MOUNTED landing page (instead of just sliding the
  // player over an unchanged page and only navigating on release). Runs AFTER the
  // effect above so its isOverlay=true wins over the full-replace. Marks overlay
  // first so WatchBackdrop covers the brief reshuffle; seeds '/' as the base — it
  // loads in the background, covered, so it's ready by the time you minimize (no
  // loader needed if done); then re-presents watch as the overlay on top. The push
  // hits the @watch intercept exactly like clicking a card from home. Once only;
  // SEO/first paint are unaffected (the server still renders the real page).
  useEffect(() => {
    if (isOverlay || seededRef.current) return;
    seededRef.current = true;
    const watchUrl = window.location.pathname + window.location.search;
    setState((s) => ({ ...s, isOverlay: true, originUrl: '/' }));
    router.replace('/');
    // Deferred so the replace commits first; NOT cleaned up on unmount (the
    // replace unmounts this component — we still want the push to fire).
    setTimeout(() => router.push(watchUrl, { scroll: false }), 0);
  }, [isOverlay, router, setState]);

  return null;
}
