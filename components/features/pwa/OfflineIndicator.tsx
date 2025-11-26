'use client';

import { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        setShowReconnected(true);
        setTimeout(() => {
          setShowReconnected(false);
        }, 3000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  // Show reconnected message
  if (showReconnected) {
    return (
      <div className="fixed left-1/2 top-4 z-[100] -translate-x-1/2 transform animate-in fade-in slide-in-from-top-2">
        <div className="flex items-center gap-2 rounded-full bg-green-500 px-4 py-2 text-sm font-medium text-white shadow-lg">
          <Wifi className="h-4 w-4" />
          Back online
        </div>
      </div>
    );
  }

  // Show offline indicator
  if (!isOnline) {
    return (
      <div className="fixed left-0 right-0 top-0 z-[100]">
        <div
          className={cn(
            'flex items-center justify-center gap-2 bg-yellow-500 px-4 py-2 text-sm font-medium text-yellow-950',
            'animate-in fade-in slide-in-from-top'
          )}
        >
          <WifiOff className="h-4 w-4" />
          You are currently offline. Some features may be unavailable.
        </div>
      </div>
    );
  }

  return null;
}
