import { GeistSans } from 'geist/font/sans';
import { Roboto } from 'next/font/google';
import dynamic from 'next/dynamic';
import React from 'react';
import TopLoader from '@/components/features/loaders/TopLoader';
import { SidebarProvider } from '@/hooks/SidebarContext';
import UserProvider from '@/hooks/UserContext';
import VideoProvider from '@/hooks/VideoProvider';
import { getCurrentUser } from '@/lib/supabase/serverQueries';
import MainContent from '../components/common/MainContent';
import HomeNav from '../components/features/navigation/desktop/Navbar';
import './globals.css';
import { ThemeProvider } from 'next-themes';
import PlausibleAnalytics from '@/components/common/PlausibleAnalytics';

import Providers from '@/components/providers/Providers';

// Dynamically import heavy components to split them into separate chunks.
// This reduces the initial JS bundle size — these components load on-demand.
const VPNWarningProduction = dynamic(
  () => import('@/components/features/navigation/VPNWarningProduction')
);
const VPNDebugPanel = dynamic(() => import('@/components/features/navigation/VPNDebugPanel'));
const OfflineIndicator = dynamic(() => import('@/components/features/pwa/OfflineIndicator'));
const OfflineModeIndicator = dynamic(() =>
  import('@/components/features/dev/OfflineModeIndicator').then((mod) => ({
    default: mod.OfflineModeIndicator,
  }))
);
const Toaster = dynamic(() =>
  import('@/components/ui/toaster').then((mod) => ({ default: mod.Toaster }))
);

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
      { url: '/icons/icon-32x32.png', sizes: '32x32', type: 'image/png' },
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
            <SidebarProvider>
              <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                <VideoProvider>
                  <OfflineIndicator />
                  <OfflineModeIndicator />
                  <TopLoader />
                  {initialUser && <VPNWarningProduction />}
                  {initialUser && process.env.NODE_ENV === 'development' && <VPNDebugPanel />}
                  <header>
                    <div className="hidden md:flex">
                      <HomeNav></HomeNav>
                    </div>
                  </header>
                  <MainContent>{children}</MainContent>
                  <div id="player-root" />
                  <footer></footer>
                  {/* <CookieConsent /> */}
                  {/* <OneTapComponent /> */}
                  {/* <LegalConsent /> */}
                  <Toaster />
                  {/* <IubendaScripts /> */}
                  <PlausibleAnalytics
                    domain="rotten-brains.com"
                    src="https://plausible.timdobras.com/js/pa-OqFKUXucfmn6bLkFR0Gu1.js"
                  />
                  {/* <GoogleAdsense pId="4557341861686356" /> */}
                </VideoProvider>
              </ThemeProvider>
            </SidebarProvider>
          </UserProvider>
        </Providers>
      </body>
    </html>
  );
}
