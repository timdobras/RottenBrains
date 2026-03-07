import React from 'react';

const HomeMediaCardSkeleton = () => {
  return (
    <div className="flex w-full min-w-[70vw] max-w-[100vw] flex-col md:w-full md:min-w-[300px] md:max-w-[512px]">
      {/* Image placeholder */}
      <div className="aspect-[16/9] w-full animate-pulse rounded-[8px] bg-foreground/10" />
      {/* Title row */}
      <div className="mt-2 h-5 w-2/3 animate-pulse rounded-[4px] bg-foreground/10" />
      {/* Genre tags row */}
      <div className="mt-1 flex flex-row items-center gap-1">
        <div className="h-[22px] w-12 animate-pulse rounded-[4px] bg-foreground/10" />
        <div className="h-[22px] w-16 animate-pulse rounded-[4px] bg-foreground/10" />
        <div className="h-[22px] w-14 animate-pulse rounded-[4px] bg-foreground/10" />
      </div>
      {/* Date row */}
      <div className="mt-2 h-3 w-20 animate-pulse rounded-[4px] bg-foreground/10" />
    </div>
  );
};

export default HomeMediaCardSkeleton;
