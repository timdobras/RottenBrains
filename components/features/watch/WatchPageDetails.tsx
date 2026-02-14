import WatchPageDetailsDesktop from './refactored/WatchPageDetailsDesktop';
import WatchPageDetailsMobile from './refactored/WatchPageDetailsMobile';

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

interface WatchPageDetailsProps {
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

// Render both mobile and desktop variants, use CSS to show/hide.
// This eliminates the useIsMobile hook which causes layout shift
// (initializes as false, then flips to true on mobile).
// Desktop component already has `hidden md:flex`, mobile has `md:hidden`.
const WatchPageDetails: React.FC<WatchPageDetailsProps> = (props) => {
  return (
    <>
      <WatchPageDetailsMobile {...props} />
      <WatchPageDetailsDesktop {...props} />
    </>
  );
};

export default WatchPageDetails;
