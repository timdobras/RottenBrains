import { getBackdropPath } from '@/lib/utils';

export function getImageUrlFromMediaDetails(media: any) {
  const imageUrl =
    getBackdropPath(media) ||
    (media.season_number && media.episode_number ? media.still_path : media.backdrop_path);
  return imageUrl;
}
