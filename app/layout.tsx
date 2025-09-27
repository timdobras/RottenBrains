import React from "react";
import HomeNav from "../components/features/navigation/desktop/Navbar";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import CookieConsent from "@/components/features/consent/CookieConsent";
import UserProvider from "@/hooks/UserContext";
import { cookies } from "next/headers";
import LegalConsent from "@/components/features/consent/LegalConsent";
import MainContent from "../components/common/MainContent";
import { SidebarProvider } from "@/hooks/SidebarContext";
import { createClient } from "@/lib/supabase/server";
import TopLoader from "@/components/features/loaders/TopLoader";
import { ThemeProvider } from "next-themes";
import VideoProvider from "@/hooks/VideoProvider";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata = {
  title: "Rotten Brains | Stream movies and TV for free in HD quality.",
  description:
    "Watch movies and tv shows in HD quality for free. Discover all new movies in 2025. Stream for free in the best HD quality possible | Rotten Brains",
};

export default async function NotProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  let initialUser = null;

  if (authUser) {
    const { data: userData } = await supabase
      .from("users")
      .select("*")
      .eq("id", authUser.id)
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
                <TopLoader />
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
                <Analytics />
                <SpeedInsights />
                {/* <GoogleAnalytics gtag={"G-06SFYC5DWK"} /> */}
                {/* <GoogleAdsense pId="4557341861686356" /> */}
              </VideoProvider>
            </ThemeProvider>
          </body>
        </SidebarProvider>
      </UserProvider>
    </html>
  );
}
