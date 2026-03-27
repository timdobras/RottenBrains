import VideoEmbed from '@/components/features/watch/MediaEmbed';
import RecommendationsSection from '@/components/features/watch/RecommendationsSection';
import WatchDuration from '@/components/features/watch/WatchDuration';
import WatchPageDetails from '@/components/features/watch/WatchPageDetails';
import WatchPageWrapper from '@/components/features/watch/WatchPageWrapper';
import VideoContextSetter from '@/hooks/VideoContextSetter';
import { getCurrentUser, getPlaybackPosition } from '@/lib/supabase/serverQueries';
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

  // Fetch playback position for resume support (e.g. Videasy's ?progress= param)
  const playbackPosition = user ? await getPlaybackPosition(user.id, media_type, media_id) : null;

  return (
    <>
      <VideoContextSetter
        media_type={media_type}
        media_id={media_id}
        resumePosition={playbackPosition ?? undefined}
      />
      {user && (
        <WatchDuration
          media_type={media_type}
          media_id={media_id}
          media_duration={media.runtime || 120}
        />
      )}
      <WatchPageWrapper>
        <VideoEmbed />
        <div className="flex flex-col md:w-full">
          <WatchPageDetails
            media={media}
            media_type={media_type}
            media_id={media_id}
          ></WatchPageDetails>
        </div>
        <RecommendationsSection mediaType={media_type} mediaId={media_id} userId={user?.id} />
      </WatchPageWrapper>
    </>
  );
}
