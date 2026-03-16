-- 1. Drop the jellyfin_sync_log table entirely.
--    Anti-loop dedup is now handled in-memory in the application layer.
--    This frees up storage on Supabase.
DROP TABLE IF EXISTS jellyfin_sync_log;

-- 2. Fix Jellyfin sync percentage behavior.
--    Previously, Jellyfin used GREATEST(existing, new) which meant
--    the percentage could only go up, never down. If a user goes back
--    in a movie or rewatches it, the progress should reflect the actual
--    position — same as Videasy (direct overwrite).
CREATE OR REPLACE FUNCTION upsert_watch_history_atomic(
    p_user_id UUID,
    p_media_type TEXT,
    p_media_id INTEGER,
    p_new_time_spent INTEGER,
    p_new_percentage NUMERIC,
    p_season_number INTEGER DEFAULT -1,
    p_episode_number INTEGER DEFAULT -1,
    p_sync_source TEXT DEFAULT 'app',
    p_playback_position INTEGER DEFAULT NULL
)
RETURNS JSONB AS $$
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
$$ LANGUAGE plpgsql;

-- Re-grant permissions
GRANT EXECUTE ON FUNCTION upsert_watch_history_atomic(UUID, TEXT, INTEGER, INTEGER, NUMERIC, INTEGER, INTEGER, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_watch_history_atomic(UUID, TEXT, INTEGER, INTEGER, NUMERIC, INTEGER, INTEGER, TEXT, INTEGER) TO service_role;
