'use client';

import { useEffect, useState } from 'react';
import { WifiOff, Shield, X, Settings, RefreshCw, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { logger } from '@/lib/logger';
import { isVPNDetectionDisabled } from '@/lib/mocks/config';

interface VPNStatus {
  isUsingVPN: boolean | null;
  currentIP: string | null;
  isKnownIP: boolean;
  isDevelopment?: boolean;
  detectionMethod?: string;
  savedIPInfo?: {
    label?: string;
    created_at: string;
  } | null;
  message: string;
}

const VPNWarningProduction = () => {
  const [vpnStatus, setVpnStatus] = useState<VPNStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const checkVPNStatus = async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);

    try {
      // NO EXTERNAL SERVICES - just check with our API
      const timestamp = Date.now();
      const response = await fetch(`/api/check-vpn-status?_t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        }
      });

      if (response.ok) {
        const data = await response.json();

        console.log('VPN Status (Production):', {
          currentIP: data.currentIP,
          isKnownIP: data.isKnownIP,
          detectionMethod: data.detectionMethod,
          timestamp: new Date().toISOString()
        });

        // Don't show warning for localhost
        if (data.currentIP === 'localhost' || data.detectionMethod === 'localhost') {
          console.log('Running on localhost - VPN detection disabled');
          setVpnStatus(null);
          setLoading(false);
          setRefreshing(false);
          return;
        }

        setVpnStatus(data);

        // Check dismiss state
        const dismissKey = `vpn-warning-dismissed-${data.currentIP}`;
        const isDismissed = sessionStorage.getItem(dismissKey) === 'true';

        // Reset dismissed state if IP changed
        if (vpnStatus && vpnStatus.currentIP !== data.currentIP) {
          setDismissed(false);
        } else {
          setDismissed(isDismissed);
        }
      }
    } catch (error) {
      logger.error('Error checking VPN status:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    if (vpnStatus?.currentIP) {
      sessionStorage.setItem(`vpn-warning-dismissed-${vpnStatus.currentIP}`, 'true');
    }
  };

  useEffect(() => {
    checkVPNStatus();

    // Check when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVPNStatus(true);
      }
    };

    // Check periodically
    const interval = setInterval(() => {
      checkVPNStatus(true);
    }, 60 * 1000); // Every minute

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Don't show if:
  // - Loading
  // - Dismissed
  // - No status (localhost)
  // - Not a known IP (using VPN)
  // - VPN detection is disabled via env variable
  if (loading || dismissed || !vpnStatus || !vpnStatus.isKnownIP || isVPNDetectionDisabled()) {
    // Show development notice if on localhost (but not if VPN detection is disabled)
    if (!loading && !vpnStatus && process.env.NODE_ENV === 'development' && !isVPNDetectionDisabled()) {
      return (
        <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600/90 text-white p-2 text-center text-sm">
          <AlertTriangle className="inline h-4 w-4 mr-2" />
          VPN Detection: Disabled on localhost. Will work in production.
          {' '}
          <Link href="/protected/settings" className="underline">
            Manage IPs →
          </Link>
        </div>
      );
    }
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
                    You&apos;re browsing from a known public IP address without a VPN.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/protected/settings"
                  className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20"
                >
                  <Settings className="h-3 w-3" />
                  Manage IPs
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Spacer */}
      <div className={showDetails ? 'h-[140px]' : 'h-[48px]'} />
    </>
  );
};

export default VPNWarningProduction;