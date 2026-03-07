import Link from 'next/link';
import type { TMDBGenre } from '@/lib/tmdb/types';
import { cn } from '@/lib/utils';
import HorizontalScroll from './HorizontalScroll';

interface GenreRowProps {
  title: string;
  genres: TMDBGenre[];
  mediaType: 'movie' | 'tv';
  className?: string;
}

const GENRE_COLORS = [
  'from-rose-500/30 to-rose-900/30',
  'from-blue-500/30 to-blue-900/30',
  'from-emerald-500/30 to-emerald-900/30',
  'from-amber-500/30 to-amber-900/30',
  'from-violet-500/30 to-violet-900/30',
  'from-cyan-500/30 to-cyan-900/30',
  'from-pink-500/30 to-pink-900/30',
  'from-indigo-500/30 to-indigo-900/30',
  'from-teal-500/30 to-teal-900/30',
  'from-orange-500/30 to-orange-900/30',
] as const;

export default function GenreRow({ title, genres, mediaType, className }: GenreRowProps) {
  return (
    <section className={cn('w-full min-w-0', className)}>
      <h2 className="mb-4 pl-4 text-lg font-semibold sm:text-xl md:pl-8">{title}</h2>
      <HorizontalScroll className="-my-4 py-4 md:pl-8">
        {genres.map((genre, i) => (
          <div key={genre.id} className="w-[45vw] shrink-0 md:w-[250px]">
            <Link
              href={`/protected/explore?type=${mediaType}&with_genres=${genre.id}`}
              className={cn(
                'flex aspect-video w-full items-center justify-center rounded-xl border border-foreground/10 bg-gradient-to-br text-center text-sm font-semibold sm:text-base',
                GENRE_COLORS[i % GENRE_COLORS.length]
              )}
            >
              {genre.name}
            </Link>
          </div>
        ))}
      </HorizontalScroll>
    </section>
  );
}
