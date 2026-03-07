'use client';

import { WifiOff, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    window.location.reload();
  };

  if (isOnline) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-green-500/10 p-6">
              <WifiOff className="h-16 w-16 text-green-500" />
            </div>
          </div>
          <h1 className="mb-4 text-3xl font-bold text-foreground">You&apos;re back online!</h1>
          <p className="mb-8 text-muted-foreground">Click below to continue browsing.</p>
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <RefreshCw className="h-5 w-5" />
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-muted p-6">
            <WifiOff className="h-16 w-16 text-muted-foreground" />
          </div>
        </div>

        <h1 className="mb-4 text-3xl font-bold text-foreground">You&apos;re offline</h1>

        <p className="mb-2 max-w-md text-muted-foreground">
          It looks like you&apos;ve lost your internet connection. Some features may not be
          available until you reconnect.
        </p>

        <p className="mb-8 text-sm text-muted-foreground">
          Don&apos;t worry - your watch history and preferences are saved locally.
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <RefreshCw className="h-5 w-5" />
            Try again
          </button>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-6 py-3 font-medium text-foreground transition-colors hover:bg-muted"
          >
            <Home className="h-5 w-5" />
            Go home
          </Link>
        </div>

        <div className="mt-12">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Things you can do offline:</h2>
          <ul className="space-y-2 text-left text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              View previously loaded content
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Access cached movie and TV show info
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Browse your saved watchlist (cached)
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
