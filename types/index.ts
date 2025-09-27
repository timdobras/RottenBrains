export type IMedia = {
  id: number;
  created_at: string;
  creator: string;
  rating: number;
  title: string;
  name: string;
  vote_average: number;
  poster_path: string;
  overview: string;
  release_date: string;
  media_type: "movie" | "tv" | string;
  first_air_date: string;
};

export interface FilterProps {
  name: string;
}

export type IUser = {
  id: number;
  name: string;
  username: string;
  email: string;
  image_url: string;
  postsId: Array<number>;
  likes: Array<string>;
  saves: Array<string>;
  backdrop_url: string;
  feed_genres: any[];
  premium: boolean;
};
export type IPost = {
  id: number;
  created_at: string;
  media_id: number;
  media_type: string;
  vote_user: number;
  review_user: string;
  creatorId: number;
  comments: Array<string>;
  likes: Array<string>;
  saves: Array<string>;
};

export type INavLink = {
  imgURL: string;
  route: string;
  label: string;
};
export type ExploreTabProps = {
  action:
    | "Now_in_cinemas"
    | "Trending_TV"
    | "Popular_Today"
    | "Airing_Today"
    | "Trending_Movies";
};
export type MediaPageProps = {
  media_type: "movie" | "tv" | string;
  media_id: number;
};

export interface FeedGenre {
  genre_code: string;
  media_type: "movie" | "tv";
}

declare global {
  interface Window {
    handleCredentialResponse: (response: any) => void;
  }
}
