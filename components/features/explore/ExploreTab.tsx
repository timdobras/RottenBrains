import React from 'react';
// import ExploreCard from '@/components/features/explore/ExploreCard';
import { fetchExploreData } from '@/lib/client/fetchExploreData';
import { getCurrentUser, getBatchWatchTimes } from '@/lib/supabase/serverQueries';
import { getMediaDetails } from '@/lib/tmdb';
import { ExploreTabProps } from '@/types';
import HomeMediaCardSkeleton from '../media/MediaCardSkeleton';
import MediaCardUI from '../media/MediaCardUI';

export async function ExploreTab({
  action,
  containerId,
}: ExploreTabProps & { containerId: string }) {
  const user = await getCurrentUser();
  let exploreData;

  try {
    exploreData = await fetchExploreData(action);
  } catch (error) {
    console.error('Error fetching explore data:', error);
    exploreData = null;
  }

  if (!exploreData?.results) {
    return null;
  }

  // Add media_type to items that don't have it
  const mediaItems = exploreData.results.slice(0, 12).map((media: any) => {
    if (!media.media_type && media.title) {
      media.media_type = 'movie';
    } else if (!media.media_type && media.name) {
      media.media_type = 'tv';
    }
    return media;
  });

  // Batch fetch watch times for all media items
  const watchTimesMap = user?.id
    ? await getBatchWatchTimes(
        user.id,
        mediaItems.map((m: any) => ({
          media_type: m.media_type,
          media_id: m.id,
          season_number: null,
          episode_number: null,
        }))
      )
    : new Map<number, number>();

  // Batch fetch media details
  const mediaDetailsPromises = mediaItems.map((media: any) =>
    getMediaDetails(media.media_type, media.id).catch(() => null)
  );
  const mediaDetails = await Promise.all(mediaDetailsPromises);

  return (
    <div className="flex w-full flex-col gap-8 border-foreground/20 md:gap-8 md:rounded-[16px] md:border md:p-8">
      <div className="flex w-full flex-row items-center justify-between px-2 md:px-0">
        <h2 className="text-xl font-bold uppercase">{action}</h2>
        <div className="rounded-full bg-foreground/10 px-6 py-2">View all</div>
      </div>

      <div className="hidden-scrollbar flex w-full snap-x snap-mandatory grid-cols-[repeat(auto-fit,minmax(300px,1fr))] flex-row gap-4 overflow-x-auto px-4 md:grid md:px-0">
        {mediaItems.map((media: any, index: number) => {
          const mediaDetail = mediaDetails[index];
          if (!mediaDetail) {
            return <HomeMediaCardSkeleton key={media.id} />;
          }

          return (
            <div key={media.id} className="snap-start scroll-ml-4">
              <MediaCardUI
                media={mediaDetail}
                media_type={media.media_type}
                media_id={media.id}
                watch_time={watchTimesMap.get(media.id) || 0}
                user_id={user?.id}
                rounded
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ExploreTab;
