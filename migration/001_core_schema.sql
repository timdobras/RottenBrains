-- =====================================================================
-- RottenBrains: self-hosted Postgres core schema (P1)
-- Generated from Supabase project ketxnamtpbvfvblowfoo on 2026-06-29.
-- RLS not recreated (app-layer auth). users.id->auth FK dropped; 3 FKs retargeted
-- auth.users->users. on_auth_user_created trigger dropped (Better Auth owns creation).
-- Better Auth tables added by 002_better_auth.sql.
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ============================================================
-- TABLES
-- ============================================================
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



-- ============================================================
-- FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION public.add_to_watch_list(p_user_id uuid, p_media_type text, p_media_id bigint, p_watch_list_type text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    existing_entry INTEGER;
BEGIN
    -- Check if the combination of user_id, media_type, media_id, and watch_list_type already exists
    SELECT COUNT(*) INTO existing_entry
    FROM watch_list
    WHERE user_id = p_user_id
      AND media_type = p_media_type
      AND media_id = p_media_id
      AND watch_list_type = p_watch_list_type;
    
    -- If it exists, return an error message
    IF existing_entry > 0 THEN
        RETURN 'Error: Entry already exists in the watch_list.';
    ELSE
        -- If it doesn't exist, insert the new entry
        INSERT INTO watch_list (user_id, media_type, media_id, watch_list_type)
        VALUES (p_user_id, p_media_type, p_media_id, p_watch_list_type);
        
        RETURN 'Success: Entry added to the watch_list.';
    END IF;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.check_watch_history_exists(p_user_id uuid, p_media_type text, p_media_id integer, p_season_number integer DEFAULT NULL::integer, p_episode_number integer DEFAULT NULL::integer)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM watch_history
        WHERE user_id = p_user_id
          AND media_type = p_media_type
          AND media_id = p_media_id
          AND (season_number = p_season_number OR p_season_number IS NULL)
          AND (episode_number = p_episode_number OR p_episode_number IS NULL)
    );
