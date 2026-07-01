'use client';

import { motion, useTransform } from 'framer-motion';

import { useVideo } from '@/hooks/VideoProvider';

/**
 * Opaque theme surface between the origin page and the player.
 *
 * It is the SINGLE background that dissolves during the morph: it fades on the
 * same curve as the watch content's background (progress 0.2→0.8), so it fully
 * covers the origin page at full and dissolves to reveal it as the player docks to
 * mini. (It also covers the brief gap on a first maximize before the overlay
 * route has rendered.)
 *
 * Driven by `progress` — NOT `mode` — so it fades correctly all through a manual
 * drag (mode stays 'full' until release). z-30: above the origin, below the player
 * and the WatchOverlay content.
 */
export default function WatchBackdrop() {
  const { state, progress } = useVideo();
  const opacity = useTransform(progress, [0.2, 0.8], [1, 0]);
  if (!state.isOverlay || !state.media_id) return null;
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-30 bg-background"
      style={{ opacity }}
    />
  );
}
