'use client';

import { useEffect, useState } from 'react';
import { WifiOff, Shield, X, Settings, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { logger } from '@/lib/logger';

interface VPNStatus {
  ip: string;
  isKnownIP: boolean;
  isUsingVPN: boolean;
  savedIPInfo?: {
    label?: string;
    created_at: string;
  } | null;
  message: string;
}

const VPNWarningNew = () => {
  const [vpnStatus, setVpnStatus] = useState<VPNStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const checkVPNStatus = async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);

    try {
      // Step 1: Get the current IP from client-side (no server caching!)
      console.log('[VPN Check] Fetching current IP...');
      const timestamp = Date.now();
      const ipResponse = await fetch(`https://api.ipify.org?format=json&_=${timestamp}`, {
        cache: 'no-store'
      });

      if (!ipResponse.ok) {
        throw new Error('Failed to detect IP');
      }

      const ipData = await ipResponse.json();
      const currentIP = ipData.ip;
      console.log('[VPN Check] Current IP detected:', currentIP);

      // Step 2: Check if this IP is in the saved list
      const checkResponse = await fetch('/api/check-ip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ip: currentIP }),
        cache: 'no-store'
      });

      if (checkResponse.ok) {
        const data = await checkResponse.json();

        console.log('[VPN Check] Status:', {
          currentIP,
          isKnownIP: data.isKnownIP,
          isUsingVPN: data.isUsingVPN,
          timestamp: new Date().toISOString()
        });

        setVpnStatus(data);

        // Check dismiss state for this IP
        const dismissKey = `vpn-warning-dismissed-${currentIP}`;
        const isDismissed = sessionStorage.getItem(dismissKey) === 'true';

        // Reset dismissed state if IP changed
        if (vpnStatus && vpnStatus.ip !== currentIP) {
          console.log('[VPN Check] IP changed from', vpnStatus.ip, 'to', currentIP);
          setDismissed(false);
        } else {
          setDismissed(isDismissed);
        }
      } else {
        console.error('[VPN Check] Failed to check IP status');
      }
    } catch (error) {
      logger.error('Error checking VPN status:', error);
      console.error('[VPN Check] Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    if (vpnStatus?.ip) {
      sessionStorage.setItem(`vpn-warning-dismissed-${vpnStatus.ip}`, 'true');
    }
  };

  const saveCurrentIP = async () => {
    try {
      const label = prompt('Enter a label for this IP (optional, e.g., "Home", "Work"):');

      const response = await fetch('/api/check-vpn-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ label }),
      });

      if (response.ok) {
        await checkVPNStatus();
        setShowDetails(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save IP address');
      }
    } catch (error) {
      logger.error('Error saving IP:', error);
      alert('Failed to save IP address');
    }
  };

  useEffect(() => {
    checkVPNStatus();

    // Check when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[VPN Check] Tab visible, rechecking...');
        checkVPNStatus(true);
      }
    };

    // Check when window gets focus
    const handleFocus = () => {
      console.log('[VPN Check] Window focused, rechecking...');
      checkVPNStatus(true);
    };

    // Check periodically (every 30 seconds)
    const interval = setInterval(() => {
      checkVPNStatus(true);
    }, 30 * 1000);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Debug logging
  console.log('[VPN Warning] Render state:', {
    loading,
    dismissed,
    vpnStatus,
    shouldShow: !loading && !dismissed && vpnStatus && vpnStatus.isKnownIP === true
  });

  // Show warning when IP is known (not using VPN)
  const shouldShowWarning = !loading && !dismissed && vpnStatus && vpnStatus.isKnownIP === true;

  if (!shouldShowWarning) {
    return null;
  }

  return (
    <>
      {/* Main Warning Bar */}
      <div className="fixed left-0 right-0 top-0 z-[60] bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-red-500/20 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-yellow-500/20 p-1.5">
              <WifiOff className="h-4 w-4 text-yellow-500" />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
              <span className="text-sm font-medium text-yellow-100">
                No VPN Detected
              </span>
              <span className="text-xs text-yellow-200/80 sm:text-sm">
                {vpnStatus.savedIPInfo?.label
                  ? `Connected from ${vpnStatus.savedIPInfo.label}`
                  : `IP: ${vpnStatus.ip}`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => checkVPNStatus(true)}
              disabled={refreshing}
              className="rounded-lg p-1 text-yellow-100/60 hover:bg-yellow-500/20 hover:text-yellow-100 disabled:opacity-50"
              aria-label="Refresh IP status"
              title="Refresh IP detection"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="rounded-lg bg-yellow-500/20 px-3 py-1 text-xs font-medium text-yellow-100 hover:bg-yellow-500/30"
            >
              {showDetails ? 'Hide' : 'Details'}
            </button>
            <button
              onClick={handleDismiss}
              className="rounded-lg p-1 text-yellow-100/60 hover:bg-yellow-500/20 hover:text-yellow-100"
              aria-label="Dismiss warning"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Details Dropdown */}
        {showDetails && (
          <div className="border-t border-yellow-500/20 bg-black/40 px-4 py-3">
            <div className="mx-auto max-w-7xl">
              <div className="mb-3 flex items-start gap-2">
                <Shield className="mt-0.5 h-4 w-4 text-yellow-500" />
                <div className="text-sm text-yellow-100/90">
                  <p className="mb-1 font-medium">Privacy Warning:</p>
                  <p className="text-xs leading-relaxed text-yellow-100/70">
                    You&apos;re browsing from a known public IP address without a VPN. Your internet activity may be visible to your ISP and network administrator.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {!vpnStatus.isKnownIP && (
                  <button
                    onClick={saveCurrentIP}
                    className="rounded-lg bg-yellow-500/20 px-3 py-1.5 text-xs font-medium text-yellow-100 hover:bg-yellow-500/30"
                  >
                    Save This IP
                  </button>
                )}
                <Link
                  href="/protected/settings"
                  className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20"
                >
                  <Settings className="h-3 w-3" />
                  Manage IPs
                </Link>
                <a
                  href="https://www.expressvpn.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-green-500/20 px-3 py-1.5 text-xs font-medium text-green-100 hover:bg-green-500/30"
                >
                  Get a VPN
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Spacer to push content down when warning is shown */}
      <div className={showDetails ? 'h-[140px]' : 'h-[48px]'} />
    </>
  );
};

export default VPNWarningNew;