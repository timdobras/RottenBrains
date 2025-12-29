'use client';

import { isOfflineMode } from '@/lib/mocks/config';

/**
 * Visual indicator shown when offline development mode is enabled.
 * Only renders when NEXT_PUBLIC_OFFLINE_MODE=true
 */
export function OfflineModeIndicator() {
  if (!isOfflineMode()) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-medium text-black shadow-lg">
      Offline Dev Mode
    </div>
  );
}
