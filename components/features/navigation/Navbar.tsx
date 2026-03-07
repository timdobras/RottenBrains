'use client';

import Image from 'next/image';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { SearchIcon } from '@/components/ui/Icon';
import { useUser } from '@/hooks/UserContext';
import { cn } from '@/lib/utils';
import NotificationButton from '@/components/features/notifications/NotificationButton';
import ProfilePictureNew from '@/components/features/navigation/desktop/ProfilePictureNew';
import SearchModal from '@/components/features/navigation/mobile/SearchModal';

const NAV_LINKS = [
  { label: 'Movies', href: '/protected/explore?type=movie' },
  { label: 'Shows', href: '/protected/explore?type=tv' },
  { label: 'Feed', href: '/' },
] as const;

export default function Navbar() {
  const { user, isLoading } = useUser();
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <nav
        className={cn(
          'fixed left-0 right-0 top-0 z-50 flex h-14 w-full items-center justify-center px-4 transition-all duration-300 md:h-16 md:px-8',
          scrolled
            ? 'border-b border-foreground/10 bg-background/60 backdrop-blur-md'
            : 'bg-transparent'
        )}
      >
        <div className="flex h-full w-full max-w-screen-2xl items-center justify-between">
          {/* Left: Logo + Nav links */}
          <div className="flex items-center gap-4 md:gap-8">
            <Link href="/">
              <Image
                src="/assets/images/logo_text_new.svg"
                alt="RottenBrains"
                width={120}
                height={20}
                className="h-4 w-auto brightness-0 invert dark:invert md:h-5"
                priority
              />
            </Link>

            {/* Desktop nav links */}
            <div className="hidden items-center gap-1 md:flex">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="rounded-full px-4 py-2 text-sm font-medium text-foreground/70 transition hover:bg-foreground/10 hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Right: Search, Notifications, Profile */}
          <div className="flex items-center gap-1 md:gap-2">
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Open Search"
              className="rounded-full p-2 text-foreground/70 transition hover:bg-foreground/10 hover:text-foreground"
            >
              <SearchIcon className="h-5 w-5 fill-current" />
            </button>

            {isLoading ? (
              <div className="h-8 w-8 animate-pulse rounded-full bg-foreground/10" />
            ) : user ? (
              <>
                <NotificationButton user_id={String(user.id)} />
                {/* Desktop: full profile dropdown */}
                <div className="hidden md:block">
                  <ProfilePictureNew />
                </div>
                {/* Mobile: just the avatar */}
                <Link href="/protected/profile" className="md:hidden">
                  <Image
                    src={user.image_url}
                    alt={user.username}
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-full object-cover"
                    unoptimized
                  />
                </Link>
              </>
            ) : (
              <Link
                href="/login"
                className="ml-1 rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-background transition hover:bg-foreground/90 md:px-4 md:py-2 md:text-sm"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </nav>

      {searchOpen && <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />}
    </>
  );
}
