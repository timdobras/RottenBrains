import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import DiscoverPage from '@/components/features/discover/DiscoverPage';

interface ExplorePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ searchParams }: ExplorePageProps): Promise<Metadata> {
  const params = await searchParams;
  const type = params.type;

  if (type === 'tv') {
    return {
      title: 'Discover TV Shows - RottenBrains',
      description: 'Discover TV shows with advanced filters and sorting options.',
    };
  }

  if (type === 'movie') {
    return {
      title: 'Discover Movies - RottenBrains',
      description: 'Discover movies with advanced filters and sorting options.',
    };
  }

  return {
    title: 'Discover - RottenBrains',
    description: 'Discover movies and TV shows with advanced filters and sorting options.',
  };
}

/**
 * The Discover/Explore page.
 * Uses URL search params for all filter state, wrapped in Suspense
 * because useSearchParams requires it in Next.js 15.
 */
export default function ExplorePage() {
  return (
    <Suspense
      fallback={
        <div className="w-full px-4 md:px-8">
          <div className="flex gap-8">
            {/* Sidebar skeleton */}
            <aside className="hidden w-[280px] shrink-0 md:block">
              <div className="space-y-4 pt-4">
                <div className="h-8 w-32 animate-pulse rounded bg-foreground/10" />
                <div className="h-12 w-full animate-pulse rounded-lg bg-foreground/10" />
                <div className="h-40 w-full animate-pulse rounded-lg bg-foreground/10" />
                <div className="h-24 w-full animate-pulse rounded-lg bg-foreground/10" />
                <div className="h-24 w-full animate-pulse rounded-lg bg-foreground/10" />
              </div>
            </aside>
            {/* Content skeleton */}
            <main className="min-w-0 flex-1">
              <div className="mb-6 mt-4 h-8 w-48 animate-pulse rounded bg-foreground/10" />
              <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-4">
                    <div className="aspect-[16/9] w-full animate-pulse rounded-lg bg-foreground/10" />
                    <div className="h-5 w-2/3 animate-pulse rounded bg-foreground/10" />
                    <div className="h-4 w-1/3 animate-pulse rounded bg-foreground/10" />
                  </div>
                ))}
              </div>
            </main>
          </div>
        </div>
      }
    >
      <DiscoverPage />
    </Suspense>
  );
}
