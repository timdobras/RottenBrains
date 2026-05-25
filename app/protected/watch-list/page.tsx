import { redirect } from 'next/navigation';
import React from 'react';
import WatchListCard from '@/components/features/library/CategoryCard';
import { getAverageColorSafe } from '@/lib/getAverageColorSafe';
import { getCurrentUser, getWatchListSpecific } from '@/lib/supabase/serverQueries';
import { getMediaDetails } from '@/lib/tmdb';

export const dynamic = 'force-dynamic';

const page = async () => {
  // Auth is enforced by middleware — user is guaranteed to exist here
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const limit = 1;
  const offset = 0;

  // Fetch all three watch list categories in parallel
  const [watching, planned, watched] = await Promise.all([
    getWatchListSpecific(user.id, limit, offset, 'watching'),
    getWatchListSpecific(user.id, limit, offset, 'planned'),
    getWatchListSpecific(user.id, limit, offset, 'watched'),
  ]);

  const fwatched = watched[0];
  const fwatching = watching[0];
  const fplanned = planned[0];

  // Fetch all media details in parallel
  const [watchedMedia, watchingMedia, plannedMedia] = await Promise.all([
    getMediaDetails(fwatched.media_type, fwatched.media_id),
    getMediaDetails(fwatching.media_type, fwatching.media_id),
    getMediaDetails(fplanned.media_type, fplanned.media_id),
  ]);

  // Fetch all colors in parallel
  const [watchedColor, watchingColor, plannedColor] = await Promise.all([
    getAverageColorSafe(`https://image.tmdb.org/t/p/w200${watchedMedia.backdrop_path}`),
    getAverageColorSafe(`https://image.tmdb.org/t/p/w200${watchingMedia.backdrop_path}`),
    getAverageColorSafe(`https://image.tmdb.org/t/p/w200${plannedMedia.backdrop_path}`),
  ]);

  const watchedImageUrl =
    watchedMedia?.images?.backdrops?.[0]?.file_path || watchedMedia?.backdrop_path;
  const watchingImageUrl =
    watchingMedia?.images?.backdrops?.[0]?.file_path || watchingMedia?.backdrop_path;
  const plannedImageUrl =
    plannedMedia?.images?.backdrops?.[0]?.file_path || plannedMedia?.backdrop_path;

  return (
    <div className="mb-16 w-full flex-col px-4 py-4 md:px-0">
      <h1 className="px-4 text-lg font-semibold">Watch List</h1>
      <div className="my-4 w-full border-b-2 border-foreground/5"></div>

      <div className="flex w-full flex-col gap-8 md:flex-row">
        <WatchListCard
          label="Watching"
          color={watchingColor.hex}
          mediaId={watchingMedia.id}
          imageUrl={watchingImageUrl}
        />
        <WatchListCard
          label="Planned"
          color={plannedColor.hex}
          mediaId={plannedMedia.id}
          imageUrl={plannedImageUrl}
        />
        <WatchListCard
          label="Watched"
          color={watchedColor.hex}
          mediaId={watchedMedia.id}
          imageUrl={watchedImageUrl}
        />
      </div>
    </div>
  );
};

export default page;
