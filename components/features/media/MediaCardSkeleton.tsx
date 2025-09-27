import React from "react";

const HomeMediaCardSkeleton = () => {
  return (
    <div className="mb-2 flex w-full min-w-[75vw] max-w-[100vw] flex-col gap-4 md:w-full md:min-w-[300px] md:max-w-[400px]">
      <div className="aspect-[16/9] w-full rounded-[8px] bg-foreground/10"></div>
      <div className="h-6 w-2/3 rounded-[8px] bg-foreground/10"></div>
      <div className="h-4 w-1/3 rounded-[8px] bg-foreground/10"></div>
    </div>
  );
};

export default HomeMediaCardSkeleton;
