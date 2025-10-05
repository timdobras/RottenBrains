'use client';

import { useEffect, useState } from 'react';
import { WifiOff, Shield, X, Settings, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { logger } from '@/lib/logger';

interface VPNStatus {
  isUsingVPN: boolean | null;
  currentIP: string | null;
  isKnownIP: boolean;
  savedIPInfo?: {
    label?: string;
    created_at: string;
  } | null;
  message: string;
}

const VPNWarning = () => {
  const [vpnStatus, setVpnStatus] = useState<VPNStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const checkVPNStatus = async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);

    try {
      // Add timestamp to prevent caching
      const timestamp = Date.now();
      const response = await fetch(`/api/check-vpn-status?_t=${timestamp}`, {
        cache: 'no-store', // Always use no-store to get fresh data
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      if (response.ok) {
        const data = await response.json();

        // Debug logging
        console.log('VPN Status Check:', {
          currentIP: data.currentIP,
          isKnownIP: data.isKnownIP,
          isUsingVPN: data.isUsingVPN,
          isDevelopment: data.isDevelopment,
          message: data.message,
          timestamp: new Date().toISOString()
        });

        setVpnStatus(data);

        // Check dismiss state for the NEW IP
        const dismissKey = `vpn-warning-dismissed-${data.currentIP}`;
        const isDismissed = sessionStorage.getItem(dismissKey) === 'true';

        // Reset dismissed state if IP changed
        if (vpnStatus && vpnStatus.currentIP !== data.currentIP) {
          console.log('IP changed from', vpnStatus.currentIP, 'to', data.currentIP);
          setDismissed(false); // Reset dismiss when IP changes
        } else {
          setDismissed(isDismissed);
        }
      } else {
        console.error('VPN status check failed:', response.status);
      }
    } catch (error) {
      logger.error('Error checking VPN status:', error);
      console.error('Error checking VPN status:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    if (vpnStatus?.currentIP) {
      // Remember dismissal for this session and IP
      sessionStorage.setItem(`vpn-warning-dismissed-${vpnStatus.currentIP}`, 'true');
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
        // Refresh the VPN status
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
        console.log('Tab became visible, checking VPN status...');
        checkVPNStatus(true);
      }
    };

    // Check when window gets focus
    const handleFocus = () => {
      console.log('Window focused, checking VPN status...');
      checkVPNStatus(true);
    };

    // Check periodically (every 30 seconds for better responsiveness)
    const interval = setInterval(() => {
      checkVPNStatus(true);
    }, 30 * 1000); // 30 seconds

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Debug the conditions
  console.log('VPN Warning Render Check:', {
    loading,
    dismissed,
    vpnStatus,
    'currentIP': vpnStatus?.currentIP,
    'isKnownIP': vpnStatus?.isKnownIP,
    'isUsingVPN': vpnStatus?.isUsingVPN,
    'should show warning': !loading && !dismissed && vpnStatus && vpnStatus.isKnownIP === true,
    timestamp: new Date().toISOString()
  });

  // Show warning when:
  // - Not loading
  // - Not dismissed
  // - We have status data
  // - The current IP IS in the saved list (isKnownIP = true means NOT using VPN)
  const shouldShowWarning = !loading && !dismissed && vpnStatus && vpnStatus.isKnownIP === true;

  // Always show if there's an error for debugging
  if (!shouldShowWarning) {
    console.log('VPN Warning NOT showing because:', {
      'loading?': loading,
      'dismissed?': dismissed,
      'no vpnStatus?': !vpnStatus,
      'isKnownIP not true?': vpnStatus?.isKnownIP !== true,
      'Final decision': 'NOT SHOWING'
    });
    return null;
  }

  console.log('VPN Warning WILL SHOW!', {
    vpnStatus,
    shouldShowWarning
  });

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
                  : `IP: ${vpnStatus.currentIP}`}
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
                    You're browsing from a known public IP address without a VPN. Your internet activity may be visible to your ISP and network administrator.
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

export default VPNWarning;