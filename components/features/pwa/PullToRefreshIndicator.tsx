'use client';

import { usePullToRefresh } from '@/hooks/usePullToRefresh';

/**
 * Pull-to-refresh visual indicator.
 * Shows a spinner/arrow when user pulls down from the top of the page.
 * Place this at the top of any page that should support pull-to-refresh.
 */
export default function PullToRefreshIndicator() {
  const { pullDistance, isRefreshing, isThresholdReached } = usePullToRefresh();

  const isVisible = pullDistance > 10 || isRefreshing;

  if (!isVisible) return null;

  return (
    <div
      className="pointer-events-none fixed left-0 right-0 top-0 z-50 flex justify-center md:hidden"
      style={{
        transform: `translateY(${isRefreshing ? 48 : pullDistance}px)`,
        transition: isRefreshing ? 'transform 0.2s ease-out' : 'none',
        opacity: Math.min(pullDistance / 40, 1),
      }}
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full bg-background shadow-lg ${
          isRefreshing ? 'animate-spin' : ''
        }`}
      >
        {isRefreshing ? (
          <svg className="h-5 w-5 text-foreground/70" viewBox="0 0 24 24" fill="none">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : (
          <svg
            className={`h-5 w-5 text-foreground/70 transition-transform duration-200 ${
              isThresholdReached ? 'rotate-180' : ''
            }`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 5v14M5 12l7-7 7 7" />
          </svg>
        )}
      </div>
    </div>
  );
}
