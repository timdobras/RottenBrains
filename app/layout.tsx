import { GeistSans } from 'geist/font/sans';
import React from 'react';
import CookieConsent from '@/components/features/consent/CookieConsent';
import LegalConsent from '@/components/features/consent/LegalConsent';
import { OfflineModeIndicator } from '@/components/features/dev/OfflineModeIndicator';
import TopLoader from '@/components/features/loaders/TopLoader';
import VPNWarningProduction from '@/components/features/navigation/VPNWarningProduction';
import VPNDebugPanel from '@/components/features/navigation/VPNDebugPanel';
import OfflineIndicator from '@/components/features/pwa/OfflineIndicator';
import { Toaster } from '@/components/ui/toaster';
import { SidebarProvider } from '@/hooks/SidebarContext';
import UserProvider from '@/hooks/UserContext';
import VideoProvider from '@/hooks/VideoProvider';
import { createClient } from '@/lib/supabase/server';
import MainContent from '../components/common/MainContent';
import HomeNav from '../components/features/navigation/desktop/Navbar';
import './globals.css';
import { cookies } from 'next/headers';
import { ThemeProvider } from 'next-themes';
import PlausibleAnalytics from '@/components/common/PlausibleAnalytics';

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
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  let initialUser = null;

  if (authUser) {
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    initialUser = userData;
  }

  // return (
  //   <html>
  //     <body>404 error</body>
  //   </html>
  // );

  return (
    <html lang="en" suppressHydrationWarning>
      <UserProvider initialUser={initialUser}>
        <SidebarProvider>
          <body className="custom-scrollbar max-h-[100dvh] w-full overflow-x-hidden bg-background text-foreground transition-all duration-300">
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
                <div
                  id="player-root"
                  className="fixed bottom-16 right-2 z-50 aspect-[16/9] w-[60vw] overflow-hidden bg-background transition-all duration-200 md:bottom-2 md:z-20 md:h-64 md:w-auto md:rounded-[8px]"
                />
                <footer></footer>
                {/* <CookieConsent /> */}
                {/* <OneTapComponent /> */}
                {/* <LegalConsent /> */}
                <Toaster />
                {/* <IubendaScripts /> */}
                <PlausibleAnalytics domain="rotten-brains.com" src="https://plausible.timdobras.com/js/pa-OqFKUXucfmn6bLkFR0Gu1.js" />
                {/* <GoogleAdsense pId="4557341861686356" /> */}
              </VideoProvider>
            </ThemeProvider>
          </body>
        </SidebarProvider>
      </UserProvider>
    </html>
  );
}
