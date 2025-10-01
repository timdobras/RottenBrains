"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface RemoveFromContinueWatchingProps {
  user_id: string;
  media_type: string;
  media_id: number;
  season_number?: number;
  episode_number?: number;
}

export default function RemoveFromContinueWatching({
  user_id,
  media_type,
  media_id,
  season_number,
  episode_number,
}: RemoveFromContinueWatchingProps) {
  const [isRemoving, setIsRemoving] = useState(false);
  const router = useRouter();

  const handleRemove = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isRemoving) return;

    setIsRemoving(true);

    try {
      const response = await fetch("/api/hideFromContinueWatching", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id,
          media_type,
          media_id,
          season_number,
          episode_number,
        }),
      });

      if (response.ok) {
        // Refresh the page to update the continue watching section
        router.refresh();
      } else {
        console.error("Failed to remove from continue watching");
        setIsRemoving(false);
      }
    } catch (error) {
      console.error("Error removing from continue watching:", error);
      setIsRemoving(false);
    }
  };

  return (
    <button
      onClick={handleRemove}
      disabled={isRemoving}
      className="group/remove absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm transition-all hover:bg-black/80 disabled:opacity-50"
      title="Remove from Continue Watching"
      aria-label="Remove from Continue Watching"
    >
      {isRemoving ? (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      ) : (
        <svg
          className="h-4 w-4 text-white transition-transform group-hover/remove:scale-110"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      )}
    </button>
  );
}
