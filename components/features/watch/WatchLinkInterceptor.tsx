'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useVideo } from '@/hooks/VideoProvider';

/**
 * While the watch overlay is maximized, intercept clicks on any link that points
 * to the page minimize would reveal (the origin we already have mounted
 * underneath). Instead of navigating there (a full page load), just MINIMIZE —
 * which is navigation-free (visibility flip + History API URL rewrite). So e.g.
 * the navbar logo, when it points at the page you came from, simply drops the
 * player to mini and shows the original beneath it, with no refresh.
 *
 * Has to be client-side (a capture-phase click listener) — middleware runs on
 * the server and only sees the request after the navigation has already begun.
 * Links to any OTHER page navigate normally.
 */
export default function WatchLinkInterceptor() {
  const { state, setState } = useVideo();
  const router = useRouter();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // only while the overlay is actually showing, and only for plain left clicks
      if (state.mode !== 'full') return;
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const anchor = (e.target as HTMLElement | null)?.closest?.('a');
      const href = anchor?.getAttribute('href');
      if (!href) return;

      let path: string;
      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return; // external link → let it go
        path = url.pathname;
      } catch {
        return;
      }

      if (state.originUrl && path === state.originUrl) {
        // It's a link back to where we came from → minimize instead of navigate.
        e.preventDefault();
        e.stopPropagation();
        setState((s) => ({ ...s, mode: 'mini' }));
        window.history.replaceState(window.history.state, '', state.originUrl);
      } else if (!path.includes('/protected/watch/')) {
        // Navigating AWAY to some other non-watch page (feed, profile, …). Don't
        // block it — but drop to mini NOW so the kept-mounted overlay hides
        // instead of covering the page that's loading. (Doing it here, on the
        // click, is reliable — unlike watching usePathname, which is fuzzy across
        // the History-API URL rewrites used by min/max.)
        setState((s) => ({ ...s, mode: 'mini' }));
      } else {
        // Hopping to ANOTHER watch page (episode, a different movie/show, …).
        // Use replace, not push, so the whole watch session stays a SINGLE
        // history entry — then browser-back / the mouse back button land on the
        // origin in one step instead of walking the whole chain of titles. The
        // overlay stays full (no max→mini→max — VideoContextSetter's deferred
        // minimize is cancelled by the incoming title).
        e.preventDefault();
        e.stopPropagation();
        router.replace(href, { scroll: false });
      }
    };

    // Capture phase so we run before Next's <Link> click handler and can stop it.
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [state.mode, state.originUrl, setState, router]);

  // Browser / mouse back+forward fire popstate (not a click, so the handler above
  // misses them). If a back/forward lands us off the watch route while the
  // overlay is still maximized, drop to mini so it uncovers the page. (Reads the
  // real URL, not usePathname, which is fuzzy across the History-API rewrites.)
  useEffect(() => {
    const onPopState = () => {
      if (state.mode !== 'full') return;
      if (!window.location.pathname.includes('/protected/watch/')) {
        setState((s) => ({ ...s, mode: 'mini' }));
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [state.mode, setState]);

  return null;
}