END;
$function$
;
CREATE OR REPLACE FUNCTION public.decrement_comment_likes(p_comment_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  update public.comments set total_likes = greatest(total_likes - 1, 0) where id = p_comment_id;
$function$
;
CREATE OR REPLACE FUNCTION public.decrement_comments(post_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE posts
  SET total_comments = total_comments - 1
  WHERE id = post_id;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.decrement_likes(post_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN; -- no-op: total_likes maintained by trg_likes_count
END;
$function$
;
CREATE OR REPLACE FUNCTION public.fetch_comments_by_post_id(p_post_id uuid, current_user_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(json_build_object(
        'id', c.id,
        'user_id', c.user_id,
        'post_id', c.post_id,
        'content', c.content,
        'created_at', c.created_at,
        'parent_id', c.parent_id,
        'total_likes', c.total_likes,
        'commenter', json_build_object(
            'id', u.id,
            'username', u.username,
            'name', u.name,
            'email', u.email,
            'image_url', u.image_url
        ),
        'replies', (
            SELECT json_agg(json_build_object(
                'id', r.id,
                'user_id', r.user_id,
                'post_id', r.post_id,
                'content', r.content,
                'created_at', r.created_at,
                'parent_id', r.parent_id,
                'total_likes', r.total_likes,
                'commenter', json_build_object(
                    'id', ru.id,
                    'username', ru.username,
                    'name', ru.name,
                    'email', ru.email,
                    'image_url', ru.image_url
                )
            ) ORDER BY r.created_at DESC)
            FROM comments r
            JOIN users ru ON r.user_id = ru.id
            WHERE r.parent_id = c.id
        )
    ) ORDER BY c.created_at DESC)
    INTO result
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.post_id = p_post_id AND c.parent_id IS NULL;

    RETURN result;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.fetch_post_by_id(p_post_id uuid, current_user_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    result JSON;
BEGIN
    SELECT
        json_build_object(
            'post', json_build_object(
                'id', p.id,
                'review_user', p.review_user,
                'vote_user', p.vote_user,
                'created_at', p.created_at,
                'media_id', p.media_id,
                'media_type', p.media_type,
                'total_likes', p.total_likes,
                'total_comments', p.total_comments
            ),
            'creator', json_build_object(
                'id', u.id,
                'username', u.username,
                'name', u.name,
                'email', u.email,
                'image_url', u.image_url,
                'tmdb_id', u.tmdb_id
            ),
            'current_user', json_build_object(
                'has_liked', (l.user_id IS NOT NULL),
                'has_saved', (s.user_id IS NOT NULL)
            )
        )
    INTO result
    FROM posts p
    JOIN users u
      ON p.creatorid = u.id
    LEFT JOIN likes l
      ON p.id = l.post_id
     AND l.user_id = current_user_id
    LEFT JOIN saves s
      ON p.id = s.post_id
     AND s.user_id = current_user_id
    WHERE p.id = p_post_id;

    RETURN result;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.fetch_post_with_comments_by_id(p_post_id uuid, current_user_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    result JSON;
BEGIN
    -- Fetch the post data, creator, and user-specific data (likes and saves)
    SELECT
        json_build_object(
            'post', json_build_object(
                'id', p.id,
                'review_user', p.review_user,
                'vote_user', p.vote_user,
                'created_at', p.created_at,
                'media_id', p.media_id,
                'media_type', p.media_type,
                'total_likes', p.total_likes,
                'total_comments', p.total_comments
            ),
            'creator', json_build_object(
                'id', u.id,
                'username', u.username,
                'name', u.name,
                'email', u.email,
                'image_url', u.image_url,
                'tmdb_id', u.tmdb_id
            ),
            'current_user', json_build_object(
                'has_liked', (l.user_id IS NOT NULL),
                'has_saved', (s.user_id IS NOT NULL)
            ),
            'comments', (
                WITH RECURSIVE comment_tree AS (
                    -- Start with top-level comments
                    SELECT
                        c.id,
                        c.user_id,
                        c.post_id,
                        c.content,
                        c.created_at,
                        c.parent_id,
                        c.total_likes,
                        u.id AS commenter_id,
                        u.username AS commenter_username,
                        u.name AS commenter_name,
                        u.email AS commenter_email,
                        u.image_url AS commenter_image_url,
                        ARRAY[]::uuid[] AS path
                    FROM comments c
                    JOIN users u ON c.user_id = u.id
                    WHERE c.post_id = p_post_id
                      AND c.parent_id IS NULL

                    UNION ALL

                    -- Recursively fetch replies
                    SELECT
                        c.id,
                        c.user_id,
                        c.post_id,
                        c.content,
                        c.created_at,
                        c.parent_id,
                        c.total_likes,
                        u.id AS commenter_id,
                        u.username AS commenter_username,
                        u.name AS commenter_name,
                        u.email AS commenter_email,
                        u.image_url AS commenter_image_url,
                        ct.path || c.parent_id
                    FROM comments c
                    JOIN users u ON c.user_id = u.id
                    JOIN comment_tree ct ON c.parent_id = ct.id
                )
                -- Select all comments sorted by newest first
                SELECT json_agg(json_build_object(
                    'id', ct.id,
                    'user_id', ct.user_id,
                    'post_id', ct.post_id,
                    'content', ct.content,
                    'created_at', ct.created_at,
                    'parent_id', ct.parent_id,
                    'total_likes', ct.total_likes,
                    'commenter', json_build_object(
                        'id', ct.commenter_id,
                        'username', ct.commenter_username,
                        'name', ct.commenter_name,
                        'email', ct.commenter_email,
                        'image_url', ct.commenter_image_url
                    ),
                    'replies', (
                        SELECT json_agg(json_build_object(
                            'id', r.id,
                            'user_id', r.user_id,
                            'post_id', r.post_id,
                            'content', r.content,
                            'created_at', r.created_at,
                            'parent_id', r.parent_id,
                            'total_likes', r.total_likes,
                            'commenter', json_build_object(
                                'id', r.commenter_id,
                                'username', r.commenter_username,
                                'name', r.commenter_name,
                                'email', r.commenter_email,
                                'image_url', r.commenter_image_url
                            )
                        ) ORDER BY r.created_at DESC) -- Sort replies by newest first
                        FROM comment_tree r
                        WHERE r.parent_id = ct.id
                    )
                ) ORDER BY ct.created_at DESC) -- Sort top-level comments by newest first
                FROM comment_tree ct
                WHERE ct.parent_id IS NULL
            )
        )
    INTO result
    FROM posts p
    JOIN users u ON p.creatorid = u.id
    LEFT JOIN likes l ON p.id = l.post_id AND l.user_id = current_user_id
    LEFT JOIN saves s ON p.id = s.post_id AND s.user_id = current_user_id
    WHERE p.id = p_post_id;

    RETURN result;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.fetch_posts_by_media(current_user_id uuid, media_type_param text, media_id_param integer, result_limit integer, result_offset integer)
 RETURNS TABLE(post_id uuid, creatorid uuid, creator_username text, creator_name text, creator_email text, creator_image_url text, creator_tmdb_id text, review_user text, vote_user real, created_at timestamp with time zone, media_id integer, media_type text, total_likes bigint, total_comments bigint, has_liked boolean, has_saved boolean)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        p.id AS post_id,
        p.creatorid,
        u.username AS creator_username,
        u.name AS creator_name,
        u.email AS creator_email,
        u.image_url AS creator_image_url,
        u.tmdb_id AS creator_tmdb_id,
        p.review_user,
        p.vote_user,
        p.created_at,
        p.media_id AS media_id,
        p.media_type AS media_type,
        p.total_likes,
        p.total_comments,
        CASE 
            WHEN l.user_id IS NOT NULL THEN TRUE 
            ELSE FALSE 
        END AS has_liked,
        CASE 
            WHEN s.user_id IS NOT NULL THEN TRUE 
            ELSE FALSE 
        END AS has_saved
    FROM 
        posts p
    INNER JOIN 
        users u ON p.creatorid = u.id
    LEFT JOIN 
        likes l ON p.id = l.post_id AND l.user_id = current_user_id
    LEFT JOIN 
        saves s ON p.id = s.post_id AND s.user_id = current_user_id
    WHERE 
        p.media_type = media_type_param AND p.media_id = media_id_param
    ORDER BY 
        p.created_at DESC
    LIMIT result_limit OFFSET result_offset;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.fetch_posts_from_followed_users(current_user_id uuid, result_limit integer, result_offset integer)
 RETURNS SETOF json
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        json_build_object(
            'post', json_build_object(
                'id', p.id,
                'review_user', p.review_user,
                'vote_user', p.vote_user,
                'created_at', p.created_at,
                'media_id', p.media_id,
                'media_type', p.media_type,
                'total_likes', p.total_likes::INTEGER,  -- Cast BIGINT to INTEGER if needed
                'total_comments', p.total_comments::INTEGER
            ),
            'creator', json_build_object(
                'id', u.id,
                'username', u.username,
                'image_url', u.image_url
            ),
            'current_user', json_build_object(
                'has_liked', (l.user_id IS NOT NULL),
                'has_saved', (s.user_id IS NOT NULL)
            )
        )
    FROM 
        posts p
    INNER JOIN 
        follows f ON p.creatorid = f.following_id
    INNER JOIN 
        users u ON p.creatorid = u.id
    LEFT JOIN 
        likes l ON p.id = l.post_id AND l.user_id = current_user_id
    LEFT JOIN 
        saves s ON p.id = s.post_id AND s.user_id = current_user_id
    WHERE 
        f.user_id = current_user_id
    ORDER BY 
        p.created_at DESC
    LIMIT result_limit OFFSET result_offset;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.fetch_replies_by_comment_id(p_comment_id uuid, current_user_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(json_build_object(
        'id', c.id,
        'user_id', c.user_id,
        'post_id', c.post_id,
        'content', c.content,
        'created_at', c.created_at,
        'parent_id', c.parent_id,
        'total_likes', c.total_likes,
        'commenter', json_build_object(
            'id', u.id,
            'username', u.username,
            'name', u.name,
            'email', u.email,
            'image_url', u.image_url
        )
    ) ORDER BY c.created_at DESC)
    INTO result
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.parent_id = p_comment_id;

    RETURN result;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.fetch_user_liked_posts(current_user_id uuid, result_limit integer, result_offset integer)
 RETURNS TABLE(post_id uuid, creatorid uuid, creator_username text, creator_name text, creator_email text, creator_image_url text, creator_tmdb_id text, review_user text, vote_user real, created_at timestamp with time zone, mediaid integer, media_type text, total_likes bigint, total_comments bigint, has_saved boolean)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        p.id AS post_id,
        p.creatorid,
        u.username AS creator_username,
        u.name AS creator_name,
        u.email AS creator_email,
        u.image_url AS creator_image_url,
        u.tmdb_id AS creator_tmdb_id,
        p.review_user,
        p.vote_user,
        p.created_at,
        p.mediaid,
        p.media_type,
        p.total_likes,
        p.total_comments,
        CASE 
            WHEN s.user_id IS NOT NULL THEN TRUE 
            ELSE FALSE 
        END AS has_saved
    FROM 
        likes l
    INNER JOIN 
        posts p ON l.post_id = p.id
    INNER JOIN 
        users u ON p.creatorid = u.id
    LEFT JOIN 
        saves s ON p.id = s.post_id AND s.user_id = current_user_id
    WHERE 
        l.user_id = current_user_id
    ORDER BY 
        l.created_at DESC
    LIMIT result_limit OFFSET result_offset;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.fetch_user_liked_posts(creator_id uuid, current_user_id uuid, result_limit integer, result_offset integer)
 RETURNS TABLE(post_id uuid, creatorid uuid, creator_username text, creator_name text, creator_email text, creator_image_url text, creator_tmdb_id text, review_user text, vote_user real, created_at timestamp with time zone, media_id integer, media_type text, total_likes bigint, total_comments bigint, has_liked boolean, has_saved boolean)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        p.id AS post_id,
        p.creatorid,
        u.username AS creator_username,
        u.name AS creator_name,
        u.email AS creator_email,
        u.image_url AS creator_image_url,
        u.tmdb_id AS creator_tmdb_id,
        p.review_user,
        p.vote_user,
        p.created_at,
        p.media_id,
        p.media_type,
        p.total_likes,
        p.total_comments,
        TRUE AS has_liked, -- Since we're fetching liked posts, this will always be true
        CASE 
            WHEN s.user_id IS NOT NULL THEN TRUE 
            ELSE FALSE 
        END AS has_saved
    FROM 
        likes l
    INNER JOIN 
        posts p ON l.post_id = p.id
    INNER JOIN 
        users u ON p.creatorid = u.id
    LEFT JOIN 
        saves s ON p.id = s.post_id AND s.user_id = current_user_id
    WHERE 
        l.user_id = creator_id
    ORDER BY 
        l.created_at DESC
    LIMIT result_limit OFFSET result_offset;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.fetch_user_posts(creator_id uuid, current_user_id uuid DEFAULT NULL::uuid, result_limit integer DEFAULT 10, result_offset integer DEFAULT 0)
 RETURNS SETOF json
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        json_build_object(
            'post', json_build_object(
                'id', p.id,
                'review_user', p.review_user,
                'vote_user', p.vote_user,
                'created_at', p.created_at,
                'media_id', p.media_id,
                'media_type', p.media_type,
                'total_likes', p.total_likes,
                'total_comments', p.total_comments
            ),
            'creator', json_build_object(
                'id', u.id,
                'username', u.username,
                'name', u.name,
                'email', u.email,
                'image_url', u.image_url,
                'tmdb_id', u.tmdb_id
            ),
            'current_user', json_build_object(
                'has_liked', (l.user_id IS NOT NULL),
                'has_saved', (s.user_id IS NOT NULL)
            )
        )
    FROM 
        posts p
    JOIN 
        users u ON p.creatorid = u.id
    LEFT JOIN 
        likes l ON p.id = l.post_id 
                 AND l.user_id = current_user_id
    LEFT JOIN 
        saves s ON p.id = s.post_id
                 AND s.user_id = current_user_id
    WHERE 
        p.creatorid = creator_id
    ORDER BY 
        p.created_at DESC
    LIMIT result_limit
    OFFSET result_offset;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.fetch_user_posts_type(creator_id uuid, current_user_id uuid DEFAULT NULL::uuid, result_limit integer DEFAULT 10, result_offset integer DEFAULT 0)
 RETURNS TABLE(post_id uuid, creatorid uuid, creator_username text, creator_name text, creator_email text, creator_image_url text, creator_tmdb_id text, review_user text, vote_user real, created_at timestamp with time zone, media_id integer, media_type text, total_likes bigint, total_comments bigint, has_liked boolean, has_saved boolean)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        p.id AS post_id,
        p.creatorid,
        u.username AS creator_username,
        u.name AS creator_name,
        u.email AS creator_email,
        u.image_url AS creator_image_url,
        u.tmdb_id AS creator_tmdb_id,
        p.review_user,
        p.vote_user,
        p.created_at,
        p.media_id,
        p.media_type,
        p.total_likes,
        p.total_comments,

        -- If current_user_id is NULL, the join won't match => FALSE
        CASE
            WHEN current_user_id IS NOT NULL AND l.user_id IS NOT NULL THEN TRUE
            ELSE FALSE
        END AS has_liked,

        -- Same logic for has_saved
        CASE
            WHEN current_user_id IS NOT NULL AND s.user_id IS NOT NULL THEN TRUE
            ELSE FALSE
        END AS has_saved

    FROM posts p
    JOIN users u
      ON p.creatorid = u.id

    LEFT JOIN likes l
      ON p.id = l.post_id
     AND l.user_id = current_user_id

    LEFT JOIN saves s
      ON p.id = s.post_id
     AND s.user_id = current_user_id

    WHERE p.creatorid = creator_id
    ORDER BY p.created_at DESC
    LIMIT result_limit
    OFFSET result_offset;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.fetch_user_posts_type(creator_id uuid, current_user_id uuid DEFAULT NULL::uuid, media_type_filter text DEFAULT NULL::text, result_limit integer DEFAULT 10, result_offset integer DEFAULT 0)
 RETURNS SETOF json
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        json_build_object(
            'post', json_build_object(
                'id', p.id,
                'review_user', p.review_user,
                'vote_user', p.vote_user,
                'created_at', p.created_at,
                'media_id', p.media_id,
                'media_type', p.media_type,
                'total_likes', p.total_likes,
                'total_comments', p.total_comments
            ),
            'creator', json_build_object(
                'id', u.id,
                'username', u.username,
                'name', u.name,
                'email', u.email,
                'image_url', u.image_url,
                'tmdb_id', u.tmdb_id
            ),
            'current_user', json_build_object(
                'has_liked', (l.user_id IS NOT NULL),
                'has_saved', (s.user_id IS NOT NULL)
            )
        )
    FROM posts p
    JOIN users u
      ON p.creatorid = u.id
    LEFT JOIN likes l
      ON p.id = l.post_id
     AND l.user_id = current_user_id
    LEFT JOIN saves s
      ON p.id = s.post_id
     AND s.user_id = current_user_id
    WHERE p.creatorid = creator_id
      AND (media_type_filter IS NULL OR p.media_type = media_type_filter)
    ORDER BY p.created_at DESC
    LIMIT result_limit
    OFFSET result_offset;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.fetch_user_saved_posts(creator_id uuid, current_user_id uuid, result_limit integer, result_offset integer)
 RETURNS TABLE(post_id uuid, creatorid uuid, creator_username text, creator_name text, creator_email text, creator_image_url text, creator_tmdb_id text, review_user text, vote_user real, created_at timestamp with time zone, media_id integer, media_type text, total_likes bigint, total_comments bigint, has_liked boolean, has_saved boolean)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        p.id AS post_id,
        p.creatorid,
        u.username AS creator_username,
        u.name AS creator_name,
        u.email AS creator_email,
        u.image_url AS creator_image_url,
        u.tmdb_id AS creator_tmdb_id,
        p.review_user,
        p.vote_user,
        p.created_at,
        p.media_id,
        p.media_type,
        p.total_likes,
        p.total_comments,
        EXISTS (SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.user_id = current_user_id) AS has_liked,
        EXISTS (SELECT 1 FROM saves s2 WHERE s2.post_id = p.id AND s2.user_id = current_user_id) AS has_saved
    FROM 
        saves s
    INNER JOIN 
        posts p ON s.post_id = p.id
    INNER JOIN 
        users u ON p.creatorid = u.id
    WHERE 
        s.user_id = creator_id
    ORDER BY 
        s.created_at DESC
    LIMIT result_limit OFFSET result_offset;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.get_batch_percentage_watched(p_user_id uuid, p_items jsonb)
 RETURNS TABLE(media_type text, media_id integer, season_number integer, episode_number integer, percentage_watched numeric)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
    RETURN QUERY
    WITH input_items AS (
        SELECT
            (item->>'media_type')::TEXT AS media_type,
            (item->>'media_id')::INTEGER AS media_id,
            COALESCE((item->>'season_number')::INTEGER, -1) AS season_number,
            COALESCE((item->>'episode_number')::INTEGER, -1) AS episode_number
        FROM jsonb_array_elements(p_items) AS item
    )
    SELECT
        i.media_type,
        i.media_id,
        i.season_number,
        i.episode_number,
        COALESCE(wh.percentage_watched::NUMERIC, 0) AS percentage_watched
    FROM input_items i
    LEFT JOIN watch_history wh ON
        wh.user_id = p_user_id
        AND wh.media_type = i.media_type
        AND wh.media_id = i.media_id
        AND COALESCE(wh.season_number, -1) = i.season_number
        AND COALESCE(wh.episode_number, -1) = i.episode_number;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.get_batch_watched_items(input_user_id uuid, input_items jsonb)
 RETURNS TABLE(media_type text, media_id bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT wh.media_type, wh.media_id
    FROM watch_history wh
    WHERE wh.user_id = input_user_id
      AND (wh.media_type, wh.media_id) IN (
          SELECT (value->>'media_type')::TEXT, (value->>'media_id')::INT
          FROM jsonb_array_elements(input_items)
      )
    UNION
    SELECT wl.media_type, wl.media_id
    FROM watch_list wl
    WHERE wl.user_id = input_user_id
      AND wl.watch_list_type = 'watched'
      AND (wl.media_type, wl.media_id) IN (
          SELECT (value->>'media_type')::TEXT, (value->>'media_id')::INT
          FROM jsonb_array_elements(input_items)
      );
END;
$function$
;
CREATE OR REPLACE FUNCTION public.get_continue_watching(user_id_input uuid)
 RETURNS TABLE(media_id integer, media_type text, season_number integer, episode_number integer)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    WITH latest_episodes AS (
        SELECT
            wh.media_id,
            wh.media_type,
            wh.season_number,
            wh.episode_number,
            wh.percentage_watched,
            wh.created_at,
            ROW_NUMBER() OVER (
                PARTITION BY wh.media_id
                ORDER BY wh.season_number DESC, wh.episode_number DESC
            ) AS row_num
        FROM watch_history wh
        WHERE wh.user_id = user_id_input
          AND wh.hidden_until IS NULL
    )
    SELECT
        le.media_id,
        le.media_type,
        le.season_number,
        le.episode_number
    FROM latest_episodes le
    WHERE le.row_num = 1
      AND NOT (le.media_type = 'movie' AND CAST(le.percentage_watched AS FLOAT) >= 75)
      AND CAST(le.percentage_watched AS FLOAT) < 75
    ORDER BY le.created_at DESC
    LIMIT 15;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.get_next_episodes(user_id_input uuid)
 RETURNS TABLE(media_id integer, media_type text, season_number integer, episode_number integer, next_episode boolean)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    WITH latest_episodes AS (
        SELECT
            le.user_id,
            le.media_id,
            le.media_type,
            le.season_number,
            le.episode_number,
            le.percentage_watched,
            le.created_at,
            le.hidden_until,
            ROW_NUMBER() OVER (PARTITION BY le.media_id ORDER BY le.season_number DESC, le.episode_number DESC) AS row_num
        FROM watch_history le
        WHERE le.user_id = user_id_input
          AND (le.hidden_until IS NULL)  -- ONLY NEW LINE: Filter out hidden items
    ),
    filtered_episodes AS (
        SELECT
            le.media_id,
            le.media_type,
            le.season_number,
            le.episode_number,

            CASE
                WHEN le.media_type = 'tv' AND CAST(le.percentage_watched AS FLOAT) >= 75 THEN TRUE
                ELSE FALSE
            END AS next_episode,
            le.created_at
        FROM latest_episodes le
        WHERE le.row_num = 1
        AND NOT (le.media_type = 'movie' AND CAST(le.percentage_watched AS FLOAT) >= 75)
    )
    SELECT
        fe.media_id,
        fe.media_type,
        fe.season_number,
        fe.episode_number,
        fe.next_episode
    FROM filtered_episodes fe
    ORDER BY fe.created_at DESC
    LIMIT 25;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.get_percentage_watched(p_user_id uuid, p_media_type text, p_media_id integer, p_season_number integer DEFAULT NULL::integer, p_episode_number integer DEFAULT NULL::integer)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN (
        SELECT percentage_watched
        FROM watch_history
        WHERE user_id = p_user_id
          AND media_type = p_media_type
          AND media_id = p_media_id
          AND (season_number = p_season_number OR p_season_number IS NULL)
          AND (episode_number = p_episode_number OR p_episode_number IS NULL)
        LIMIT 1
    );
END;
$function$
;
CREATE OR REPLACE FUNCTION public.get_playback_position(p_user_id uuid, p_media_type text, p_media_id integer, p_season_number integer DEFAULT NULL::integer, p_episode_number integer DEFAULT NULL::integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN (
        SELECT playback_position
        FROM watch_history
        WHERE user_id = p_user_id
          AND media_type = p_media_type
          AND media_id = p_media_id
          AND season_number = COALESCE(p_season_number, -1)
          AND episode_number = COALESCE(p_episode_number, -1)
    );
END;
$function$
;
CREATE OR REPLACE FUNCTION public.get_top_movie_genres_for_user(p_user_id uuid)
 RETURNS TABLE(genre_code text, value bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    unnest(array['28', '12', '16', '35', '80', '99', '18', '10751', '14', '36', '27', '10402', '9648', '10749', '878', '10770', '53', '10752', '37']) AS genre_code,
    unnest(array[
      "28", "12", "16", "35", "80", "99", "18", "10751", "14", "36", "27", "10402", "9648", "10749", "878", "10770", "53", "10752", "37"
    ]) AS value
  FROM 
    movie_genre_stats
  WHERE 
    user_id = p_user_id
  ORDER BY 
    value DESC
  LIMIT 5;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.get_top_tv_genres_for_user(p_user_id uuid)
 RETURNS TABLE(genre_code text, value bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    unnest(array['10759', '16', '35', '80', '99', '18', '10751', '10762', '9648', '10763', '10764', '10765', '10766', '10767', '10768', '37'
]) AS genre_code,
    unnest(array[
      "10759", "16", "35", "80", "99", "18", "10751", "10762", "9648", "10763", "10764", "10765", "10766", "10767", "10768", "37"
    ]) AS value
  FROM 
    tv_genre_stats
  WHERE 
    user_id = p_user_id
  ORDER BY 
    value DESC
  LIMIT 5;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.get_up_next_episodes(user_id_input uuid)
 RETURNS TABLE(media_id integer, media_type text, season_number integer, episode_number integer)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    WITH latest_episodes AS (
        SELECT
            wh.media_id,
            wh.media_type,
            wh.season_number,
            wh.episode_number,
            wh.percentage_watched,
            wh.created_at,
            ROW_NUMBER() OVER (
                PARTITION BY wh.media_id
                ORDER BY wh.season_number DESC, wh.episode_number DESC
            ) AS row_num
        FROM watch_history wh
        WHERE wh.user_id = user_id_input
          AND wh.hidden_until IS NULL
    )
    SELECT
        le.media_id,
        le.media_type,
        le.season_number,
        le.episode_number
    FROM latest_episodes le
    WHERE le.row_num = 1
      AND le.media_type = 'tv'
      AND CAST(le.percentage_watched AS FLOAT) >= 75
    ORDER BY le.created_at DESC
    LIMIT 25;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.get_user_notifications(_recipient_id uuid, _limit integer DEFAULT 10, _offset integer DEFAULT 0)
 RETURNS TABLE(notification_id uuid, notification_type text, media_type text, media_id integer, season_number integer, episode_number integer, created_at timestamp with time zone, is_read boolean, triggered_by_user jsonb, post jsonb, comment jsonb, parent_comment jsonb)
 LANGUAGE sql
AS $function$
  SELECT
    n.id AS notification_id,
    n.type AS notification_type,
    n.media_type,
    n.media_id,
    n.season_number,
    n.episode_number,
    n.created_at,
    n.read AS is_read,
    -- Convert the triggered_by_user record to JSON
    to_jsonb(triggered_by_user.*) AS triggered_by_user,

    -- Convert the post record to JSON (if present)
    to_jsonb(p.*) AS post,

    -- Convert the comment record to JSON (if present)
    to_jsonb(c.*) AS comment,

    -- Convert the parent comment to JSON (if present)
    to_jsonb(pc.*) AS parent_comment

  FROM notifications n
    -- Join the user who triggered the notification
    LEFT JOIN users AS triggered_by_user
      ON n.triggered_by = triggered_by_user.id

    -- Join post if notification.post_id is present
    LEFT JOIN posts AS p
      ON n.post_id = p.id

    -- Join comment if notification.comment_id is present
    LEFT JOIN comments AS c
      ON n.comment_id = c.id

    -- Join parent comment if it's a reply
    LEFT JOIN comments AS pc
      ON c.parent_id = pc.id

  WHERE n.recipient_id = _recipient_id
  ORDER BY n.created_at DESC
  LIMIT _limit
  OFFSET _offset
$function$
;
CREATE OR REPLACE FUNCTION public.get_watch_history_for_user(p_user_id uuid, p_limit integer, p_offset integer)
 RETURNS TABLE(user_id uuid, media_type text, media_id integer, season_number integer, episode_number integer, time_spent integer, percentage_watched text, created_at timestamp without time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        wh.user_id,
        wh.media_type,
        wh.media_id,
        wh.season_number,
        wh.episode_number,
        wh.time_spent,
        wh.percentage_watched,
        wh.created_at::timestamp
    FROM
        watch_history wh
    WHERE
        wh.user_id = p_user_id
    ORDER BY
        wh.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.get_watch_history_for_user(p_user_id uuid)
 RETURNS TABLE(user_id uuid, media_type text, media_id integer, season_id integer, episode_number integer, created_at timestamp without time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        wh.user_id,
        wh.media_type,
        wh.media_id,
        wh.season_id,
        wh.episode_number,
        wh.created_at::timestamp
    FROM
        watch_history wh
    WHERE
        wh.user_id = p_user_id
    ORDER BY
        wh.created_at DESC;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.get_watch_later(p_user_id uuid, p_limit integer, p_offset integer)
 RETURNS TABLE(id uuid, user_id uuid, media_type text, media_id bigint, watch_list_type text, created_at timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        wl.id,
        wl.user_id,
        wl.media_type,
        wl.media_id,
        wl.watch_list_type,
        wl.created_at
    FROM 
        watch_list wl
    WHERE 
        wl.user_id = p_user_id AND 
        wl.watch_list_type = 'watch_later'
    ORDER BY wl.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.get_watch_later(user_id_input uuid)
 RETURNS TABLE(id bigint, user_id uuid, media_type text, media_id bigint, watch_list_type text, created_at timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        id,
        user_id,
        media_type,
        media_id,
        watch_list_type,
        created_at
    FROM 
        watch_list
    WHERE 
        user_id = user_id_input AND 
        watch_list_type = 'watch_later';
END;
$function$
;
CREATE OR REPLACE FUNCTION public.get_watch_later_entries(p_user_id uuid, p_media_type text, p_media_id integer)
 RETURNS TABLE(id uuid, user_id uuid, media_type text, media_id integer, watch_list_type text, created_at timestamp without time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT id, user_id, media_type, media_id, watch_list_type, created_at
  FROM watch_list
  WHERE user_id = p_user_id
    AND media_type = p_media_type
    AND media_id = p_media_id
    AND watch_list_type = 'watch_later';
END;
$function$
;
CREATE OR REPLACE FUNCTION public.get_watch_list_full(p_user_id uuid, p_limit integer, p_offset integer)
 RETURNS TABLE(id uuid, user_id uuid, media_type text, media_id bigint, watch_list_type text, created_at timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        wl.id,
        wl.user_id,
        wl.media_type,
        wl.media_id,
        wl.watch_list_type,
        wl.created_at
    FROM 
        watch_list wl
    WHERE 
        wl.user_id = p_user_id 
    ORDER BY wl.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.get_watch_list_specific(p_user_id uuid, p_limit integer, p_offset integer, p_watch_list_type text)
 RETURNS TABLE(id uuid, user_id uuid, media_type text, media_id bigint, watch_list_type text, created_at timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        wl.id,
        wl.user_id,
        wl.media_type,
        wl.media_id,
        wl.watch_list_type,
        wl.created_at
    FROM 
        watch_list wl
    WHERE 
        wl.user_id = p_user_id AND
        wl.watch_list_type = p_watch_list_type
    ORDER BY wl.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.get_watched_items(input_user_id uuid, input_movies integer[], input_tvshows integer[])
 RETURNS TABLE(media_type text, media_id integer)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT media_type, media_id
    FROM watch_history
    WHERE user_id = input_user_id
      AND (
          (media_type = 'movie' AND media_id = ANY(input_movies))
          OR (media_type = 'tv' AND media_id = ANY(input_tvshows))
      )
    UNION
    SELECT media_type, media_id
    FROM watch_list
    WHERE user_id = input_user_id
      AND watch_list_type = 'watched'
      AND (
          (media_type = 'movie' AND media_id = ANY(input_movies))
          OR (media_type = 'tv' AND media_id = ANY(input_tvshows))
      );
END;
$function$
;
CREATE OR REPLACE FUNCTION public.handle_comment_or_reply_notification()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  post_creator uuid;
  parent_author uuid;
BEGIN
  -- 1) If it's a top-level comment (parent_id is null):
  IF NEW.parent_id IS NULL THEN
    -- Find the post creator
    SELECT creatorid INTO post_creator
    FROM posts
    WHERE id = NEW.post_id;

    -- Notify the post creator if they're not the same as the commenter
    IF post_creator IS NOT NULL AND post_creator <> NEW.user_id THEN
      INSERT INTO notifications (
        recipient_id,
        triggered_by,
        type,
        post_id,
        comment_id
      )
      VALUES (
        post_creator,
        NEW.user_id,
        'comment',       -- or 'comment_on_post' if you prefer
        NEW.post_id,
        NEW.id
      );
    END IF;

  -- 2) Otherwise, it's a reply (parent_id is not null)
  ELSE
    -- Find the parent comment's author
    SELECT user_id INTO parent_author
    FROM comments
    WHERE id = NEW.parent_id;

    -- Notify the parent comment's author if they're not the same as the replier
    IF parent_author IS NOT NULL AND parent_author <> NEW.user_id THEN
      INSERT INTO notifications (
        recipient_id,
        triggered_by,
        type,
        post_id,
        comment_id
      )
      VALUES (
        parent_author,
        NEW.user_id,
        'reply',
        NEW.post_id,
        NEW.id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.handle_follow_notification()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Only notify if user_id != following_id (avoid weird self-follow scenario)
  IF NEW.user_id <> NEW.following_id THEN
    INSERT INTO notifications (
      recipient_id,
      triggered_by,
      type
    )
    VALUES (
      NEW.following_id,
      NEW.user_id,
      'follow'
    );
  END IF;

  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.handle_like_notification()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  post_creator uuid;
BEGIN
  -- Find the creator of the post
  SELECT creatorid INTO post_creator
  FROM posts
  WHERE id = NEW.post_id;

  -- Only insert notification if user is not liking their own post
  IF post_creator IS NOT NULL AND post_creator <> NEW.user_id THEN
    INSERT INTO notifications (
      recipient_id,
      triggered_by,
      type,
      post_id
    )
    VALUES (
      post_creator,
      NEW.user_id,
      'like',
      NEW.post_id
    );
  END IF;

  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.handle_new_post_notification()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  follower RECORD;
BEGIN
  -- For each follower of the post creator, insert a notification
  FOR follower IN
    SELECT user_id
    FROM follows
    WHERE following_id = NEW.creatorid
  LOOP
    -- Avoid sending a notification if the user somehow follows themselves
    IF follower.user_id <> NEW.creatorid THEN
      INSERT INTO notifications (
        recipient_id,
        triggered_by,
        type,
        post_id
      )
      VALUES (
        follower.user_id,
        NEW.creatorid,
        'new_post',
        NEW.id
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_username text;
  v_name text;
  v_image_url text;
begin
  -- Extract values from the JSON metadata. Adjust keys as needed.
  v_username := coalesce(new.raw_user_meta_data->>'username', new.email);
  v_name := coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', '');
  v_image_url := coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', '');

  -- Insert into the custom "users" table without referencing a "role" column.
  insert into public.users (id, email, username, name, image_url)
  values (new.id, new.email, v_username, v_name, v_image_url)
  on conflict (id) do nothing;

  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.handle_notifications_from_new_episodes()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO notifications (media_id, media_type, season_number, episode_number, recipient_id,type)
  VALUES (NEW.tv_id, 'tv', NEW.season_number, NEW.episode_number, NEW.user_id,'new_episode');
  
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.increment_comment_likes(p_comment_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  update public.comments set total_likes = total_likes + 1 where id = p_comment_id;
$function$
;
CREATE OR REPLACE FUNCTION public.increment_comments(post_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE posts
  SET total_comments = total_comments + 1
  WHERE id = post_id;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.increment_likes(post_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN; -- no-op: total_likes maintained by trg_likes_count
END;
$function$
;
CREATE OR REPLACE FUNCTION public.insert_genre_stats_for_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$BEGIN
  -- Insert a row into the movie_genre_stats table with the UUID user_id
  INSERT INTO public.movie_genre_stats (user_id)
  VALUES (NEW.id);  -- NEW.id refers to the UUID of the new user

  -- Insert a row into the tv_genre_stats table with the UUID user_id
  INSERT INTO public.tv_genre_stats (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;$function$
;
CREATE OR REPLACE FUNCTION public.insert_watch_history()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Insert the new row or do nothing if the row already exists
  INSERT INTO watch_history (
    user_id, 
    media_type, 
    media_id, 
    percentage_watched, 
    season_number,  -- New column
    episode_number  -- New column
  )
  VALUES (
    NEW.creatorid, 
    NEW.media_type, 
    NEW.media_id, 
    100, 
    NULL,  -- Set season_number to NULL
    NULL   -- Set episode_number to NULL
  )
  ON CONFLICT (user_id, media_type, media_id,season_number,episode_number)
  DO NOTHING;

  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.is_item_watched(input_user_id uuid, input_media_type text, input_media_id integer)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Check if the item exists in the watch_history table
    IF EXISTS (
        SELECT 1
        FROM watch_history
        WHERE user_id = input_user_id
          AND media_type = input_media_type
          AND media_id = input_media_id
    ) THEN
        RETURN TRUE;
    END IF;

    -- Check if the item exists in the watch_list table with watch_list_type = 'watched'
    IF EXISTS (
        SELECT 1
        FROM watch_list
        WHERE user_id = input_user_id
          AND media_type = input_media_type
          AND media_id = input_media_id
          AND watch_list_type = 'watched'
    ) THEN
        RETURN TRUE;
    END IF;

    -- If no matches are found, return FALSE
    RETURN FALSE;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.normalize_null_values()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NEW.season_number IS NULL THEN
        NEW.season_number := -1;
    END IF;
    IF NEW.episode_number IS NULL THEN
        NEW.episode_number := -1;
    END IF;
    RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.posts_likes_count()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET total_likes = total_likes + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET total_likes = GREATEST(total_likes - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.remove_movie_duplicates()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Remove duplicate rows for movies while keeping the smallest ctid
  DELETE FROM watch_history a
  USING watch_history b
  WHERE 
      a.ctid > b.ctid -- Keep the first occurrence (lowest ctid)
      AND a.media_type = 'movie' -- Only movies
      AND b.media_type = 'movie'
      AND a.user_id = b.user_id
      AND a.media_id = b.media_id
      AND (
          (a.season_number IS NULL AND b.season_number IS NULL) 
          OR a.season_number = b.season_number
      )
      AND (
          (a.episode_number IS NULL AND b.episode_number IS NULL) 
          OR a.episode_number = b.episode_number
      );

  RAISE NOTICE 'Duplicate movies removed successfully.';
END;
$function$
;
CREATE OR REPLACE FUNCTION public.update_genre_stats(genre_ids bigint[], media_type text, user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    table_name text;
    column_name text;
    genre_id bigint;
BEGIN
    -- Determine which table to update based on the media_type
    IF media_type = 'movie' THEN
        table_name := 'movie_genre_stats';
    ELSIF media_type = 'tv' THEN
        table_name := 'tv_genre_stats';
    ELSE
        RAISE EXCEPTION 'Invalid media_type: %', media_type;
    END IF;

    -- Loop through each genre_id in the array
    FOREACH genre_id IN ARRAY genre_ids
    LOOP
        -- Construct the column name dynamically based on the genre_id
        column_name := genre_id::text;

        -- Execute the update statement to increment the value by 1
        EXECUTE format('UPDATE %I SET %I = %I + 1 WHERE user_id = %L', 
                       table_name, column_name, column_name, user_id);
    END LOOP;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.upsert_watch_history_atomic(p_user_id uuid, p_media_type text, p_media_id integer, p_new_time_spent integer, p_new_percentage numeric, p_season_number integer DEFAULT '-1'::integer, p_episode_number integer DEFAULT '-1'::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    result_row watch_history%ROWTYPE;
BEGIN
    INSERT INTO watch_history (
        user_id, media_type, media_id,
        time_spent, percentage_watched,
        season_number, episode_number,
        created_at, hidden_until
    ) VALUES (
        p_user_id, p_media_type, p_media_id,
        p_new_time_spent,
        LEAST(p_new_percentage, 100),
        p_season_number, p_episode_number,
        NOW(), NULL
    )
    ON CONFLICT (user_id, media_type, media_id, season_number, episode_number)
    DO UPDATE SET
        time_spent = watch_history.time_spent + EXCLUDED.time_spent,
        percentage_watched = LEAST(
            watch_history.percentage_watched::NUMERIC + EXCLUDED.percentage_watched::NUMERIC,
            100
        ),
        created_at = NOW(),
        hidden_until = NULL
    RETURNING * INTO result_row;

    RETURN jsonb_build_object(
        'success', true,
        'action', 'upserted',
        'time_spent', result_row.time_spent,
        'percentage_watched', result_row.percentage_watched
    );
END;
$function$
;
CREATE OR REPLACE FUNCTION public.upsert_watch_history_atomic(p_user_id uuid, p_media_type text, p_media_id integer, p_new_time_spent integer, p_new_percentage numeric, p_season_number integer DEFAULT '-1'::integer, p_episode_number integer DEFAULT '-1'::integer, p_sync_source text DEFAULT 'app'::text, p_playback_position integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    result_row watch_history%ROWTYPE;
BEGIN
    INSERT INTO watch_history (
        user_id, media_type, media_id,
        time_spent, percentage_watched,
        season_number, episode_number,
        created_at, hidden_until, sync_source,
        playback_position
    ) VALUES (
        p_user_id, p_media_type, p_media_id,
        p_new_time_spent,
        LEAST(p_new_percentage, 100),
        p_season_number, p_episode_number,
        NOW(), NULL, p_sync_source,
        p_playback_position
    )
    ON CONFLICT (user_id, media_type, media_id, season_number, episode_number)
    DO UPDATE SET
        time_spent = CASE
            -- Jellyfin and Videasy send absolute time; overwrite with latest
            WHEN EXCLUDED.sync_source IN ('videasy', 'jellyfin') THEN
                EXCLUDED.time_spent
            -- App sends incremental time; accumulate
            ELSE
                watch_history.time_spent + EXCLUDED.time_spent
        END,
        percentage_watched = CASE
            -- Jellyfin and Videasy send absolute percentage; overwrite with latest
            WHEN EXCLUDED.sync_source IN ('videasy', 'jellyfin') THEN
                LEAST(EXCLUDED.percentage_watched::NUMERIC, 100)
            -- App sends incremental percentage; accumulate
            ELSE
                LEAST(
                    watch_history.percentage_watched::NUMERIC + EXCLUDED.percentage_watched::NUMERIC,
                    100
                )
        END,
        playback_position = COALESCE(EXCLUDED.playback_position, watch_history.playback_position),
        created_at = NOW(),
        hidden_until = NULL,
        sync_source = EXCLUDED.sync_source
    RETURNING * INTO result_row;

    RETURN jsonb_build_object(
        'success', true,
        'action', 'upserted',
        'time_spent', result_row.time_spent,
        'percentage_watched', result_row.percentage_watched,
        'sync_source', result_row.sync_source,
        'playback_position', result_row.playback_position
    );
END;
$function$
;


-- ============================================================
-- CONSTRAINTS
-- ============================================================
-- primary keys / unique / check
ALTER TABLE public.comment_likes ADD CONSTRAINT comment_likes_pkey PRIMARY KEY (id);
ALTER TABLE public.comment_likes ADD CONSTRAINT comment_likes_user_id_comment_id_key UNIQUE (user_id, comment_id);
ALTER TABLE public.comments ADD CONSTRAINT comments_pkey PRIMARY KEY (id);
ALTER TABLE public.dev_blog ADD CONSTRAINT dev_blog_pkey PRIMARY KEY (id);
ALTER TABLE public.dev_blog ADD CONSTRAINT dev_blog_slug_key UNIQUE (slug);
ALTER TABLE public.follows ADD CONSTRAINT follows_pkey PRIMARY KEY (id);
ALTER TABLE public.likes ADD CONSTRAINT likes_pkey PRIMARY KEY (id);
ALTER TABLE public.likes ADD CONSTRAINT likes_user_post_unique UNIQUE (user_id, post_id);
ALTER TABLE public.movie_genre_stats ADD CONSTRAINT movie_genre_stats_pkey PRIMARY KEY (id);
ALTER TABLE public.movie_genre_stats ADD CONSTRAINT movie_genre_stats_user_id_unique UNIQUE (user_id);
ALTER TABLE public.new_episodes ADD CONSTRAINT new_episodes_pkey PRIMARY KEY (id);
ALTER TABLE public.new_episodes ADD CONSTRAINT new_episodes_user_tv_unique UNIQUE (user_id, tv_id);
ALTER TABLE public.notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);
ALTER TABLE public.posts ADD CONSTRAINT posts_pkey PRIMARY KEY (id);
ALTER TABLE public.saves ADD CONSTRAINT saves_pkey PRIMARY KEY (id);
ALTER TABLE public.saves ADD CONSTRAINT saves_user_post_unique UNIQUE (user_id, post_id);
ALTER TABLE public.tv_genre_stats ADD CONSTRAINT tv_genre_stats_pkey PRIMARY KEY (id);
ALTER TABLE public.tv_genre_stats ADD CONSTRAINT tv_genre_stats_user_id_unique UNIQUE (user_id);
ALTER TABLE public.user_ip_addresses ADD CONSTRAINT user_ip_addresses_pkey PRIMARY KEY (id);
ALTER TABLE public.user_jellyfin_config ADD CONSTRAINT user_jellyfin_config_pkey PRIMARY KEY (id);
ALTER TABLE public.user_jellyfin_config ADD CONSTRAINT user_jellyfin_config_user_id_key UNIQUE (user_id);
ALTER TABLE public.users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
-- DROPPED (users is now the root table): ALTER TABLE public.users ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id);
ALTER TABLE public.watch_history ADD CONSTRAINT watch_history_pkey PRIMARY KEY (id);
ALTER TABLE public.watch_history ADD CONSTRAINT watch_history_unique UNIQUE (user_id, media_type, media_id, season_number, episode_number);
ALTER TABLE public.watch_list ADD CONSTRAINT watch_list_pkey PRIMARY KEY (id);

-- foreign keys (added after all PK/UNIQUE exist)
ALTER TABLE public.comment_likes ADD CONSTRAINT comment_likes_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE;
ALTER TABLE public.comment_likes ADD CONSTRAINT comment_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public.comments ADD CONSTRAINT comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES comments(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public.comments ADD CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public.comments ADD CONSTRAINT comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
ALTER TABLE public.dev_blog ADD CONSTRAINT dev_blog_author_id_fkey FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public.follows ADD CONSTRAINT follows_following_id_fkey FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public.follows ADD CONSTRAINT follows_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public.likes ADD CONSTRAINT likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
ALTER TABLE public.likes ADD CONSTRAINT likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public.movie_genre_stats ADD CONSTRAINT movie_genre_stats_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public.new_episodes ADD CONSTRAINT new_episodes_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE public.notifications ADD CONSTRAINT notifications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_triggered_by_fkey FOREIGN KEY (triggered_by) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES comments(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public.posts ADD CONSTRAINT posts_creatorid_fkey FOREIGN KEY (creatorid) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public.saves ADD CONSTRAINT saves_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public.saves ADD CONSTRAINT saves_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
ALTER TABLE public.tv_genre_stats ADD CONSTRAINT tv_genre_stats_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public.user_ip_addresses ADD CONSTRAINT fk_user_ip_addresses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public.user_jellyfin_config ADD CONSTRAINT user_jellyfin_config_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public.watch_history ADD CONSTRAINT watch_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public.watch_list ADD CONSTRAINT watch_list_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX comment_likes_comment_id_idx ON public.comment_likes USING btree (comment_id);
CREATE INDEX comment_likes_user_id_idx ON public.comment_likes USING btree (user_id);
CREATE INDEX comments_parent_id_idx ON public.comments USING btree (parent_id);
CREATE INDEX comments_post_id_idx ON public.comments USING btree (post_id);
CREATE INDEX comments_user_id_idx ON public.comments USING btree (user_id);
CREATE INDEX follows_following_id_idx ON public.follows USING btree (following_id);
CREATE INDEX follows_user_id_idx ON public.follows USING btree (user_id);
CREATE INDEX idx_comments_parent_id ON public.comments USING btree (parent_id) WHERE (parent_id IS NOT NULL);
CREATE INDEX idx_comments_post_id ON public.comments USING btree (post_id);
CREATE INDEX idx_follows_following_id ON public.follows USING btree (following_id);
CREATE INDEX idx_follows_user_id ON public.follows USING btree (user_id);
CREATE INDEX idx_new_episodes_user_airdate ON public.new_episodes USING btree (user_id, last_air_date DESC);
CREATE INDEX idx_posts_creatorid ON public.posts USING btree (creatorid);
CREATE INDEX idx_posts_media_lookup ON public.posts USING btree (media_type, media_id);
CREATE INDEX idx_user_ip_addresses_ip ON public.user_ip_addresses USING btree (ip_address);
CREATE INDEX idx_user_ip_addresses_user_id ON public.user_ip_addresses USING btree (user_id);
CREATE INDEX idx_watch_history_batch_lookup ON public.watch_history USING btree (user_id, media_type, media_id) WHERE (media_type = ANY (ARRAY['movie'::text, 'tv'::text]));
CREATE INDEX idx_watch_history_next_episodes ON public.watch_history USING btree (user_id, media_id, season_number DESC, episode_number DESC) WHERE (hidden_until IS NULL);
CREATE INDEX idx_watch_history_not_hidden ON public.watch_history USING btree (user_id, hidden_until) WHERE (hidden_until IS NULL);
CREATE INDEX idx_watch_history_user_created_desc ON public.watch_history USING btree (user_id, created_at DESC);
CREATE INDEX idx_watch_history_user_media_lookup ON public.watch_history USING btree (user_id, media_type, media_id, season_number, episode_number);
CREATE INDEX likes_post_id_idx ON public.likes USING btree (post_id);
CREATE INDEX likes_user_id_idx ON public.likes USING btree (user_id);
CREATE INDEX movie_genre_stats_user_id_idx ON public.movie_genre_stats USING btree (user_id);
CREATE INDEX posts_creatorid_idx ON public.posts USING btree (creatorid);
CREATE INDEX posts_creatorid_media_type_idx ON public.posts USING btree (creatorid, media_type);
CREATE INDEX posts_id_idx ON public.posts USING btree (id);
CREATE INDEX posts_total_comments_idx ON public.posts USING btree (total_comments);
CREATE INDEX posts_total_likes_idx ON public.posts USING btree (total_likes);
CREATE INDEX saves_post_id_idx ON public.saves USING btree (post_id);
CREATE INDEX saves_user_id_idx ON public.saves USING btree (user_id);
CREATE INDEX tv_genre_stats_user_id_idx ON public.tv_genre_stats USING btree (user_id);
CREATE INDEX users_id_idx ON public.users USING btree (id);
CREATE INDEX watch_history_user_id_idx ON public.watch_history USING btree (user_id);
CREATE INDEX watch_history_user_id_media_type_media_id_season_number_epi_idx ON public.watch_history USING btree (user_id, media_type, media_id, season_number, episode_number);
CREATE INDEX watch_list_user_id_media_type_media_id_watch_list_type_idx ON public.watch_list USING btree (user_id, media_type, media_id, watch_list_type);


-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE TRIGGER trigger_comment_or_reply_notification AFTER INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION handle_comment_or_reply_notification();
CREATE TRIGGER trigger_follow_notification AFTER INSERT ON public.follows FOR EACH ROW EXECUTE FUNCTION handle_follow_notification();
CREATE TRIGGER trigger_like_notification AFTER INSERT ON public.likes FOR EACH ROW EXECUTE FUNCTION handle_like_notification();
CREATE TRIGGER trg_likes_count AFTER INSERT OR DELETE ON public.likes FOR EACH ROW EXECUTE FUNCTION posts_likes_count();
CREATE TRIGGER trigger_new_episode AFTER INSERT ON public.new_episodes FOR EACH ROW EXECUTE FUNCTION handle_notifications_from_new_episodes();
CREATE TRIGGER after_post_insert AFTER INSERT ON public.posts FOR EACH ROW EXECUTE FUNCTION insert_watch_history();
CREATE TRIGGER trigger_new_post_notification AFTER INSERT ON public.posts FOR EACH ROW EXECUTE FUNCTION handle_new_post_notification();
CREATE TRIGGER update_user_ip_addresses_updated_at BEFORE UPDATE ON public.user_ip_addresses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER add_genre_stats_after_user_creation AFTER INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION insert_genre_stats_for_new_user();
-- DROPPED (Better Auth owns user creation): CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();
CREATE TRIGGER watch_history_null_normalizer BEFORE INSERT OR UPDATE ON public.watch_history FOR EACH ROW EXECUTE FUNCTION normalize_null_values();
