'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Download, Share } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type BrowserType = 'chromium' | 'firefox' | 'safari' | 'unknown';

const STORAGE_KEY = 'pwa-install-dismissed';
const VISIT_COUNT_KEY = 'pwa-visit-count';
const VISIT_THRESHOLD = 2; // Show after 2nd visit

function detectBrowser(): BrowserType {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;

  // Safari must be checked before Chromium since Chrome UA includes "Safari"
  if (/Safari/.test(ua) && !/Chrome|CriOS|Chromium/.test(ua)) {
    return 'safari';
  }
  if (/Firefox|FxiOS/.test(ua)) {
    return 'firefox';
  }
  if (/Chrome|CriOS|Chromium|Edg|OPR|Brave/.test(ua)) {
    return 'chromium';
  }
  return 'unknown';
}

function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

export default function PWAInstallBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [browser, setBrowser] = useState<BrowserType>('unknown');
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [canPromptNatively, setCanPromptNatively] = useState(false);

  useEffect(() => {
    // Don't show if already installed as PWA
    if (isStandaloneMode()) return;

    // Don't show if dismissed
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      // Re-show after 30 days
      if (Date.now() - dismissedAt < 30 * 24 * 60 * 60 * 1000) return;
    }

    // Track visit count
    const visitCount = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || '0', 10) + 1;
    localStorage.setItem(VISIT_COUNT_KEY, visitCount.toString());

    if (visitCount < VISIT_THRESHOLD) return;

    const detectedBrowser = detectBrowser();
    setBrowser(detectedBrowser);

    // Listen for the Chromium-only beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      setCanPromptNatively(true);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For Firefox and Safari, show the banner with manual instructions
    // (they don't fire beforeinstallprompt)
    if (detectedBrowser === 'firefox' || detectedBrowser === 'safari') {
      // Delay slightly so it doesn't appear immediately on page load
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }

    // For Chromium, wait for the beforeinstallprompt event
    // Show after a timeout in case the event already fired or won't fire
    const fallbackTimer = setTimeout(() => {
      if (detectedBrowser === 'chromium' && !deferredPromptRef.current) {
        // Chromium but no prompt event = already installed or not eligible
        // Don't show the banner
      }
    }, 5000);

    return () => {
      clearTimeout(fallbackTimer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (canPromptNatively && deferredPromptRef.current) {
      await deferredPromptRef.current.prompt();
      const { outcome } = await deferredPromptRef.current.userChoice;
      if (outcome === 'accepted') {
        setIsVisible(false);
      }
      deferredPromptRef.current = null;
      setCanPromptNatively(false);
    }
  }, [canPromptNatively]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'fixed bottom-20 left-4 right-4 z-40 md:bottom-4 md:left-auto md:right-4 md:max-w-sm',
        'duration-300 animate-in fade-in slide-in-from-bottom-4'
      )}
    >
      <div className="overflow-hidden rounded-2xl border border-foreground/10 bg-background/95 shadow-xl backdrop-blur-lg">
        {/* Header */}
        <div className="flex items-start gap-3 p-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-foreground/5">
            <img
              src="/icons/icon-96x96.png"
              alt="Rotten Brains"
              className="h-8 w-8 rounded-lg"
              width={32}
              height={32}
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground">Install Rotten Brains</h3>
            <p className="mt-0.5 text-xs text-foreground/60">
              Get the full app experience with faster loading and offline access.
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 rounded-full p-1 text-foreground/40 transition-colors hover:bg-foreground/10 hover:text-foreground/70"
            aria-label="Dismiss install prompt"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Action area */}
        <div className="border-t border-foreground/5 px-4 py-3">
          {canPromptNatively ? (
            <button
              onClick={handleInstall}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              <Download className="h-4 w-4" />
              Install App
            </button>
          ) : (
            <div className="text-xs text-foreground/70">
              {browser === 'firefox' && (
                <div className="flex items-start gap-2">
                  <Download className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>
                    Tap the <strong>menu button</strong> (three dots) in your browser toolbar, then
                    tap <strong>&quot;Install&quot;</strong> or{' '}
                    <strong>&quot;Add to Home screen&quot;</strong>.
                  </span>
                </div>
              )}
              {browser === 'safari' && (
                <div className="flex items-start gap-2">
                  <Share className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>
                    Tap the <strong>Share</strong> button, then scroll down and tap{' '}
                    <strong>&quot;Add to Home Screen&quot;</strong>.
                  </span>
                </div>
              )}
              {browser === 'unknown' && (
                <div className="flex items-start gap-2">
                  <Download className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>
                    Use your browser&apos;s menu to install this app or add it to your home screen.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
