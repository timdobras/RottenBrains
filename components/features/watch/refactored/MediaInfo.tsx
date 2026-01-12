import { formatEpisodeCode, getRelativeTime } from '@/lib/utils';
import ToggleClamp from '../../posts/ToggleClamp';

interface MediaInfoProps {
  media: {
    name?: string;
    title?: string;
    overview: string;
    release_date: string;
    first_air_date?: string;
  };
  media_type: string;
  episode?: {
    name: string;
    air_date: string;
    overview: string;
  };
  season_number?: number;
  episode_number?: number;
  onClick?: () => void;
  isDesktop: boolean;
}

const MediaInfo: React.FC<MediaInfoProps> = ({
  media,
  media_type,
  episode,
  season_number,
  episode_number,
  onClick,
  isDesktop,
}) => {
  const media_release_date =
    media_type === 'movie'
      ? media.release_date
        ? media.release_date.slice(0, 4)
        : '0'
      : episode?.air_date
        ? episode.air_date
        : '0';

  const media_overview = media_type === 'movie' ? media.overview : episode?.overview;

  return (
    <div className="flex flex-col gap-1">
      <div
        className={`flex flex-col gap-2 ${!isDesktop ? 'cursor-pointer' : ''}`}
        onClick={onClick}
      >
        <h2 className="text-lg font-semibold">
          {episode && season_number && episode_number
            ? `${episode.name} | ${
                formatEpisodeCode ? formatEpisodeCode(season_number, episode_number) : ''
              } | ${media.name || media.title}`
            : `${media.title || media.name}`}
        </h2>
        <div className="flex flex-row items-center gap-2">
          {!isDesktop && (
            <img
              src="/assets/icons/calendar-outline.svg"
              alt=""
              className="invert-on-dark h-5 w-5 opacity-60"
            />
          )}
          <p className="text-xs text-foreground/60">
            {getRelativeTime(media_release_date)}
            {!isDesktop && <span className="ml-2 font-medium text-foreground">...more</span>}
          </p>
        </div>
      </div>
      {isDesktop && media_overview && (
        <p className="line-clamp-2 text-sm text-foreground/50">{media_overview}</p>
      )}
      {!isDesktop && media_overview && <ToggleClamp text={media_overview} />}
    </div>
  );
};

export default MediaInfo;
