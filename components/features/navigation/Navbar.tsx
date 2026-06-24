'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react';
import { PlusIcon, SearchIcon } from '@/components/ui/Icon';
import { useUser } from '@/hooks/UserContext';
import { cn } from '@/lib/utils';
import NotificationButton from '@/components/features/notifications/NotificationButton';
import SearchModal from '@/components/features/navigation/mobile/SearchModal';

const ProfilePictureNew = dynamic(
  () => import('@/components/features/navigation/desktop/ProfilePictureNew'),
  {
    ssr: false,
    loading: () => <div className="h-10 w-24 animate-pulse rounded-full bg-foreground/10" />,
  }
);

const NAV_LINKS = [
  { label: 'Movies', href: '/protected/explore?type=movie' },
  { label: 'Shows', href: '/protected/explore?type=tv' },
  { label: 'Feed', href: '/protected/feed' },
] as const;

export default function Navbar() {
  const { user, isLoading } = useUser();
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Mobile hide-on-scroll-down / reveal-on-scroll-up.
  // The transform is driven imperatively (no React re-render, no CSS transition)
  // so it tracks the scroll position 1:1 — buttery smooth, no smear.
  const navRef = useRef<HTMLElement>(null);
  const lastScrollY = useRef(0);
  const currentTranslateY = useRef(0);
  const MOBILE_NAV_HEIGHT = 48; // matches h-12

  useEffect(() => {
    lastScrollY.current = window.scrollY;
    setScrolled(window.scrollY > 50);

    const isMobile = () => window.matchMedia('(max-width: 767px)').matches;

    const update = () => {
      const currentScrollY = window.scrollY;
      const deltaY = currentScrollY - lastScrollY.current;

      setScrolled(currentScrollY > 50);

      if (isMobile()) {
        // Scrolling down pushes the bar up (hidden); scrolling up reveals it
        // proportionally to the scroll-up distance. Clamp to [-height, 0].
        let next = currentTranslateY.current - deltaY;
        next = Math.min(0, Math.max(-MOBILE_NAV_HEIGHT, next));
        currentTranslateY.current = next;
        if (navRef.current) navRef.current.style.transform = `translateY(${next}px)`;
      } else if (currentTranslateY.current !== 0) {
        // Keep the bar pinned on desktop
        currentTranslateY.current = 0;
        if (navRef.current) navRef.current.style.transform = 'translateY(0)';
      }

      lastScrollY.current = currentScrollY;
    };

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        update();
        ticking = false;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <nav
        ref={navRef}
        style={{ transform: 'translateY(0)', willChange: 'transform' }}
        className={cn(
          'fixed left-0 right-0 top-0 z-50 flex h-12 w-full items-center justify-center px-4 transition-colors duration-200 md:h-16 md:px-8',
          scrolled ? 'border-b border-foreground/10 bg-background' : 'bg-transparent'
        )}
      >
        <div className="flex h-full w-full items-center justify-between">
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

            {user && (
              <Link
                href="/protected/create-post"
                aria-label="Create Post"
                className="hidden rounded-full p-2 text-foreground/70 transition hover:bg-foreground/10 hover:text-foreground md:block"
              >
                <PlusIcon className="h-5 w-5 fill-current" />
              </Link>
            )}

            {isLoading ? (
              <div className="h-8 w-8 animate-pulse rounded-full bg-foreground/10" />
            ) : user ? (
              <>
                <NotificationButton user_id={String(user.id)} />
                {/* Desktop: full profile dropdown */}
                <div className="hidden md:block">
                  <ProfilePictureNew />
                </div>
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
