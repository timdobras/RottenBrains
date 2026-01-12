export const fetchHomePageData = async ({
  pageParam = 1,
  userId,
  movieGenres,
  tvGenres,
}: {
  pageParam?: number;
  userId?: string;
  movieGenres?: { genre_code: string }[];
  tvGenres?: { genre_code: string }[];
}) => {
  const params = new URLSearchParams();
  params.append('page', pageParam.toString());
  if (userId) {
    params.append('userId', userId);
  }
  if (movieGenres) {
    params.append('movieGenres', JSON.stringify(movieGenres));
  }
  if (tvGenres) {
    params.append('tvGenres', JSON.stringify(tvGenres));
  }

  const response = await fetch(`/api/home-infinite-scroll?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch home page data');
  }
  const results = await response.json();
  return {
    results,
    nextPage: results.length > 0 ? pageParam + 1 : undefined,
  };
};
