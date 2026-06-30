'use client';

import { useVideo } from '@/hooks/VideoProvider';

/**
 * Store-driven background surface for the watch overlay.
 *
 * The route-driven WatchOverlay only appears once the overlay's RSC renders, so
 * on an expand click the player (store-driven) would move first and the page
 * would fade in later — disjoint. This backdrop reacts to the SAME store flip as
 * the player, so the theme-background surface fades in AROUND the player in
 * lockstep with its glide; the actual content then streams in on top when ready.
 *
 * z-30: above the origin page, below the player (z-40) and the WatchOverlay
 * content (also z-30 but later in the DOM, so it paints over this).
 *
 * It intentionally CATCHES pointer events (no pointer-events-none) so that while
 * it's showing — including the gap before the overlay's content has rendered —
 * you can't hover or click the origin page behind it. The navbar (z-50) and the
 * player (z-40) stay above it and remain interactive.
 */
export default function WatchBackdrop() {
  const { state } = useVideo();
  const show = state.mode === 'full' && !!state.isOverlay && !!state.media_id;
  if (!show) return null;
  return <div className="watch-overlay-bg fixed inset-0 z-30 bg-background" />;
}
