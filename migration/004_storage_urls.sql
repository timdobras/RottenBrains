-- =====================================================================
-- 004_storage_urls.sql — rewrite stored Supabase-Storage URLs → MinIO.
-- PREPARED, NOT auto-applied. Apply at the storage cutover, AFTER the ~74
-- objects are copied Supabase Storage → MinIO bucket `rottenbrains` preserving
-- their paths (profile_pictures/<key> → rottenbrains/profile_pictures/<key>).
--
-- Only rewrites Supabase-storage URLs; external avatars (Google/Discord, ~191)
-- are left untouched because they don't match the prefix.
-- Counts at authoring time: users.image_url 8, users.backdrop_url 4, dev_blog 0.
-- Idempotent (WHERE clause stops matching once rewritten).
-- =====================================================================

\set old 'https://ketxnamtpbvfvblowfoo.supabase.co/storage/v1/object/public/'
\set new 'https://minios3.timdobras.com/rottenbrains/'

UPDATE public.users
   SET image_url = replace(image_url, :'old', :'new')
 WHERE image_url LIKE :'old' || '%';

UPDATE public.users
   SET backdrop_url = replace(backdrop_url, :'old', :'new')
 WHERE backdrop_url LIKE :'old' || '%';

UPDATE public.dev_blog
   SET thumbnail = replace(thumbnail, :'old', :'new')
 WHERE thumbnail LIKE :'old' || '%';

-- dev_blog.images is text[]: rewrite each element.
UPDATE public.dev_blog
   SET images = (SELECT array_agg(replace(elem, :'old', :'new')) FROM unnest(images) AS elem)
 WHERE EXISTS (SELECT 1 FROM unnest(images) AS elem WHERE elem LIKE :'old' || '%');
