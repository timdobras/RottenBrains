-- Performance optimizations - Round 2
-- Created: 2026-02-14

-- ============================================
-- ITEM 7: Composite index for get_next_episodes RPC
-- ============================================
-- The get_next_episodes function partitions by media_id and orders by
-- season_number DESC, episode_number DESC. This composite index covers
-- that window function exactly, avoiding a sort.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_watch_history_next_episodes
ON watch_history(user_id, media_id, season_number DESC, episode_number DESC)
WHERE hidden_until IS NULL;


-- ============================================
-- ITEM 8: Fix inverted partial index on hidden_until
-- ============================================
-- The existing index (idx_watch_history_hidden_until) indexes rows WHERE
-- hidden_until IS NOT NULL, but the get_next_episodes query filters for
-- hidden_until IS NULL. Drop the inverted index and create the correct one.
DROP INDEX IF EXISTS idx_watch_history_hidden_until;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_watch_history_not_hidden
ON watch_history(user_id, hidden_until)
WHERE hidden_until IS NULL;


-- ============================================
-- ITEM 9: Atomic upsert watch history RPC
-- ============================================
-- Replaces the current read-then-write pattern (SELECT + UPSERT every 30s)
-- with a single atomic INSERT...ON CONFLICT DO UPDATE that accumulates
-- time_spent and percentage_watched in one round-trip.
CREATE OR REPLACE FUNCTION upsert_watch_history_atomic(
    p_user_id UUID,
    p_media_type TEXT,
    p_media_id INTEGER,
    p_new_time_spent INTEGER,
    p_new_percentage NUMERIC,
    p_season_number INTEGER DEFAULT -1,
    p_episode_number INTEGER DEFAULT -1
)
RETURNS JSONB AS $$
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
        hidden_until = NULL  -- Reset hidden when user watches again
    RETURNING * INTO result_row;

    RETURN jsonb_build_object(
        'success', true,
        'action', 'upserted',
        'time_spent', result_row.time_spent,
        'percentage_watched', result_row.percentage_watched
    );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION upsert_watch_history_atomic(UUID, TEXT, INTEGER, INTEGER, NUMERIC, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_watch_history_atomic(UUID, TEXT, INTEGER, INTEGER, NUMERIC, INTEGER, INTEGER) TO service_role;

COMMENT ON FUNCTION upsert_watch_history_atomic IS
'Atomically upserts watch history in a single statement.
Accumulates time_spent and percentage_watched without a separate SELECT.
Resets hidden_until when user watches again.';
