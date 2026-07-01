import { Suspense } from 'react';
import HomeMediaCardSkeleton from '@/components/features/media/MediaCardSkeleton';
import MediaCardServer from '@/components/features/media/MediaCardServer';
import VideoEmbed from '@/components/features/watch/MediaEmbed';
import TVShowDetails from '@/components/features/watch/TVSeasons';
import WatchPageDetails from '@/components/features/watch/WatchPageDetails';
import WatchPageWrapper from '@/components/features/watch/WatchPageWrapper';
import VideoContextSetter from '@/hooks/VideoContextSetter';
import { getCurrentUser, getPlaybackPosition } from '@/lib/db/queries';
import { getCachedMediaDetails, getCachedEpisodeDetails } from '@/lib/tmdb/cachedFetchers';

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

interface WatchTvBodyProps {
  media_type: string;
  media_id: number;
  season_number: number;
  episode_number: number;
  // When true, this body is rendered inside the @watch intercepting overlay (so
  // minimize/close pop the overlay via router.back() instead of pushing '/').
  isOverlay?: boolean;
}

/**
 * Shared TV-episode watch-page body. Rendered by BOTH the real route
 * (`/protected/watch/tv/[id]/[s]/[e]`) and the intercepting overlay slot, so the
 * two never drift. The only difference is the wrapper around it (normal flow vs
 * the fullscreen <WatchOverlay/>) and the `isOverlay` flag threaded to the player.
 */
export default async function WatchTvBody({
  media_type,
  media_id,
  season_number,
  episode_number,
  isOverlay = false,
}: WatchTvBodyProps) {
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

  // Fetch playback position for resume support (e.g. Videasy's ?progress= param)
  const playbackPosition = user
    ? await getPlaybackPosition(user.id, media_type, media_id, season_number, episode_number)
    : null;

  return (
    <>
      <VideoContextSetter
        media_type={media_type}
        media_id={media_id}
        season_number={season_number}
        episode_number={episode_number}
        resumePosition={playbackPosition ?? undefined}
        title={`${media.name} · S${season_number} E${episode_number}`}
        isOverlay={isOverlay}
      />
      <WatchPageWrapper>
        <VideoEmbed />
        <div className="watch-content-in flex flex-col md:w-full">
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
          <section
            className="watch-content-in flex flex-col gap-2 md:mt-0"
            style={{ animationDelay: '80ms' }}
          >
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
                user_id={user?.id.toString() ?? ''}
                is_premium={user?.premium ?? false}
                tvDetails={media}
                current_episode_number={episode_number}
              />
            )}
          </section>
        </Suspense>
      </WatchPageWrapper>
    </>
  );
}
