import React from "react";
import { motion } from "framer-motion";

interface PostSkeletonProps {
  variants: any;
}

const PostSkeleton = () => {
  return (
    <div className="relative flex h-min flex-col overflow-hidden rounded-[8px] border border-foreground/10 bg-white/5 md:max-w-[300px]">
      {/* Header Section */}
      <div className="flex flex-row items-center justify-between gap-4 px-4 py-2">
        <div className="flex flex-row items-center gap-2">
          {/* Profile Picture Skeleton */}
          <div className="h-[32px] w-[32px] rounded-full bg-foreground/10" />
          <div>
            {/* Username and Time Skeleton */}
            <div className="mb-1 h-[16px] w-[120px] bg-foreground/10" />
            <div className="h-[12px] w-[80px] bg-foreground/10" />
          </div>
        </div>
        <div className="flex h-full flex-row items-center gap-2">
          {/* Edit Button Skeleton */}
          <div className="h-[20px] w-[20px] bg-foreground/10" />
        </div>
      </div>

      {/* Main Content Section */}
      <div className="flex w-full flex-col justify-between">
        <div className="relative w-full">
          {/* Image Skeleton */}
          <div className="aspect-[16/9] h-auto w-[300px] bg-foreground/10" />
          <div className="absolute bottom-2 right-2">
            {/* Vote Skeleton */}
            <div className="h-[20px] w-[50px] bg-foreground/10" />
          </div>
        </div>

        <div className="flex flex-col px-2 md:px-4">
          <div className="flex flex-col gap-2 py-4">
            <div className="flex w-full flex-row gap-2">
              {/* Media Icon Skeleton */}
              <div className="h-[20px] w-[20px] bg-foreground/10" />
              {/* Media Title Skeleton */}
              <div className="h-[16px] w-[150px] bg-foreground/10" />
            </div>
            {/* Review Text Skeleton */}
            <div className="h-[60px] w-full bg-foreground/10" />
          </div>
          <div className="flex w-full flex-col justify-between py-2">
            <div className="flex w-full items-center">
              <div className="align-center flex h-full w-full flex-row items-center justify-between">
                {/* Post Stats Skeleton */}
                <div className="h-[20px] w-[60px] bg-foreground/10" />
              </div>
              <div className="flex flex-row items-center gap-2">
                {/* More Options Skeleton */}
                <div className="h-[20px] w-[100px] bg-foreground/10" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostSkeleton;
