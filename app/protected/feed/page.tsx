import type { Metadata } from 'next';
import FeedList from '@/components/features/feed/FeedList';
import FeedFollowing from '@/components/features/feed/FeedFollowing';
import FeedTrending from '@/components/features/feed/FeedTrending';

export const metadata: Metadata = {
  title: 'Feed - RottenBrains',
};

export default function FeedPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl gap-8 px-4 py-4">
      {/* Left sidebar - Following */}
      <aside className="hidden w-64 flex-shrink-0 lg:block">
        <FeedFollowing />
      </aside>

      {/* Center - Feed */}
      <div className="min-w-0 flex-1">
        <FeedList />
      </div>

      {/* Right sidebar - Trending */}
      <aside className="hidden w-64 flex-shrink-0 xl:block">
        <FeedTrending />
      </aside>
    </main>
  );
}
