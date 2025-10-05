import React from 'react';
import HomeMediaCardSkeleton from '@/components/features/media/MediaCardSkeleton';

const loading = () => {
  return (
    <div className="mt-14 grid w-full grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-8 px-4 md:mt-0 md:gap-4 md:px-0 md:pr-8">
      {Array.from({ length: 24 }).map((_, index) => (
        <HomeMediaCardSkeleton key={index}></HomeMediaCardSkeleton>
      ))}
    </div>
  );
};

export default loading;
