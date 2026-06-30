import WatchOverlay from '@/components/features/watch/WatchOverlay';
import WatchTvBody from '@/components/features/watch/WatchTvBody';

type Params = Promise<{
  media_id: string;
  season_number: string;
  episode_number: string;
  media_type: string;
}>;

/**
 * Intercepting overlay for a TV-EPISODE watch URL. Same model as the movie
 * overlay (see ../page.tsx): soft navigations render the episode as a fullscreen
 * overlay over the origin page; hard loads fall through to the real page.tsx.
 */
export default async function InterceptedTvWatch({ params }: { params: Params }) {
  const { media_type, media_id, season_number, episode_number } = await params;
  return (
    <WatchOverlay>
      <WatchTvBody
        media_type={media_type}
        media_id={Number(media_id)}
        season_number={Number(season_number)}
        episode_number={Number(episode_number)}
        isOverlay
      />
    </WatchOverlay>
  );
}
