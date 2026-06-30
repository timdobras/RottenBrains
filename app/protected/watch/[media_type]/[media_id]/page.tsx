import WatchMovieBody from '@/components/features/watch/WatchMovieBody';
import { getCachedMediaDetails } from '@/lib/tmdb/cachedFetchers';
import { logger } from '@/lib/logger';

type Params = Promise<{ media_id: string; media_type: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const rawParams = await params;
  const media_id = Number(rawParams.media_id);
  const media_type = rawParams.media_type;

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
    title: `Watch ${media.title || media.name} Online Free HD | Rotten Brains`,
    description: `Stream ${media.title || media.name} now on Rotten Brains for free in HD. ${
      media.overview
    } Enjoy watching and sharing with friends today!`,
  };
}

export default async function mediaPage({ params }: { params: Params }) {
  const rawParams = await params;
  const media_type = rawParams.media_type;
  const media_id = Number(rawParams.media_id);

  // Full (hard-loaded / shared-link) movie watch page. The soft-nav overlay
  // variant renders the same body via app/@watch — see WatchMovieBody.
  return <WatchMovieBody media_type={media_type} media_id={media_id} />;
}
