import type { EnrichedMediaItem } from '@/lib/tmdb/types';
import MediaRow from './MediaRow';
import { getPopularMovies, getPopularTVShows } from '@/lib/tmdb';
import { enrichItem } from '@/lib/tmdb/enrich';

interface PopularRowProps {
  title: string;
  type: 'movie' | 'tv';
  userId?: string;
}

/**
 * Async server component for a "Popular Movies/TV" row. It does its OWN fetch +
 * per-item enrichment so the ~20 detail calls stream in behind a <Suspense>
 * boundary instead of blocking the landing page's initial paint (hero + shell).
 */
export default async function PopularRow({ title, type, userId }: PopularRowProps) {
  const res = type === 'movie' ? await getPopularMovies() : await getPopularTVShows();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: EnrichedMediaItem[] = (res?.results ?? []).map((m: any) => ({
    ...m,
    media_type: type,
  }));
  const items = await Promise.all(raw.map(enrichItem));
  return <MediaRow title={title} items={items} userId={userId} />;
}
