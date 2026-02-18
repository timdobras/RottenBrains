import { Suspense } from 'react';
import HomeMediaCardSkeleton from '@/components/features/media/MediaCardSkeleton';
import MediaCardServer from '@/components/features/media/MediaCardServer';
import VideoEmbed from '@/components/features/watch/MediaEmbed';
import TVShowDetails from '@/components/features/watch/TVSeasons';
import WatchDuration from '@/components/features/watch/WatchDuration';
import WatchPageDetails from '@/components/features/watch/WatchPageDetails';
import VideoContextSetter from '@/hooks/VideoContextSetter';
import { getCurrentUser } from '@/lib/supabase/serverQueries';
import { getCachedMediaDetails, getCachedEpisodeDetails } from '@/lib/tmdb/cachedFetchers';
import { logger } from '@/lib/logger';

// Skeleton for the episode list while it streams in
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
    // Use cached fetcher - deduplicated with page() call
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
    title: `Watch ${media.name} - S${season_number}E${episode_number} Online Free HD | Rotten Brains`,
    description: `Stream ${media.name} Season ${season_number} Episode ${episode_number} for free in HD on Rotten Brains. ${media.overview} Share and review with friends today!`,
  };
}

export default async function mediaPage({ params }: { params: Params }) {
  const rawParams = await params;
  const media_type = rawParams.media_type;
  const media_id = Number(rawParams.media_id);
  const season_number = Number(rawParams.season_number);
  const episode_number = Number(rawParams.episode_number);

  // Parallel fetch user, media, and episode data
  const [user, media, episode] = await Promise.all([
    getCurrentUser(),
    getCachedMediaDetails(media_type, media_id),
    getCachedEpisodeDetails(media_id, season_number, episode_number),
  ]);

  if (!media) {
    return <div>NO MEDIA FOUND</div>;
  }

  // Compute next episode (depends on media data)
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
      // Next episode in the same season
      nextEpisode = await getCachedEpisodeDetails(media.id, season_number, episode_number + 1);
    } else if (currentSeasonIndex + 1 < seasons.length) {
      // First episode of the next season
      const nextSeasonNumber = seasons[currentSeasonIndex + 1].season_number;
      nextEpisode = await getCachedEpisodeDetails(media.id, nextSeasonNumber, 1);
    }
  }

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
          media_duration={episode.runtime || 45}
        />
      )}
      <div className="relative mx-auto mb-16 w-full max-w-7xl">
        <div className={`small-screen-watch-margin mx-auto flex w-full flex-col md:gap-4`}>
          <div className="flex flex-col md:w-full md:gap-4">
            <VideoEmbed />
            <WatchPageDetails
              media={media}
              media_type="tv"
              media_id={media.id}
              season_number={season_number}
              episode_number={episode_number}
              episode={episode}
            ></WatchPageDetails>
          </div>
          <Suspense fallback={<EpisodeListSkeleton />}>
            <section className="flex flex-col gap-2 md:mt-0">
              {nextEpisode && (
                <div className="flex flex-col gap-2 px-4 md:rounded-[8px] md:p-0 md:px-0">
                  <MediaCardServer
                    media_type={'tv'}
                    media_id={media.id}
                    season_number={nextEpisode.season_number}
                    episode_number={nextEpisode.episode_number}
                    user_id={user?.id.toString()}
                    rounded={true}
                    disableTrailer={true}
                  />
                </div>
              )}
              {media_type === 'tv' && season_number && (
                <TVShowDetails
                  tv_show_id={media_id}
                  season_number={season_number}
                  user_id={user?.id.toString()}
                  is_premium={user?.premium}
                  tvDetails={media}
                />
              )}
            </section>
          </Suspense>
        </div>
      </div>
    </>
  );
}
