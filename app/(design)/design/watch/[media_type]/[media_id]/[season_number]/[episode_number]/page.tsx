import { Suspense } from 'react';
import HomeMediaCardSkeleton from '@/components/features/media/MediaCardSkeleton';
import MediaCardServer from '@/components/features/media/MediaCardServer';
import VideoEmbed from '@/components/features/watch/MediaEmbed';
import TVShowDetails from '@/components/features/watch/TVSeasons';
import WatchDuration from '@/components/features/watch/WatchDuration';
import ProviderDropdown from '@/components/features/watch/ProviderDropdown';
import ShareButton from '@/components/features/watch/ShareButton';
import VideoContextSetter from '@/hooks/VideoContextSetter';
import { getCurrentUser } from '@/lib/supabase/serverQueries';
import { getCachedMediaDetails, getCachedEpisodeDetails } from '@/lib/tmdb/cachedFetchers';
import { formatEpisodeCode } from '@/lib/utils';
import { logger } from '@/lib/logger';
import Link from 'next/link';

function EpisodeListSkeleton() {
  return (
    <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-8 px-4 md:gap-4 md:px-0">
      {Array.from({ length: 6 }).map((_, i) => (
        <HomeMediaCardSkeleton key={i} />
      ))}
    </div>
  );
}

type Params = Promise<{
  media_id: string;
  season_number: string;
  episode_number: string;
  media_type: string;
}>;

export async function generateMetadata({ params }: { params: Params }) {
  const rawParams = await params;
  const media_type = rawParams.media_type;
  const media_id = Number(rawParams.media_id);
  const season_number = Number(rawParams.season_number);
  const episode_number = Number(rawParams.episode_number);

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
    title: `Watch ${media.name} - S${season_number}E${episode_number} | Rotten Brains`,
    description: media.overview?.slice(0, 160),
  };
}

export default async function DesignWatchEpisodePage({ params }: { params: Params }) {
  const rawParams = await params;
  const media_type = rawParams.media_type;
  const media_id = Number(rawParams.media_id);
  const season_number = Number(rawParams.season_number);
  const episode_number = Number(rawParams.episode_number);

  const [user, media, episode] = await Promise.all([
    getCurrentUser(),
    getCachedMediaDetails(media_type, media_id),
    getCachedEpisodeDetails(media_id, season_number, episode_number),
  ]);

  if (!media) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-foreground/60">No media found.</p>
      </div>
    );
  }

  // Compute next episode
  let nextEpisode = null;
  if (media.seasons) {
    const seasons = media.seasons.filter(
      (season: { season_number: number }) => season.season_number !== 0
    );
    const currentSeasonIndex = seasons.findIndex(
      (season: { season_number: number }) => season.season_number === season_number
    );
    const currentSeason = seasons[currentSeasonIndex];

    if (currentSeason && episode_number < currentSeason.episode_count) {
      nextEpisode = await getCachedEpisodeDetails(media.id, season_number, episode_number + 1);
    } else if (currentSeasonIndex + 1 < seasons.length) {
      const nextSeasonNumber = seasons[currentSeasonIndex + 1].season_number;
      nextEpisode = await getCachedEpisodeDetails(media.id, nextSeasonNumber, 1);
    }
  }

  const showName = media.name;
  const episodeCode = formatEpisodeCode(season_number, episode_number);
  const episodeTitle = episode?.name;
  const episodeAirDate = episode?.air_date?.slice(0, 4);

  return (
    <>
      <VideoContextSetter
        media_type={media_type}
        media_id={media_id}
        season_number={season_number}
        episode_number={episode_number}
      />
      {user && (
        <WatchDuration
          media_type={media_type}
          media_id={media_id}
          season_number={season_number}
          episode_number={episode_number}
          media_duration={episode?.runtime || 45}
        />
      )}

      <div className="mx-auto w-full max-w-5xl pb-16">
        {/* Player */}
        <VideoEmbed />

        {/* Episode Info */}
        <div className="flex flex-col gap-4 px-4 pt-4">
          {/* Title + Meta */}
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold md:text-2xl">{showName}</h1>
            <div className="flex items-center gap-2 text-sm text-foreground/60">
              <span className="font-medium text-foreground/80">{episodeCode}</span>
              {episodeTitle && (
                <>
                  <span>·</span>
                  <span>{episodeTitle}</span>
                </>
              )}
              {episodeAirDate && (
                <>
                  <span>·</span>
                  <span>{episodeAirDate}</span>
                </>
              )}
            </div>
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
          {episode?.overview && (
            <p className="text-sm leading-relaxed text-foreground/70">{episode.overview}</p>
          )}
        </div>

        {/* Next Episode + Season List */}
        <Suspense fallback={<EpisodeListSkeleton />}>
          <div className="mt-8 flex flex-col gap-4">
            {nextEpisode && (
              <div className="px-4">
                <h2 className="mb-2 text-lg font-semibold">Next Episode</h2>
                <MediaCardServer
                  media_type="tv"
                  media_id={media.id}
                  season_number={nextEpisode.season_number}
                  episode_number={nextEpisode.episode_number}
                  user_id={user?.id?.toString()}
                  rounded={true}
                  disableTrailer={true}
                />
              </div>
            )}

            {media_type === 'tv' && (
              <div>
                <h2 className="mb-2 px-4 text-lg font-semibold">Episodes</h2>
                <TVShowDetails
                  tv_show_id={media_id}
                  season_number={season_number}
                  user_id={user?.id?.toString()}
                  is_premium={user?.premium}
                  tvDetails={media}
                />
              </div>
            )}
          </div>
        </Suspense>
      </div>
    </>
  );
}
