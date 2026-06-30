'use client';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import { useUser } from '@/hooks/UserContext';

const Profile = () => {
  const { user } = useUser();

  if (!user) {
    return null;
  }

  return (
    <Link href={`/protected/profile`} className="flex w-full flex-row items-center gap-4 p-4">
      <Image
        src={user.image_url || '/assets/images/logo_new_black.svg'}
        alt="User Avatar"
        width={64}
        height={64}
        className={`aspect-square h-16 rounded-full object-cover`}
      />
      <div className="flex h-max flex-col">
        <span className="text-2xl font-bold">{user.username}</span>
        <span className="text-xs lowercase text-foreground/50">@{user.username}</span>
      </div>
    </Link>
  );
};

export default Profile;
