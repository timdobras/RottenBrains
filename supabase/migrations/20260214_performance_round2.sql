-- Performance optimizations - Round 2: Indexes
-- Created: 2026-02-14

-- Composite index for get_next_episodes RPC
CREATE INDEX IF NOT EXISTS idx_watch_history_next_episodes
ON watch_history(user_id, media_id, season_number DESC, episode_number DESC)
WHERE hidden_until IS NULL;

-- Fix inverted partial index on hidden_until
DROP INDEX IF EXISTS idx_watch_history_hidden_until;

CREATE INDEX IF NOT EXISTS idx_watch_history_not_hidden
ON watch_history(user_id, hidden_until)
WHERE hidden_until IS NULL;
