'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';
import { useUser } from '@/hooks/UserContext';

const UserIconNavBottom = () => {
  const { user } = useUser();
  const pathname = usePathname();
  const href = '/protected/user-mobile';
  const isActive = pathname.includes(href.split('/').pop()!);
  return (
    <Link
      href={'/protected/user-mobile'}
      className={`flex flex-1 flex-col items-center justify-center opacity-80`}
    >
      <div
        className={`flex w-full flex-col items-center justify-center rounded-full p-1 hover:bg-secondary/20 hover:text-accent ${
          isActive ? `bg-secondary/20 text-accent` : `text-foreground`
        }`}
      >
        <Image
          src={user?.image_url || '/assets/images/logo_new_black.svg'}
          alt="User Avatar"
          width={24}
          height={24}
          className={`aspect-square h-[24px] rounded-full object-cover`}
        />
      </div>
      <p className="text-xs">You</p>
    </Link>
  );
};

export default UserIconNavBottom;
