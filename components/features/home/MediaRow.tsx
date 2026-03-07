import type { EnrichedMediaItem } from '@/lib/tmdb/types';
import MediaCardUI from '@/components/features/media/MediaCardUI';
import { cn } from '@/lib/utils';
import HorizontalScroll from './HorizontalScroll';

interface MediaRowProps {
  title: string;
  items: EnrichedMediaItem[];
  userId?: string;
  className?: string;
}

export default function MediaRow({ title, items, userId, className }: MediaRowProps) {
  if (!items || items.length === 0) return null;

  return (
    <section className={cn('w-full min-w-0', className)}>
      <h2 className="mb-4 pl-4 text-lg font-semibold sm:text-xl md:pl-8">{title}</h2>
      <HorizontalScroll className="-my-4 py-4 md:pl-8">
        {items.map((media) => (
          <div key={media.id}>
            <MediaCardUI media={media} user_id={userId} rounded />
          </div>
        ))}
      </HorizontalScroll>
    </section>
  );
}
