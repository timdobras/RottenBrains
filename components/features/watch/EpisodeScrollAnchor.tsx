'use client';

import { useEffect, useRef } from 'react';

/**
 * Invisible client component placed inside the currently playing episode card.
 * On mount, checks if the episode is already visible. If not, scrolls it into
 * view so the user doesn't have to hunt through the grid.
 */
const EpisodeScrollAnchor = () => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Delay to let layout settle (Suspense, sticky elements, etc.)
    const timer = setTimeout(() => {
      const rect = el.getBoundingClientRect();
      const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;

      // Only scroll if the current episode isn't already in the viewport
      if (!isVisible) {
        el.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  return <div ref={ref} aria-hidden="true" className="absolute left-0 top-0 h-0 w-0" />;
};

export default EpisodeScrollAnchor;
