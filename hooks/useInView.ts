'use client';

import { useEffect, useRef, useState } from 'react';

interface UseInViewOptions {
  /** Margin around the root; positive values start loading BEFORE the element
   *  scrolls into view. Default '300px' gives horizontal rows a head start. */
  rootMargin?: string;
  /** Stop observing after the first intersection (stay `true`). Default true. */
  once?: boolean;
}

/**
 * Viewport-visibility hook for lazy work (image loads, canvas color extraction).
 * Returns a ref to attach to the element and a boolean that flips true once the
 * element is within `rootMargin` of the viewport. Falls back to `true` when
 * IntersectionObserver is unavailable so content still loads.
 */
export function useInView<T extends Element = HTMLElement>(
  options?: UseInViewOptions
): [React.RefObject<T | null>, boolean] {
  const { rootMargin = '300px', once = true } = options || {};
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            if (once) io.disconnect();
          } else if (!once) {
            setInView(false);
          }
        }
      },
      { rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin, once]);

  return [ref, inView];
}
