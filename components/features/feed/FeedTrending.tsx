'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { getTrendingMovies, getTrendingTV } from '@/lib/tmdb';
import { ROUTES } from '@/lib/constants';

export default function FeedTrending() {
  const { data: movies, isLoading: moviesLoading } = useQuery({
    queryKey: ['trending', 'movies'],
    queryFn: () => getTrendingMovies(),
    staleTime: 1000 * 60 * 30,
  });

  const { data: shows, isLoading: showsLoading } = useQuery({
    queryKey: ['trending', 'tv'],
    queryFn: () => getTrendingTV(),
    staleTime: 1000 * 60 * 30,
  });

  const trendingMovies = movies?.results?.slice(0, 5) ?? [];
  const trendingShows = shows?.results?.slice(0, 5) ?? [];
  const isLoading = moviesLoading || showsLoading;

  return (
    <div className="sticky top-20 flex flex-col gap-5">
      {/* Trending Movies */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-foreground/70">Trending Movies</h3>
        {isLoading ? (
          <SkeletonList />
        ) : (
          <ul className="flex flex-col gap-1">
            {trendingMovies.map((movie: any) => (
              <TrendingItem
                key={movie.id}
                href={ROUTES.MEDIA_DETAIL('movie', movie.id)}
                title={movie.title}
                posterPath={movie.poster_path}
                voteAverage={movie.vote_average}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Trending TV Shows */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-foreground/70">Trending Shows</h3>
        {isLoading ? (
          <SkeletonList />
        ) : (
          <ul className="flex flex-col gap-1">
            {trendingShows.map((show: any) => (
              <TrendingItem
                key={show.id}
                href={ROUTES.MEDIA_DETAIL('tv', show.id)}
                title={show.name}
                posterPath={show.poster_path}
                voteAverage={show.vote_average}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function TrendingItem({
  href,
  title,
  posterPath,
  voteAverage,
}: {
  href: string;
  title: string;
  posterPath: string | null;
  voteAverage: number;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-foreground/5"
      >
        {posterPath ? (
          <img
            src={`https://image.tmdb.org/t/p/w92${posterPath}`}
            alt={title}
            className="h-12 w-8 flex-shrink-0 rounded object-cover"
          />
        ) : (
          <div className="h-12 w-8 flex-shrink-0 rounded bg-foreground/10" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{title}</p>
          <p className="text-xs text-foreground/50">{voteAverage.toFixed(1)} / 10</p>
        </div>
      </Link>
    </li>
  );
}

function SkeletonList() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-2">
          <div className="h-12 w-8 animate-pulse rounded bg-foreground/10" />
          <div className="flex flex-col gap-1">
            <div className="h-3 w-28 animate-pulse rounded bg-foreground/10" />
            <div className="h-2.5 w-14 animate-pulse rounded bg-foreground/10" />
          </div>
        </div>
      ))}
    </div>
  );
}
