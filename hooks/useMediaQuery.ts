import { useCallback, useSyncExternalStore } from 'react';

/**
 * Subscribes to a CSS media query via `useSyncExternalStore` so the value is
 * correct during SSR/hydration (server snapshot = false) without a
 * setState-in-effect. Returns whether the query currently matches.
 */
export default function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query]
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);
  const getServerSnapshot = () => false;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
