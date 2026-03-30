'use client';

import { useVideo } from '@/hooks/VideoProvider';
import { useJellyfinPlayback } from '@/hooks/useJellyfinPlayback';

/**
 * "Open in Jellyfin" button for the watch page.
 * Only renders when the user has Jellyfin configured AND the item is in their library.
 */
const JellyfinButton = () => {
  const { state } = useVideo();
  const { isConfigured, isLoading, jellyfinUrl, isInLibrary } = useJellyfinPlayback(
    state.media_type,
    state.media_id,
    state.season_number,
    state.episode_number
  );

  if (!isConfigured || isLoading || !isInLibrary || !jellyfinUrl) return null;

  return (
    <a
      href={jellyfinUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="z-10 flex flex-row items-center gap-2 justify-self-end rounded-full bg-foreground/10 px-4 py-1"
    >
      <svg
        className="h-3 w-3"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
      </svg>
      <p>Jellyfin</p>
    </a>
  );
};

export default JellyfinButton;
