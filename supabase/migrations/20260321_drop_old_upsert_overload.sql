-- Fix: Drop the old 8-parameter overload of upsert_watch_history_atomic.
--
-- The original function (from 20260228) had 8 parameters. When migration
-- 20260308 added p_playback_position as a 9th parameter, PostgreSQL
-- created a SECOND function (overload) instead of replacing the first,
-- because CREATE OR REPLACE only replaces functions with the same signature.
--
-- This caused all callers passing 8 arguments to fail with:
--   "Could not choose the best candidate function between:
--    upsert_watch_history_atomic(8 params) and
--    upsert_watch_history_atomic(9 params)"
--
-- Fix: Drop the old 8-param version, keeping only the current 9-param version.

DROP FUNCTION IF EXISTS upsert_watch_history_atomic(UUID, TEXT, INTEGER, INTEGER, NUMERIC, INTEGER, INTEGER, TEXT);

-- Re-grant permissions on the remaining 9-param version to ensure
-- both authenticated users and service_role can call it.
GRANT EXECUTE ON FUNCTION upsert_watch_history_atomic(UUID, TEXT, INTEGER, INTEGER, NUMERIC, INTEGER, INTEGER, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_watch_history_atomic(UUID, TEXT, INTEGER, INTEGER, NUMERIC, INTEGER, INTEGER, TEXT, INTEGER) TO service_role;
