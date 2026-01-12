import ScrollButtons from '@/components/common/ScrollButtons';
import FixedAd from '@/components/features/ads/300x250Ad';
import MobileBannerPem from '@/components/features/ads/Fullscreen';
import AdBanner from '@/components/features/ads/GoogleDisplayAd';
import MobileBannerExoAlt from '@/components/features/ads/Message';
import MobileBannerExo from '@/components/features/ads/MobileBannerExo';
import NativeAd from '@/components/features/ads/Native';
import NavAdMobile from '@/components/features/ads/NavAdMobile';
import MobileBannerExo42 from '@/components/features/ads/Notification';
import VideoAd from '@/components/features/ads/Video';
import MediaCardServer from '@/components/features/media/MediaCardServer';
import MediaCardSmall from '@/components/features/media/MediaCardSmall';
import VideoEmbed from '@/components/features/watch/MediaEmbed';
import TVShowDetails from '@/components/features/watch/TVSeasons';
import WatchDuration from '@/components/features/watch/WatchDuration';
import WatchPageDetails from '@/components/features/watch/WatchPageDetails';
import VideoContextSetter from '@/hooks/VideoContextSetter';
import { getCurrentUser } from '@/lib/supabase/serverQueries';
import { getCachedMediaDetails, getCachedEpisodeDetails } from '@/lib/tmdb/cachedFetchers';
import { logger } from '@/lib/logger';

type Params = Promise<{
  media_id: number;
  season_number: number;
  episode_number: number;
  media_type: string;
}>;

export async function generateMetadata({ params }: { params: Params }) {
  const { media_id, media_type, season_number, episode_number } = await params;

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
  const { media_id, media_type, season_number, episode_number } = await params;

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
      (season: { season_number: number }) => season.season_number === Number(season_number)
    );

    const currentSeason = seasons[Number(currentSeasonIndex)];

    if (currentSeason && episode_number < currentSeason.episode_count) {
      // Next episode in the same season
      nextEpisode = await getCachedEpisodeDetails(media.id, season_number, Number(episode_number) + 1);
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
          media_id={Number(media_id)}
          season_number={Number(season_number)}
          episode_number={Number(episode_number)}
          user_id={user.id}
          media_duration={episode.runtime || 100}
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
                />
              </div>
            )}
            {media_type === 'tv' && season_number && (
              <TVShowDetails
                tv_show_id={media_id}
                season_number={season_number}
                user_id={user?.id.toString()}
                is_premium={user?.premium}
              />
            )}
          </section>
        </div>
      </div>
    </>
  );
}
