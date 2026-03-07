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
            WHEN EXCLUDED.sync_source = 'videasy' THEN
                EXCLUDED.time_spent
            WHEN EXCLUDED.sync_source = 'jellyfin' THEN
                GREATEST(watch_history.time_spent, EXCLUDED.time_spent)
            ELSE
                watch_history.time_spent + EXCLUDED.time_spent
        END,
        percentage_watched = CASE
            WHEN EXCLUDED.sync_source = 'videasy' THEN
                LEAST(EXCLUDED.percentage_watched::NUMERIC, 100)
            WHEN EXCLUDED.sync_source = 'jellyfin' THEN
                LEAST(GREATEST(
                    watch_history.percentage_watched::NUMERIC,
                    EXCLUDED.percentage_watched::NUMERIC
                ), 100)
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
