import VideoEmbed from '@/components/features/watch/MediaEmbed';
import RecommendationsSection from '@/components/features/watch/RecommendationsSection';
import WatchPageDetails from '@/components/features/watch/WatchPageDetails';
import WatchPageWrapper from '@/components/features/watch/WatchPageWrapper';
import VideoContextSetter from '@/hooks/VideoContextSetter';
import { getCurrentUser, getPlaybackPosition } from '@/lib/db/queries';
import { getCachedMediaDetails } from '@/lib/tmdb/cachedFetchers';

interface WatchMovieBodyProps {
  media_type: string;
  media_id: number;
  // When true, this body is rendered inside the @watch intercepting overlay (so
  // minimize/close pop the overlay via router.back() instead of pushing '/').
  isOverlay?: boolean;
}

/**
 * Shared movie watch-page body. Rendered by BOTH the real route
 * (`/protected/watch/movie/[id]`) and the intercepting overlay slot, so the two
 * never drift. The only difference is the wrapper around it (normal flow vs the
 * fullscreen <WatchOverlay/>) and the `isOverlay` flag threaded to the player.
 */
export default async function WatchMovieBody({
  media_type,
  media_id,
  isOverlay = false,
}: WatchMovieBodyProps) {
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
        isOverlay={isOverlay}
      />
      <WatchPageWrapper>
        <VideoEmbed />
        <div className="watch-content-in flex flex-col md:w-full">
          <WatchPageDetails media={media} media_type={media_type} media_id={media_id} />
        </div>
        <div className="watch-content-in" style={{ animationDelay: '80ms' }}>
          <RecommendationsSection mediaType={media_type} mediaId={media_id} userId={user?.id} />
        </div>
      </WatchPageWrapper>
    </>
  );
}
