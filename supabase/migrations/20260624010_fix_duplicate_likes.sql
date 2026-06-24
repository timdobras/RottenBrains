-- Fix duplicate likes / post duplication bug.
--
-- Root cause: `likes` had no unique constraint on (user_id, post_id), so a user
-- could like the same post multiple times. Feed/profile RPCs LEFT JOIN likes on
-- the current user, so duplicate like rows made a post both render twice and show
-- an inflated total_likes. The unique constraint kills the fan-out at the source,
-- so no read function needs rewriting.

BEGIN;

-- 1. Dedupe likes: keep earliest row per (user_id, post_id)
DELETE FROM likes l USING (
  SELECT user_id, post_id, (array_agg(id ORDER BY created_at, id))[1] AS keep_id
  FROM likes GROUP BY user_id, post_id HAVING count(*) > 1
) d
WHERE l.user_id = d.user_id AND l.post_id = d.post_id AND l.id <> d.keep_id;

-- 2. Dedupe saves (defensive; none currently)
DELETE FROM saves s USING (
  SELECT user_id, post_id, (array_agg(id ORDER BY created_at, id))[1] AS keep_id
  FROM saves GROUP BY user_id, post_id HAVING count(*) > 1
) d
WHERE s.user_id = d.user_id AND s.post_id = d.post_id AND s.id <> d.keep_id;

-- 3. Prevent recurrence: one like / one save per user per post
ALTER TABLE likes ADD CONSTRAINT likes_user_post_unique UNIQUE (user_id, post_id);
ALTER TABLE saves ADD CONSTRAINT saves_user_post_unique UNIQUE (user_id, post_id);

-- 4. Recompute total_likes from the deduped rows (fixes historical drift)
UPDATE posts p SET total_likes = COALESCE((SELECT count(*) FROM likes l WHERE l.post_id = p.id), 0);

-- 5. Maintain total_likes atomically via trigger (immune to client bugs)
CREATE OR REPLACE FUNCTION public.posts_likes_count() RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET total_likes = total_likes + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET total_likes = GREATEST(total_likes - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_likes_count ON likes;
CREATE TRIGGER trg_likes_count AFTER INSERT OR DELETE ON likes
  FOR EACH ROW EXECUTE FUNCTION public.posts_likes_count();

-- 6. Neuter the old client-called counter RPCs so the currently-deployed app
--    (which still calls them) does not double-count now that the trigger owns it.
CREATE OR REPLACE FUNCTION public.increment_likes(post_id uuid) RETURNS void LANGUAGE plpgsql AS $fn$
BEGIN
  RETURN; -- no-op: total_likes maintained by trg_likes_count
END;
$fn$;
CREATE OR REPLACE FUNCTION public.decrement_likes(post_id uuid) RETURNS void LANGUAGE plpgsql AS $fn$
BEGIN
  RETURN; -- no-op: total_likes maintained by trg_likes_count
END;
$fn$;

COMMIT;
