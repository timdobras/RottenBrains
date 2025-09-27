export function getImageUrlFromMediaDetails(media: any) {
  const imageUrl =
    media?.images?.backdrops?.[0]?.file_path ||
    (media.season_number && media.episode_number
      ? media.still_path
      : media.backdrop_path);
  return imageUrl;
}
