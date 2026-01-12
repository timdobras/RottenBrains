'use client';

import useIsMobile from '@/hooks/useIsMobile';
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

const WatchPageDetails: React.FC<WatchPageDetailsProps> = (props) => {
  const isMobile = useIsMobile();

  return isMobile ? <WatchPageDetailsMobile {...props} /> : <WatchPageDetailsDesktop {...props} />;
};

export default WatchPageDetails;
