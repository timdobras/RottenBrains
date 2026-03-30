'use client';

import { useJellyfinPlayback } from '@/hooks/useJellyfinPlayback';

interface JellyfinPlayButtonProps {
  media_type: string;
  media_id: number;
}

/**
 * "Open in Jellyfin" button for the media details page.
 * Only renders when the user has Jellyfin configured AND the item is in their library.
 */
const JellyfinPlayButton = ({ media_type, media_id }: JellyfinPlayButtonProps) => {
  const { isConfigured, isLoading, jellyfinUrl, isInLibrary } = useJellyfinPlayback(
    media_type,
    media_id
  );

  if (!isConfigured || isLoading || !isInLibrary || !jellyfinUrl) return null;

  return (
    <a
      href={jellyfinUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="z-10 flex flex-row items-center gap-2 rounded-[8px] bg-foreground/10 px-6 py-2 drop-shadow-lg hover:scale-105"
    >
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
      </svg>
      <p className="text-sm">Jellyfin</p>
    </a>
  );
};

export default JellyfinPlayButton;
