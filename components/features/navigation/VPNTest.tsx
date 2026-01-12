'use client';

import { useState, useEffect } from 'react';

const VPNTest = () => {
  const [status, setStatus] = useState<any>({ loading: true });

  const checkStatus = async () => {
    try {
      // Step 1: Get current IP
      const ipRes = await fetch(`https://api.ipify.org?format=json&_t=${Date.now()}`);
      const ipData = await ipRes.json();
      const currentIP = ipData.ip;

      // Step 2: Check if saved
      const checkRes = await fetch('/api/check-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: currentIP }),
      });

      const checkData = await checkRes.json();

      setStatus({
        loading: false,
        currentIP,
        isKnownIP: checkData.isKnownIP,
        isUsingVPN: checkData.isUsingVPN,
        shouldShowWarning: checkData.isKnownIP === true,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      setStatus({
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  if (status.loading)
    return <div className="fixed left-4 top-20 rounded bg-blue-500 p-2 text-white">Loading...</div>;

  return (
    <div className="fixed left-4 top-20 z-50 max-w-sm rounded-lg bg-blue-900 p-4 text-white shadow-lg">
      <h3 className="mb-2 font-bold text-yellow-300">VPN Test</h3>
      <div className="space-y-1 text-xs">
        <div>
          Current IP: <span className="font-mono text-yellow-300">{status.currentIP}</span>
        </div>
        <div>
          Is Known:{' '}
          <span className={status.isKnownIP ? 'text-green-400' : 'text-red-400'}>
            {String(status.isKnownIP)}
          </span>
        </div>
        <div>
          Using VPN:{' '}
          <span className={status.isUsingVPN ? 'text-green-400' : 'text-red-400'}>
            {String(status.isUsingVPN)}
          </span>
        </div>
        <div className="border-t border-gray-600 pt-2">
          <span className="font-bold">Should Show Warning: </span>
          <span
            className={status.shouldShowWarning ? 'font-bold text-yellow-400' : 'text-gray-400'}
          >
            {String(status.shouldShowWarning)}
          </span>
        </div>
        {status.shouldShowWarning && (
          <div className="mt-2 rounded bg-yellow-500/20 p-2">⚠️ Warning should be visible!</div>
        )}
        <div className="text-xs text-gray-400">
          Updated: {new Date(status.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

export default VPNTest;
