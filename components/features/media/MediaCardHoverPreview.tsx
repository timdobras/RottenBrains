'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import PreviewTrailer from './PreviewTrailer';

export interface AnchorRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface MediaCardHoverPreviewProps {
  href: string;
  imageUrl?: string | null;
  altText: string;
  media_type: string;
  media_id: number;
  anchorRect: AnchorRect;
  /** Explicit growth factor. When omitted, it's chosen from the viewport size. */
  scale?: number;
  onClose: () => void;
}

// Smaller displays make a given multiplier feel bigger, so scale down on them.
// ~1080p → 1.25, ~1440p → 1.5, 4k+ → 1.65.
function getResponsiveScale(viewportWidth: number): number {
  if (viewportWidth < 2100) return 1.25;
  if (viewportWidth < 3000) return 1.5;
  return 1.65;
}

const EDGE_MARGIN = 8;
// Keep in sync with the transition duration on the animated box below.
const EXIT_MS = 300;

/**
 * Netflix-style hover pop-out. Renders a fixed-position clone of the card via a
 * portal on document.body, so it floats above everything (escaping the
 * horizontal scroller's overflow clipping) and scales up while playing the
 * trailer. Clicking it follows the same link as the underlying card.
 *
 * The box is laid out at its *final* enlarged size and animated in via a
 * transform that starts shrunk (scale 1/scale → 1). This keeps the trailer
 * iframe physically large so YouTube renders a full-size player instead of its
 * cramped small-container UI.
 */
const MediaCardHoverPreview: React.FC<MediaCardHoverPreviewProps> = ({
  href,
  imageUrl,
  altText,
  media_type,
  media_id,
  anchorRect,
  scale: scaleProp,
  onClose,
}) => {
  // Mount shrunk over the original card, then transition to full size next frame.
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Animate back down to the card before unmounting (instead of snapping away).
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    []
  );

  const requestClose = useCallback(() => {
    if (closeTimer.current) return;
    setEntered(false);
    closeTimer.current = setTimeout(onClose, EXIT_MS);
  }, [onClose]);

  // Re-entering the pop-out mid-exit cancels the close.
  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
      setEntered(true);
    }
  }, []);

  if (typeof window === 'undefined') return null;

  const scale = scaleProp ?? getResponsiveScale(window.innerWidth);

  // Final on-screen size, centered on the original card.
  const width = anchorRect.width * scale;
  const height = anchorRect.height * scale;
  const cx = anchorRect.left + anchorRect.width / 2;
  const cy = anchorRect.top + anchorRect.height / 2;

  // Clamp into the viewport so edge cards don't spill off-screen.
  const left = Math.min(
    Math.max(cx - width / 2, EDGE_MARGIN),
    window.innerWidth - width - EDGE_MARGIN
  );
  const top = Math.max(cy - height / 2, EDGE_MARGIN);

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[60]">
      <div
        className="pointer-events-auto absolute transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          top,
          left,
          width,
          height,
          transform: entered ? 'scale(1)' : `scale(${1 / scale})`,
          transformOrigin: 'center center',
          opacity: entered ? 1 : 0,
        }}
        onMouseEnter={cancelClose}
        onMouseLeave={requestClose}
      >
        <Link
          href={href}
          className="relative block h-full w-full overflow-hidden rounded-[8px] shadow-[0_25px_60px_-12px_rgba(0,0,0,0.85)] ring-1 ring-white/10"
        >
          <PreviewTrailer
            media_type={media_type}
            media_id={media_id}
            imageUrl={imageUrl}
            altText={altText}
          />
        </Link>
      </div>
    </div>,
    document.body
  );
};

export default MediaCardHoverPreview;
