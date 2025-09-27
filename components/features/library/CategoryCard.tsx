// WatchListCard.tsx (or .jsx)

import React from "react";
import ImageWithFallback from "@/components/features/media/ImageWithFallback";
import Link from "next/link";

interface WatchListCardProps {
  label: string; // e.g., "Watched", "Watching", "Planned"
  color: string; // e.g., watchedColor.hex
  mediaId: number; // e.g., watchedMedia.id
  imageUrl?: string; // the full path or partial path to the image
}

const WatchListCard: React.FC<WatchListCardProps> = ({
  label,
  color,
  mediaId,
  imageUrl,
}) => {
  return (
    <Link
      href={`/protected/watch-list/${label.toLowerCase()}`}
      className="flex h-auto w-full flex-col items-center md:w-[300px]"
    >
      {/* Bottom “shadow” layer
      <div
        className="z-10 -mb-[50%] aspect-[16/9] w-full scale-90 rounded-[8px] opacity-50"
        style={{ backgroundColor: color }}
      /> */}

      {/* Middle “shadow” layer */}
      <div
        className="z-20 -mb-[50%] aspect-[16/9] w-full scale-95 rounded-[8px] opacity-80"
        style={{ backgroundColor: color }}
      />

      {/* Top layer with image */}
      <div className="relative z-30 flex aspect-[16/9] w-full overflow-hidden rounded-[8px] drop-shadow-md">
        <ImageWithFallback altText={`${mediaId}`} imageUrl={imageUrl} />
      </div>
      <div className="mt-2 flex w-full flex-col">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-foreground/50">Private · Playlist</p>
      </div>
    </Link>
  );
};

export default WatchListCard;
