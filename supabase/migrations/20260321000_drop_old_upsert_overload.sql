-- Fix: Drop the old 8-parameter overload of upsert_watch_history_atomic.
-- The original function (from 20260228) had 8 parameters. When migration
-- 20260308 added p_playback_position as a 9th parameter, PostgreSQL
-- created a SECOND function (overload) instead of replacing the first.
-- Fix: Drop the old 8-param version, keeping only the current 9-param version.
DROP FUNCTION IF EXISTS upsert_watch_history_atomic(UUID, TEXT, INTEGER, INTEGER, NUMERIC, INTEGER, INTEGER, TEXT);
