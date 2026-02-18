-- Atomic upsert watch history RPC
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
        hidden_until = NULL
    RETURNING * INTO result_row;

    RETURN jsonb_build_object(
        'success', true,
        'action', 'upserted',
        'time_spent', result_row.time_spent,
        'percentage_watched', result_row.percentage_watched
    );
END;
$$ LANGUAGE plpgsql
