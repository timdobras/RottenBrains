'use client';

import { useVideo } from '@/hooks/VideoProvider';
import { useEffect } from 'react';

const STORAGE_KEY = 'theater_mode';

const TheaterToggle = () => {
  const { state, setState } = useVideo();
  const isTheater = state.theaterMode ?? false;

  // Initialize from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'true') {
      setState((prev) => ({ ...prev, theaterMode: true }));
    }
  }, [setState]);

  const toggle = () => {
    const next = !isTheater;
    localStorage.setItem(STORAGE_KEY, String(next));
    setState((prev) => ({ ...prev, theaterMode: next }));
  };

  return (
    <button
      onClick={toggle}
      className={`z-10 hidden flex-row items-center gap-2 justify-self-end rounded-full px-4 py-1 md:flex ${
        isTheater ? 'bg-primary/20 text-primary' : 'bg-foreground/10'
      }`}
      title={isTheater ? 'Exit theater mode' : 'Theater mode'}
      aria-label={isTheater ? 'Exit theater mode' : 'Enter theater mode'}
    >
      <svg
        width={14}
        height={14}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {isTheater ? (
          // Shrink icon (exit theater)
          <>
            <polyline points="4 14 10 14 10 20" />
            <polyline points="20 10 14 10 14 4" />
            <line x1="14" y1="10" x2="21" y2="3" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </>
        ) : (
          // Expand icon (enter theater)
          <>
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </>
        )}
      </svg>
      <p className="text-sm">Theater</p>
    </button>
  );
};

export default TheaterToggle;
