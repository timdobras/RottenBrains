'use client';

import { useRouter } from 'next/navigation';
import React from 'react';
import GoBackArrow from '@/components/features/navigation/GoBackArrow';
import SearchBar from '@/components/features/search-bar/SearchBar';

const Page = () => {
  const router = useRouter();

  const handleMediaSelect = (item: any) => {
    if (item.media_type === 'movie' || item.media_type === 'tv') {
      router.push(`/protected/create-post/${item.media_type}/${item.id}`);
    }
  };

  return (
    <div className="w-full">
      <div className="relative z-20 flex h-16 w-screen flex-row items-center gap-4 bg-background px-4 md:hidden">
        <GoBackArrow />
        <p className="truncate text-lg">Create post</p>
      </div>
      <div className="mx-auto mt-10 flex w-full max-w-4xl flex-col items-center text-foreground">
        <div className="w-[300px] py-4 md:w-[500px]">
          <p className="py-2 text-center text-lg font-semibold">Search for a Movie or TV Show</p>
          <SearchBar onMediaSelect={handleMediaSelect} />
        </div>
      </div>
    </div>
  );
};

export default Page;
