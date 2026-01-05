import ActionButtons from './ActionButtons';
import MediaCard from './MediaCard';
import MediaInfo from './MediaInfo';

interface Genre {
  id: number;
  name: string;
}

interface Media {
  id: number;
  name?: string;
  title?: string;
  overview: string;
  genres: Genre[];
  release_date: string;
  first_air_date?: string;
  poster_path: string;
}

interface WatchPageDetailsDesktopProps {
  media: Media;
  media_type: string;
  media_id: number;
  episode?: {
    name: string;
    air_date: string;
    overview: string;
  };
  season_number?: number;
  episode_number?: number;
}

const WatchPageDetailsDesktop: React.FC<WatchPageDetailsDesktopProps> = ({
  media,
  media_type,
  media_id,
  episode,
  season_number,
  episode_number,
}) => {
  return (
    <section className="mx-auto hidden w-full flex-col gap-4 rounded-[8px] p-4 md:flex md:p-0">
      <MediaInfo
        media={media}
        media_type={media_type}
        episode={episode}
        season_number={season_number}
        episode_number={episode_number}
        isDesktop={true}
      />
      <ActionButtons media_type={media_type} media_id={media_id} />
      <MediaCard media={media} media_type={media_type} />
    </section>
  );
};

export default WatchPageDetailsDesktop;
