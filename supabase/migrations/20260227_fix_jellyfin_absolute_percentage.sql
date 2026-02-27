-- Fix: Jellyfin sync should SET percentage (absolute), not ADD to it.
--
-- The original RPC always accumulates percentage_watched, which is correct
-- for the app (sends incremental 30-second chunks). But Jellyfin sends
-- absolute values (e.g. "user is at 30% of the movie"), so adding 30%
-- to an existing 0% gives 30% (correct on first sync), but if the webhook
-- fires multiple times it keeps adding up past the real value.
--
-- Fix: When sync_source='jellyfin', use GREATEST(existing, new) instead
-- of existing + new. This ensures we never go backwards, but also never
-- overshoot the actual Jellyfin progress.

CREATE OR REPLACE FUNCTION upsert_watch_history_atomic(
    p_user_id UUID,
    p_media_type TEXT,
    p_media_id INTEGER,
    p_new_time_spent INTEGER,
    p_new_percentage NUMERIC,
    p_season_number INTEGER DEFAULT -1,
    p_episode_number INTEGER DEFAULT -1,
    p_sync_source TEXT DEFAULT 'app'
)
RETURNS JSONB AS $$
DECLARE
    result_row watch_history%ROWTYPE;
BEGIN
    INSERT INTO watch_history (
        user_id, media_type, media_id,
        time_spent, percentage_watched,
        season_number, episode_number,
        created_at, hidden_until, sync_source
    ) VALUES (
        p_user_id, p_media_type, p_media_id,
        p_new_time_spent,
        LEAST(p_new_percentage, 100),
        p_season_number, p_episode_number,
        NOW(), NULL, p_sync_source
    )
    ON CONFLICT (user_id, media_type, media_id, season_number, episode_number)
    DO UPDATE SET
        time_spent = CASE
            -- Jellyfin sends absolute time; use the greater value
            WHEN EXCLUDED.sync_source = 'jellyfin' THEN
                GREATEST(watch_history.time_spent, EXCLUDED.time_spent)
            -- App sends incremental time; accumulate
            ELSE
                watch_history.time_spent + EXCLUDED.time_spent
        END,
        percentage_watched = CASE
            -- Jellyfin sends absolute percentage; use the greater value
            WHEN EXCLUDED.sync_source = 'jellyfin' THEN
                LEAST(GREATEST(
                    watch_history.percentage_watched::NUMERIC,
                    EXCLUDED.percentage_watched::NUMERIC
                ), 100)
            -- App sends incremental percentage; accumulate
            ELSE
                LEAST(
                    watch_history.percentage_watched::NUMERIC + EXCLUDED.percentage_watched::NUMERIC,
                    100
                )
        END,
        created_at = NOW(),
        hidden_until = NULL,
        sync_source = EXCLUDED.sync_source
    RETURNING * INTO result_row;

    RETURN jsonb_build_object(
        'success', true,
        'action', 'upserted',
        'time_spent', result_row.time_spent,
        'percentage_watched', result_row.percentage_watched,
        'sync_source', result_row.sync_source
    );
END;
$$ LANGUAGE plpgsql;
