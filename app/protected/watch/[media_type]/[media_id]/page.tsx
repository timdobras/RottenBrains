import Link from 'next/link';
import FixedAd from '@/components/features/ads/300x250Ad';
import MobileBannerPem from '@/components/features/ads/Fullscreen';
import AdBanner from '@/components/features/ads/GoogleDisplayAd';
import MobileBannerExoAlt from '@/components/features/ads/Message';
import MobileBannerExo from '@/components/features/ads/MobileBannerExo';
import NativeAd from '@/components/features/ads/Native';
import NavAdMobile from '@/components/features/ads/NavAdMobile';
import MobileBannerExo42 from '@/components/features/ads/Notification';
import VideoAd from '@/components/features/ads/Video';
import VideoEmbed from '@/components/features/watch/MediaEmbed';
import RecommendationsSection from '@/components/features/watch/RecommendationsSection';
import WatchDuration from '@/components/features/watch/WatchDuration';
import WatchPageDetails from '@/components/features/watch/WatchPageDetails';
import VideoContextSetter from '@/hooks/VideoContextSetter';
import { getCurrentUser } from '@/lib/supabase/serverQueries';
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

  // Parallel fetch user and media data
  const [user, media] = await Promise.all([
    getCurrentUser(),
    getCachedMediaDetails(media_type, media_id),
  ]);

  if (!media) {
    return <div>NO MEDIA FOUND</div>;
  }

  return (
    <>
      <VideoContextSetter media_type={media_type} media_id={media_id} />
      {user && (
        <WatchDuration
          media_type={media_type}
          media_id={media_id}
          media_duration={media.runtime || 120}
        />
      )}
      <div className="relative mx-auto mb-16 w-full max-w-7xl">
        <div className="small-screen-watch-margin mx-auto flex w-full flex-col md:gap-4">
          <div className="flex flex-col md:w-full md:gap-4">
            <VideoEmbed />
            <WatchPageDetails
              media={media}
              media_type={media_type}
              media_id={media_id}
            ></WatchPageDetails>
          </div>
          <RecommendationsSection mediaType={media_type} mediaId={media_id} userId={user?.id} />
        </div>
      </div>
    </>
  );
}
