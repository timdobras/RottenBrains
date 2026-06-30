import WatchTvBody from '@/components/features/watch/WatchTvBody';
import { getCachedMediaDetails } from '@/lib/tmdb/cachedFetchers';
import { logger } from '@/lib/logger';

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

  // Full (hard-loaded / shared-link) TV-episode watch page. The soft-nav overlay
  // variant renders the same body via app/@watch — see WatchTvBody.
  return (
    <WatchTvBody
      media_type={media_type}
      media_id={media_id}
      season_number={season_number}
      episode_number={episode_number}
    />
  );
}
