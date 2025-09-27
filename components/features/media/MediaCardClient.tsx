// components/features/media/HomeMediaCardClient.tsx
"use client";

import React, { useEffect, useState } from "react";
import { getMediaDetails, getEpisodeDetails } from "@/lib/tmdb";
import { getWatchTime } from "@/lib/supabase/clientQueries";
import HomeMediaCardSkeleton from "@/components/features/media/MediaCardSkeleton";
import MediaCardUI from "@/components/features/media/MediaCardUI";

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
  const [media, setMedia] = useState<any>(null);
  const [watchTime, setWatchTime] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // 1) fetch TMDB data
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data =
          media_type === "movie"
            ? await getMediaDetails(media_type, media_id)
            : season_number && episode_number
              ? await getEpisodeDetails(media_id, season_number, episode_number)
              : await getMediaDetails(media_type, media_id);

        if (alive) setMedia(data);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [media_type, media_id, season_number, episode_number]);

  // 2) fetch watch-time (after TMDB data is in place)
  useEffect(() => {
    if (!user_id) return;
    (async () => {
      const wt = await getWatchTime(
        user_id,
        media_type,
        media_id,
        season_number,
        episode_number,
      );
      setWatchTime(wt ?? 0);
    })();
  }, [user_id, media_type, media_id, season_number, episode_number]);

  // 3) skeleton while loading / error
  if (loading || !media) {
    return <HomeMediaCardSkeleton />;
  }

  // 4) final render via the shared UI component
  return (
    <MediaCardUI
      media={media}
      media_type={media_type}
      media_id={media_id}
      season_number={season_number}
      episode_number={episode_number}
      watch_time={watchTime}
      quality={quality}
      user_id={user_id}
      rounded={rounded}
    />
  );
};

export default React.memo(MediaCardClient);
