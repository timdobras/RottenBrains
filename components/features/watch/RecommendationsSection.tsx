import { Suspense } from 'react';
import MediaCardServer from '@/components/features/media/MediaCardServer';
import HomeMediaCardSkeleton from '@/components/features/media/MediaCardSkeleton';
import { getCachedRecommendations } from '@/lib/tmdb/cachedFetchers';

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

  return (
    <section className="grid w-full grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-8 px-4 md:gap-4 md:px-0">
      {initialRecs.map((rec: { id: number; media_type?: string }) => (
        <MediaCardServer
          key={rec.id}
          media_type={rec.media_type || mediaType}
          media_id={rec.id}
          user_id={userId}
          rounded={true}
        />
      ))}
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
