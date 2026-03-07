import Link from 'next/link';
import { getSeasonDetails, getTVDetails, getEpisodeDetails } from '@/lib/tmdb';
import { getBatchWatchTimes, watchTimeKey } from '@/lib/supabase/serverQueries';
import MediaCardUI from '../media/MediaCardUI';
import EpisodeScrollAnchor from './EpisodeScrollAnchor';

type TVShowDetailsProps = {
  tv_show_id: number;
  season_number: number;
  user_id: string;
  is_premium: boolean;
  /** Pre-fetched TV details from parent to avoid redundant getTVDetails call */
  tvDetails?: any;
  /** Currently playing episode number — used to highlight and auto-scroll */
  current_episode_number?: number;
};

const TVShowDetails = async ({
  tv_show_id,
  season_number,
  user_id,
  is_premium = false,
  tvDetails,
  current_episode_number,
}: TVShowDetailsProps) => {
  // Use pre-fetched TV details if available, otherwise fetch.
  // Season details always need fetching since parent doesn't have them.
  const [tvShowData, seasonData] = await Promise.all([
    tvDetails ? Promise.resolve(tvDetails) : getTVDetails(tv_show_id),
    getSeasonDetails(tv_show_id, season_number),
  ]);
  const filteredSeasons = tvShowData.seasons.filter((season: any) => season.season_number !== 0);

  const selectedSeason =
    filteredSeasons.find((season: any) => season.season_number === Number(season_number)) ||
    filteredSeasons[0];
  const episodes = seasonData.episodes;

  // Batch fetch watch times for ALL episodes in one RPC call instead of N individual calls
  const watchTimeItems = episodes.map((ep: any) => ({
    media_type: 'tv',
    media_id: tv_show_id,
    season_number: selectedSeason.season_number,
    episode_number: ep.episode_number,
  }));

  const watchTimeMap = user_id
    ? await getBatchWatchTimes(user_id, watchTimeItems)
    : new Map<string, number>();

  return (
    <div className="w-full">
      <div
        className={`${is_premium ? 'small-screen-watch-top-premium' : 'small-screen-watch-top'} sticky z-20 bg-background md:z-auto`}
      >
        <div className="gradient-edge absolute right-0 top-0 z-20 h-full w-[10%]" />
        <div className="custom-scrollbar 0 flex gap-2 overflow-x-auto px-2 py-2 text-sm md:px-0">
          {filteredSeasons.map((season: any) => (
            <Link
              key={season.season_number}
              href={`/protected/watch/tv/${tv_show_id}/${season.season_number}/1`}
              className={`z-10 flex flex-row items-center gap-2 whitespace-nowrap rounded-full bg-foreground/10 px-4 py-1 text-foreground drop-shadow-lg hover:scale-105 ${
                season.season_number === selectedSeason.season_number
                  ? 'border-2 border-foreground/20'
                  : ''
              }`}
            >
              {season.name}
            </Link>
          ))}
        </div>
      </div>
      <div className="mt-2 w-full px-4 md:px-0">
        <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-8 md:gap-4">
          {episodes.map((episode: any) => {
            // Use composite key for batch-fetched watch time
            const key = `tv-${tv_show_id}-${selectedSeason.season_number}-${episode.episode_number}`;
            const watchTime = watchTimeMap.get(key) || 0;
            const isCurrent = episode.episode_number === current_episode_number;

            return (
              <div key={episode.id} className="relative">
                {isCurrent && (
                  <>
                    <EpisodeScrollAnchor />
                    <span className="absolute -top-2 left-3 z-10 rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-white">
                      Now Playing
                    </span>
                  </>
                )}
                <MediaCardUI
                  media={episode}
                  media_type="tv"
                  media_id={tv_show_id}
                  season_number={selectedSeason.season_number}
                  episode_number={episode.episode_number}
                  watch_time={watchTime}
                  user_id={user_id}
                  rounded={true}
                  disableTrailer={true}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TVShowDetails;
