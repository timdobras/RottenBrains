-- Drop the jellyfin_sync_log table entirely.
-- Anti-loop dedup is now handled in-memory in the application layer.
DROP TABLE IF EXISTS jellyfin_sync_log;
