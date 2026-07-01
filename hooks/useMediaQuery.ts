import { useCallback, useSyncExternalStore } from 'react';

// Cache one MediaQueryList per query (client only). Previously getSnapshot ran
// `window.matchMedia(query)` on EVERY render (useSyncExternalStore calls it each
// render), allocating a new MQL each time; now we allocate once per query and
// just read `.matches`.
const mqlCache = new Map<string, MediaQueryList>();

function getMql(query: string): MediaQueryList | null {
  if (typeof window === 'undefined') return null;
  let mql = mqlCache.get(query);
  if (!mql) {
    mql = window.matchMedia(query);
    mqlCache.set(query, mql);
  }
  return mql;
}

/**
 * Subscribes to a CSS media query via `useSyncExternalStore` so the value is
 * correct during SSR/hydration (server snapshot = false) without a
 * setState-in-effect. Returns whether the query currently matches.
 */
export default function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = getMql(query);
      if (!mql) return () => {};
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query]
  );

  const getSnapshot = useCallback(() => getMql(query)?.matches ?? false, [query]);
  const getServerSnapshot = () => false;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
