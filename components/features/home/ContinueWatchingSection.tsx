import { Suspense } from 'react';
import HorizontalScroll from './HorizontalScroll';
import MediaCardUI from '@/components/features/media/MediaCardUI';
import HomeMediaCardSkeleton from '@/components/features/media/MediaCardSkeleton';
import { fetchContinueWatching } from '@/lib/server/homeFunctions';

interface ContinueWatchingSectionProps {
  userId: string;
}

async function ContinueWatchingList({ userId }: ContinueWatchingSectionProps) {
  const continueWatching = await fetchContinueWatching(userId);

  if (!continueWatching || continueWatching.length === 0) {
    return (
      <div className="flex w-full items-center justify-center p-8">
        You have no watch history yet. Start watching something!
      </div>
    );
  }

  return (
    <HorizontalScroll>
      {continueWatching.map((media: any) => (
        <div key={media.id || `${media.media_id}-${media.season_number}-${media.episode_number}`} className="snap-start scroll-ml-4 md:scroll-ml-8">
          <MediaCardUI media={media} user_id={userId} rounded showRemoveButton />
        </div>
      ))}
    </HorizontalScroll>
  );
}

function ContinueWatchingSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden px-4 md:px-0">
      {Array.from({ length: 4 }).map((_, i) => (
        <HomeMediaCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default function ContinueWatchingSection({ userId }: ContinueWatchingSectionProps) {
  return (
    <section className="mt-14 md:mt-0">
      <p className="mb-4 hidden font-medium md:flex md:text-lg">Continue Watching</p>
      <Suspense fallback={<ContinueWatchingSkeleton />}>
        <ContinueWatchingList userId={userId} />
      </Suspense>
    </section>
  );
}
