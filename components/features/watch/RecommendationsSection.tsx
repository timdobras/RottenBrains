import { Suspense } from 'react';
import MediaCardUI from '@/components/features/media/MediaCardUI';
import HomeMediaCardSkeleton from '@/components/features/media/MediaCardSkeleton';
import { getBatchWatchTimes } from '@/lib/supabase/serverQueries';
import { getMediaDetails } from '@/lib/tmdb';
import { getCachedRecommendations } from '@/lib/tmdb/cachedFetchers';
import { logger } from '@/lib/logger';

interface RecommendationsProps {
  mediaType: string;
  mediaId: number;
  userId?: string;
}

async function RecommendationsList({ mediaType, mediaId, userId }: RecommendationsProps) {
  const recommendations = await getCachedRecommendations(mediaType, mediaId);

  if (!recommendations?.results?.length) {
    return null;
  }

  // Limit initial load to 8 items for faster render
  const initialRecs = recommendations.results.slice(0, 8);

  // Batch fetch: TMDB details + watch times in parallel instead of 8 individual MediaCardServer calls
  const watchTimeItems = initialRecs.map((rec: any) => ({
    media_type: rec.media_type || mediaType,
    media_id: rec.id,
  }));

  const [detailsResults, watchTimeMap] = await Promise.all([
    Promise.allSettled(
      initialRecs.map((rec: any) => getMediaDetails(rec.media_type || mediaType, rec.id))
    ),
    userId
      ? getBatchWatchTimes(userId, watchTimeItems)
      : Promise.resolve(new Map<string, number>()),
  ]);

  return (
    <section className="grid w-full grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-8 px-4 md:gap-4 md:px-0">
      {initialRecs.map((rec: any, index: number) => {
        const detailResult = detailsResults[index];
        if (detailResult.status !== 'fulfilled' || !detailResult.value) return null;

        const media = detailResult.value;
        const recMediaType = rec.media_type || mediaType;
        const key = `${recMediaType}-${rec.id}--1--1`;
        const watchTime = watchTimeMap.get(key) || 0;

        return (
          <MediaCardUI
            key={rec.id}
            media={media}
            media_type={recMediaType}
            media_id={rec.id}
            watch_time={watchTime}
            user_id={userId}
            rounded={true}
            disableTrailer={true}
          />
        );
      })}
    </section>
  );
}

function RecommendationsSkeleton() {
  return (
    <section className="grid w-full grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-8 px-4 md:gap-4 md:px-0">
      {Array.from({ length: 8 }).map((_, i) => (
        <HomeMediaCardSkeleton key={i} />
      ))}
    </section>
  );
}

export default function RecommendationsSection(props: RecommendationsProps) {
  return (
    <Suspense fallback={<RecommendationsSkeleton />}>
      <RecommendationsList {...props} />
    </Suspense>
  );
}
