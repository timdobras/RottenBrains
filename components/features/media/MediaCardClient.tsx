// components/features/media/HomeMediaCardClient.tsx
'use client';

import React from 'react';
import { useQueries } from '@tanstack/react-query';
import HomeMediaCardSkeleton from '@/components/features/media/MediaCardSkeleton';
import MediaCardUI from '@/components/features/media/MediaCardUI';
import { getWatchTime } from '@/lib/supabase/clientQueries';
import { getMediaDetails, getEpisodeDetails } from '@/lib/tmdb';
import { queryKeys } from '@/lib/queryKeys';

interface MediaCardClientProps {
  media_type: string;
  media_id: number;
  season_number?: number;
  episode_number?: number;
  quality?: string;
  user_id?: string;
  rounded?: boolean;
}

const MediaCardClient: React.FC<MediaCardClientProps> = ({
  media_type,
  media_id,
  season_number,
  episode_number,
  quality,
  user_id,
  rounded,
}) => {
  // Parallel data fetching with React Query - eliminates waterfall
  const [mediaQuery, watchTimeQuery] = useQueries({
    queries: [
      {
        queryKey:
          season_number && episode_number
            ? queryKeys.media.episode(media_id, season_number, episode_number)
            : queryKeys.media.details(media_type, media_id),
        queryFn: () =>
          media_type === 'movie'
            ? getMediaDetails(media_type, media_id)
            : season_number && episode_number
              ? getEpisodeDetails(media_id, season_number, episode_number)
              : getMediaDetails(media_type, media_id),
        staleTime: 1000 * 60 * 60 * 24, // 24 hours - TMDB data is static
      },
      {
        queryKey: queryKeys.watchHistory.watchTime(
          user_id ?? '',
          media_type,
          media_id,
          season_number,
          episode_number
        ),
        queryFn: () => getWatchTime(user_id!, media_type, media_id, season_number, episode_number),
        enabled: !!user_id,
        staleTime: 1000 * 30, // 30 seconds - watch time can change
      },
    ],
  });

  // Show skeleton while loading media data
  if (mediaQuery.isLoading || !mediaQuery.data) {
    return <HomeMediaCardSkeleton />;
  }

  // Render the media card with data
  return (
    <MediaCardUI
      media={mediaQuery.data}
      media_type={media_type}
      media_id={media_id}
      season_number={season_number}
      episode_number={episode_number}
      watch_time={watchTimeQuery.data ?? 0}
      quality={quality}
      user_id={user_id}
      rounded={rounded}
    />
  );
};

export default React.memo(MediaCardClient);
