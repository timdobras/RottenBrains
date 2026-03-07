import { Suspense } from 'react';
import MediaCardUI from '@/components/features/media/MediaCardUI';
import HomeMediaCardSkeleton from '@/components/features/media/MediaCardSkeleton';
import { fetchUpNext } from '@/lib/server/homeFunctions';
import { cn } from '@/lib/utils';
import HorizontalScroll from './HorizontalScroll';

interface UpNextSectionProps {
  userId: string;
  /**
   * "default" — standard home page layout (mt-14, hidden title on mobile).
   * "full-bleed" — no top margin, visible title
   *   for use in full-width layouts like the design/landing page.
   */
  variant?: 'default' | 'full-bleed';
}

async function UpNextList({ userId, variant = 'default' }: UpNextSectionProps) {
  const upNext = await fetchUpNext(userId);

  if (!upNext || upNext.length === 0) {
    return null;
  }

  return (
    <HorizontalScroll className={cn('-my-4 py-4', variant === 'full-bleed' && 'md:pl-8')}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- fetchUpNext returns untyped Supabase/TMDB data */}
      {upNext.map((media: any) => (
        <div
          key={media.id || `${media.media_id}-${media.season_number}-${media.episode_number}`}
          className="shrink-0"
        >
          <MediaCardUI media={media} user_id={userId} rounded showRemoveButton />
        </div>
      ))}
    </HorizontalScroll>
  );
}

function UpNextSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden px-4 md:px-0">
      {Array.from({ length: 4 }).map((_, i) => (
        <HomeMediaCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default function UpNextSection({ userId, variant = 'default' }: UpNextSectionProps) {
  return (
    <section
      className={cn(variant === 'default' && 'mt-14 md:mt-0', variant === 'full-bleed' && 'mt-0')}
    >
      <p
        className={cn(
          'mb-4 font-medium md:text-lg',
          variant === 'default' && 'hidden md:flex',
          variant === 'full-bleed' && 'pl-4 md:pl-8'
        )}
      >
        Up Next
      </p>
      <Suspense fallback={<UpNextSkeleton />}>
        <UpNextList userId={userId} variant={variant} />
      </Suspense>
    </section>
  );
}
