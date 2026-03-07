import VideoEmbed from '@/components/features/watch/MediaEmbed';
import RecommendationsSection from '@/components/features/watch/RecommendationsSection';
import WatchDuration from '@/components/features/watch/WatchDuration';
import ProviderDropdown from '@/components/features/watch/ProviderDropdown';
import ShareButton from '@/components/features/watch/ShareButton';
import VideoContextSetter from '@/hooks/VideoContextSetter';
import { getCurrentUser } from '@/lib/supabase/serverQueries';
import { getCachedMediaDetails } from '@/lib/tmdb/cachedFetchers';
import { transformRuntime } from '@/lib/utils';
import { logger } from '@/lib/logger';
import Link from 'next/link';
import TestNavbar from '../../../TestNavbar';

type Params = Promise<{ media_id: string; media_type: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const rawParams = await params;
  const media_id = Number(rawParams.media_id);
  const media_type = rawParams.media_type;

  let media;
  try {
    media = await getCachedMediaDetails(media_type, media_id);
  } catch (error) {
    logger.error('Error fetching media data:', error);
    media = null;
  }

  if (!media) {
    return {
      title: 'No Media Found',
      description: 'Connect with fellow enthusiasts and dive deep into your favorite media.',
    };
  }

  return {
    title: `Watch ${media.title || media.name} | Rotten Brains`,
    description: media.overview?.slice(0, 160),
  };
}

export default async function DesignWatchPage({ params }: { params: Params }) {
  const rawParams = await params;
  const media_type = rawParams.media_type;
  const media_id = Number(rawParams.media_id);

  const [user, media] = await Promise.all([
    getCurrentUser(),
    getCachedMediaDetails(media_type, media_id),
  ]);

  if (!media) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-foreground/60">No media found.</p>
      </div>
    );
  }

  const title = media.title || media.name;
  const year = (media.release_date || media.first_air_date)?.slice(0, 4);
  const runtime = media.runtime ? transformRuntime(media.runtime) : null;
  const genres = media.genres?.map((g: { id: number; name: string }) => g.name) || [];

  return (
    <>
      <TestNavbar />
      <VideoContextSetter media_type={media_type} media_id={media_id} />
      {user && (
        <WatchDuration
          media_type={media_type}
          media_id={media_id}
          media_duration={media.runtime || 120}
        />
      )}

      <div className="mx-auto w-full max-w-5xl pb-16 pt-14 md:pt-16">
        {/* Player */}
        <VideoEmbed />

        {/* Media Info */}
        <div className="flex flex-col gap-4 px-4 pt-4">
          {/* Title + Meta */}
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold md:text-2xl">{title}</h1>
            <div className="flex items-center gap-2 text-sm text-foreground/60">
              {year && <span>{year}</span>}
              {runtime && (
                <>
                  <span>·</span>
                  <span>{runtime}</span>
                </>
              )}
              {media.vote_average > 0 && (
                <>
                  <span>·</span>
                  <span>{media.vote_average.toFixed(1)} / 10</span>
                </>
              )}
            </div>
            {genres.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {genres.map((genre: string) => (
                  <span
                    key={genre}
                    className="rounded-full bg-foreground/10 px-3 py-0.5 text-xs text-foreground/70"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 text-sm">
            <ProviderDropdown />
            <ShareButton />
            <Link
              href={`/design/media/${media_type}/${media_id}`}
              className="rounded-full bg-foreground/10 px-4 py-1 text-foreground/70 hover:bg-foreground/20"
            >
              Details
            </Link>
          </div>

          {/* Overview */}
          {media.overview && (
            <p className="text-sm leading-relaxed text-foreground/70">{media.overview}</p>
          )}
        </div>

        {/* Recommendations */}
        <div className="mt-8 flex flex-col gap-4 px-4">
          <h2 className="text-lg font-semibold">Recommendations</h2>
          <RecommendationsSection mediaType={media_type} mediaId={media_id} userId={user?.id} />
        </div>
      </div>
    </>
  );
}
