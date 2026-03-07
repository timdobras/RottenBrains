import { Roboto } from 'next/font/google';
import React from 'react';
import TopLoader from '@/components/features/loaders/TopLoader';
import UserProvider from '@/hooks/UserContext';
import VideoProvider from '@/hooks/VideoProvider';
import { getCurrentUser } from '@/lib/supabase/serverQueries';
import MainContent from '@/components/common/MainContent';
import Navbar from '@/components/features/navigation/Navbar';
import '../globals.css';
import { ThemeProvider } from 'next-themes';
import PlausibleAnalytics from '@/components/common/PlausibleAnalytics';

import Providers from '@/components/providers/Providers';
import VPNWarningProduction from '@/components/features/navigation/VPNWarningProduction';
import VPNDebugPanel from '@/components/features/navigation/VPNDebugPanel';
import OfflineIndicator from '@/components/features/pwa/OfflineIndicator';
import { OfflineModeIndicator } from '@/components/features/dev/OfflineModeIndicator';
import { Toaster } from '@/components/ui/toaster';
import PWAInstallBanner from '@/components/features/pwa/PWAInstallBanner';

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-roboto',
  display: 'swap',
});

export const metadata = {
  title: 'Rotten Brains | Stream movies and TV for free in HD quality.',
  description:
    'Watch movies and tv shows in HD quality for free. Discover all new movies in 2025. Stream for free in the best HD quality possible | Rotten Brains',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Rotten Brains',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover' as const,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f0f0f' },
  ],
};

export default async function NotProtectedLayout({ children }: { children: React.ReactNode }) {
  // Use getCurrentUser() which is wrapped with React cache() for deduplication.
  // This avoids a raw select('*') and shares the result with any page-level
  // getCurrentUser() calls in the same render pass.
  const initialUser = await getCurrentUser();

  // return (
  //   <html>
  //     <body>404 error</body>
  //   </html>
  // );

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${roboto.variable} custom-scrollbar max-h-[100dvh] w-full overflow-x-hidden bg-background font-roboto text-foreground transition-all duration-300`}
      >
        <Providers>
          <UserProvider initialUser={initialUser}>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
              <VideoProvider>
                <OfflineIndicator />
                <OfflineModeIndicator />
                <TopLoader />
                {initialUser && <VPNWarningProduction />}
                {initialUser && process.env.NODE_ENV === 'development' && <VPNDebugPanel />}
                <Navbar />
                <MainContent>{children}</MainContent>
                <div id="player-root" />
                <footer></footer>
                {/* <CookieConsent /> */}
                {/* <OneTapComponent /> */}
                {/* <LegalConsent /> */}
                <Toaster />
                <PWAInstallBanner />
                {/* <IubendaScripts /> */}
                <PlausibleAnalytics
                  domain="rotten-brains.com"
                  src="https://plausible.timdobras.com/js/pa-OqFKUXucfmn6bLkFR0Gu1.js"
                />
                {/* <GoogleAdsense pId="4557341861686356" /> */}
              </VideoProvider>
            </ThemeProvider>
          </UserProvider>
        </Providers>
      </body>
    </html>
  );
}
