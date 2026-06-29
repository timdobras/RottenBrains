CREATE TABLE public.comment_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  comment_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now()
); 

CREATE TABLE public.comments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  post_id uuid,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  parent_id uuid,
  total_likes bigint NOT NULL DEFAULT '0'::bigint
); 

CREATE TABLE public.dev_blog (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL,
  content text NOT NULL,
  images text[],
  features text[],
  tags text[],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  author_id uuid,
  thumbnail text
); 

CREATE TABLE public.follows (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  following_id uuid,
  created_at timestamp with time zone DEFAULT now()
); 

CREATE TABLE public.likes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  post_id uuid,
  created_at timestamp with time zone DEFAULT now()
); 

CREATE TABLE public.movie_genre_stats (
  "28" bigint NOT NULL DEFAULT '0'::bigint,
  user_id uuid NOT NULL,
  "12" bigint NOT NULL DEFAULT '0'::bigint,
  "16" bigint NOT NULL DEFAULT '0'::bigint,
  "35" bigint NOT NULL DEFAULT '0'::bigint,
  "80" bigint NOT NULL DEFAULT '0'::bigint,
  "99" bigint NOT NULL DEFAULT '0'::bigint,
  "18" bigint NOT NULL DEFAULT '0'::bigint,
  "10751" bigint NOT NULL DEFAULT '0'::bigint,
  "14" bigint NOT NULL DEFAULT '0'::bigint,
  "36" bigint NOT NULL DEFAULT '0'::bigint,
  "27" bigint NOT NULL DEFAULT '0'::bigint,
  "10402" bigint NOT NULL DEFAULT '0'::bigint,
  "9648" bigint NOT NULL DEFAULT '0'::bigint,
  "10749" bigint NOT NULL DEFAULT '0'::bigint,
  "878" bigint NOT NULL DEFAULT '0'::bigint,
  "10770" bigint NOT NULL DEFAULT '0'::bigint,
  "53" bigint NOT NULL DEFAULT '0'::bigint,
  "10752" bigint NOT NULL DEFAULT '0'::bigint,
  "37" bigint NOT NULL DEFAULT '0'::bigint,
  id uuid NOT NULL DEFAULT gen_random_uuid()
); 

CREATE TABLE public.new_episodes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tv_id bigint,
  last_air_date date,
  season_number integer,
  episode_number integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
); 

CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  recipient_id uuid NOT NULL,
  triggered_by uuid,
  type text NOT NULL,
  post_id uuid,
  comment_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  read boolean NOT NULL DEFAULT false,
  media_id integer,
  media_type text,
  season_number integer,
  episode_number integer
); 

CREATE TABLE public.posts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  creatorid uuid,
  review_user text,
  vote_user real,
  created_at timestamp with time zone DEFAULT now(),
  media_id integer,
  media_type text,
  total_likes bigint DEFAULT '0'::bigint,
  total_comments bigint NOT NULL DEFAULT '0'::bigint,
  season_number integer,
  image_path text
); 

CREATE TABLE public.saves (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  post_id uuid,
  created_at timestamp with time zone DEFAULT now()
); 

CREATE TABLE public.tv_genre_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  "10759" bigint NOT NULL DEFAULT '0'::bigint,
  "16" bigint NOT NULL DEFAULT '0'::bigint,
  "35" bigint NOT NULL DEFAULT '0'::bigint,
  "80" bigint NOT NULL DEFAULT '0'::bigint,
  "99" bigint NOT NULL DEFAULT '0'::bigint,
  "18" bigint NOT NULL DEFAULT '0'::bigint,
  "10751" bigint NOT NULL DEFAULT '0'::bigint,
  "10762" bigint NOT NULL DEFAULT '0'::bigint,
  "9648" bigint NOT NULL DEFAULT '0'::bigint,
  "10763" bigint NOT NULL DEFAULT '0'::bigint,
  "10764" bigint NOT NULL DEFAULT '0'::bigint,
  "10765" bigint NOT NULL DEFAULT '0'::bigint,
  "10766" bigint NOT NULL DEFAULT '0'::bigint,
  "10767" bigint NOT NULL DEFAULT '0'::bigint,
  "10768" bigint NOT NULL DEFAULT '0'::bigint,
  "37" bigint NOT NULL DEFAULT '0'::bigint
); 

CREATE TABLE public.user_ip_addresses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ip_address inet NOT NULL,
  label text,
  is_trusted boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
); 

CREATE TABLE public.user_jellyfin_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  server_url text NOT NULL,
  api_key text NOT NULL,
  jellyfin_user_id text NOT NULL,
  sync_enabled boolean NOT NULL DEFAULT true,
  webhook_secret text NOT NULL DEFAULT (gen_random_uuid())::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  jellyfin_username text
); 

CREATE TABLE public.users (
  id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  username text,
  name text,
  email text,
  image_url text,
  tmdb_id text,
  bio text DEFAULT 'Go to settings to change your Bio'::text,
  backdrop_url text DEFAULT 'https://w0.peakpx.com/wallpaper/939/963/HD-wallpaper-technology-error-404-not-found-black-white-minimalist.jpg'::text,
  feed_genres jsonb[],
  premium boolean NOT NULL DEFAULT false
); 

CREATE TABLE public.watch_history (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  media_type text NOT NULL,
  media_id integer NOT NULL,
  season_number integer,
  episode_number integer,
  created_at timestamp with time zone DEFAULT now(),
  time_spent integer,
  percentage_watched text,
  hidden_until timestamp with time zone,
  sync_source text NOT NULL DEFAULT 'app'::text,
  playback_position integer
); 

CREATE TABLE public.watch_list (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid,
  media_type text,
  media_id bigint,
  watch_list_type text
); 

