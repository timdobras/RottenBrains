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
        body: JSON.stringify({ ip: currentIP })
      });

      const checkData = await checkRes.json();

      setStatus({
        loading: false,
        currentIP,
        isKnownIP: checkData.isKnownIP,
        isUsingVPN: checkData.isUsingVPN,
        shouldShowWarning: checkData.isKnownIP === true,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      setStatus({ loading: false, error: error.message });
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  if (status.loading) return <div className="fixed top-20 left-4 bg-blue-500 text-white p-2 rounded">Loading...</div>;

  return (
    <div className="fixed top-20 left-4 bg-blue-900 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
      <h3 className="font-bold mb-2 text-yellow-300">VPN Test</h3>
      <div className="space-y-1 text-xs">
        <div>Current IP: <span className="font-mono text-yellow-300">{status.currentIP}</span></div>
        <div>Is Known: <span className={status.isKnownIP ? 'text-green-400' : 'text-red-400'}>{String(status.isKnownIP)}</span></div>
        <div>Using VPN: <span className={status.isUsingVPN ? 'text-green-400' : 'text-red-400'}>{String(status.isUsingVPN)}</span></div>
        <div className="pt-2 border-t border-gray-600">
          <span className="font-bold">Should Show Warning: </span>
          <span className={status.shouldShowWarning ? 'text-yellow-400 font-bold' : 'text-gray-400'}>
            {String(status.shouldShowWarning)}
          </span>
        </div>
        {status.shouldShowWarning && (
          <div className="mt-2 p-2 bg-yellow-500/20 rounded">
            ⚠️ Warning should be visible!
          </div>
        )}
        <div className="text-gray-400 text-xs">Updated: {new Date(status.timestamp).toLocaleTimeString()}</div>
      </div>
    </div>
  );
};

export default VPNTest;