'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isDebugDisabled } from '@/lib/mocks/config';

const VPNDebugPanel = () => {
  // Don't render debug panel in offline mode or when debug is disabled
  if (isDebugDisabled()) {
    return null;
  }
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [savedIPs, setSavedIPs] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const fetchDebugInfo = async () => {
    try {
      // Get current IP directly (NEW METHOD - no server caching!)
      const timestamp = Date.now();
      const ipResponse = await fetch(`https://api.ipify.org?format=json&_t=${timestamp}`, {
        cache: 'no-store'
      });
      const ipData = await ipResponse.json();
      const currentIP = ipData.ip;

      // Get saved IPs directly from database
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      if (user) {
        const { data: ips } = await supabase
          .from('user_ip_addresses')
          .select('*')
          .eq('user_id', user.id);
        setSavedIPs(ips || []);
      }

      // Check if this IP is saved (NEW API)
      let apiData = { currentIP, isKnownIP: false, isUsingVPN: true };
      try {
        const checkResponse = await fetch('/api/check-ip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ip: currentIP }),
          cache: 'no-store'
        });
        if (checkResponse.ok) {
          apiData = await checkResponse.json();
          apiData.currentIP = currentIP; // Ensure currentIP is set
        }
      } catch (e) {
        console.error('Failed to check IP:', e);
      }

      // Also get from OLD API for comparison
      let oldAPIData = null;
      try {
        const oldResponse = await fetch(`/api/check-vpn-status?_t=${timestamp}`, {
          cache: 'no-store'
        });
        if (oldResponse.ok) {
          oldAPIData = await oldResponse.json();
        }
      } catch (e) {
        console.error('Old API failed:', e);
      }

      setDebugInfo({
        apiResponse: apiData,
        oldAPIResponse: oldAPIData,
        externalIP: currentIP,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Debug fetch error:', error);
      setDebugInfo({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  useEffect(() => {
    fetchDebugInfo();
    const interval = setInterval(fetchDebugInfo, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  if (!debugInfo) return <div>Loading debug info...</div>;

  const isIPInSavedList = savedIPs.some(
    ip => ip.ip_address === debugInfo.apiResponse?.currentIP
  );

  return (
    <div className="fixed bottom-4 right-4 z-[70] w-96 rounded-lg bg-black/90 p-4 text-xs text-white">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-bold text-yellow-400">VPN Debug Panel</h3>
        <button
          onClick={fetchDebugInfo}
          className="rounded bg-blue-500 px-2 py-1 text-white"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-2">
        <div className="border-b border-gray-700 pb-2">
          <div className="text-green-400">Current Detection:</div>
          <div>API says IP: <span className="font-mono text-yellow-300">{debugInfo.apiResponse?.currentIP}</span></div>
          <div>External IP: <span className="font-mono text-yellow-300">{debugInfo.externalIP}</span></div>
          <div className={`font-bold ${debugInfo.apiResponse?.currentIP === debugInfo.externalIP ? 'text-green-400' : 'text-red-400'}`}>
            {debugInfo.apiResponse?.currentIP === debugInfo.externalIP ? '✓ IPs Match' : '✗ IPs Don\'t Match!'}
          </div>
        </div>

        <div className="border-b border-gray-700 pb-2">
          <div className="text-green-400">Logic Results:</div>
          <div>Is Known IP: <span className={debugInfo.apiResponse?.isKnownIP ? 'text-green-400' : 'text-red-400'}>
            {String(debugInfo.apiResponse?.isKnownIP)}
          </span></div>
          <div>Is Using VPN: <span className={!debugInfo.apiResponse?.isUsingVPN ? 'text-red-400' : 'text-green-400'}>
            {String(debugInfo.apiResponse?.isUsingVPN)}
          </span></div>
          <div>Should Show Warning: <span className={!debugInfo.apiResponse?.isUsingVPN ? 'text-yellow-400 font-bold' : 'text-gray-400'}>
            {String(!debugInfo.apiResponse?.isUsingVPN)}
          </span></div>
        </div>

        <div className="border-b border-gray-700 pb-2">
          <div className="text-green-400">Saved IPs ({savedIPs.length}):</div>
          {savedIPs.map((ip, i) => (
            <div key={i} className="ml-2">
              <span className="font-mono text-gray-400">{ip.ip_address}</span>
              {ip.label && <span className="ml-2 text-gray-500">({ip.label})</span>}
              {ip.ip_address === debugInfo.apiResponse?.currentIP &&
                <span className="ml-2 text-yellow-400">← Current</span>
              }
            </div>
          ))}
        </div>

        <div className="border-b border-gray-700 pb-2">
          <div className="text-green-400">Double Check:</div>
          <div>Current IP in saved list: <span className={isIPInSavedList ? 'text-green-400' : 'text-red-400'}>
            {String(isIPInSavedList)}
          </span></div>
          <div>Detection method: <span className="text-gray-400">{debugInfo.apiResponse?.detectionMethod}</span></div>
        </div>

        <div className="text-gray-500">
          Last update: {new Date(debugInfo.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

export default VPNDebugPanel;