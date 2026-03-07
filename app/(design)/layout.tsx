import { Roboto } from 'next/font/google';
import React from 'react';
import '../globals.css';
import { ThemeProvider } from 'next-themes';
import Providers from '@/components/providers/Providers';
import UserProvider from '@/hooks/UserContext';
import VideoProvider from '@/hooks/VideoProvider';
import VideoShellClient from './VideoShellClient';
import { getCurrentUser } from '@/lib/supabase/serverQueries';
import { Toaster } from '@/components/ui/toaster';

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-roboto',
  display: 'swap',
});

export const metadata = {
  title: 'Design Sandbox | Rotten Brains',
  description: 'Design sandbox for testing layouts and landing pages.',
};

export default async function DesignLayout({ children }: { children: React.ReactNode }) {
  const initialUser = await getCurrentUser();

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${roboto.variable} min-h-screen w-full bg-background font-roboto text-foreground`}
      >
        <Providers>
          <UserProvider initialUser={initialUser}>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
              <VideoProvider>
                {children}
                <div id="player-root" />
                <VideoShellClient />
              </VideoProvider>
              <Toaster />
            </ThemeProvider>
          </UserProvider>
        </Providers>
      </body>
    </html>
  );
}
