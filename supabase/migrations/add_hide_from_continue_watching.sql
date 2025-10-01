-- Your original function with ONLY the hide feature added
-- This should work exactly like before, just with the ability to hide items

CREATE OR REPLACE FUNCTION get_next_episodes(user_id_input UUID)
RETURNS TABLE (
  media_id INTEGER,
  media_type TEXT,
  season_number INTEGER,
  episode_number INTEGER,
  next_episode BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH latest_episodes AS (
        SELECT
            le.user_id,
            le.media_id,
            le.media_type,
            le.season_number,
            le.episode_number,
            le.percentage_watched,
            le.created_at,
            le.hidden_until,
            ROW_NUMBER() OVER (PARTITION BY le.media_id ORDER BY le.season_number DESC, le.episode_number DESC) AS row_num
        FROM watch_history le
        WHERE le.user_id = user_id_input
          AND (le.hidden_until IS NULL)  -- ONLY NEW LINE: Filter out hidden items
    ),
    filtered_episodes AS (
        SELECT
            le.media_id,
            le.media_type,
            le.season_number,
            le.episode_number,

            CASE
                WHEN le.media_type = 'tv' AND CAST(le.percentage_watched AS FLOAT) >= 75 THEN TRUE
                ELSE FALSE
            END AS next_episode,
            le.created_at
        FROM latest_episodes le
        WHERE le.row_num = 1
        AND NOT (le.media_type = 'movie' AND CAST(le.percentage_watched AS FLOAT) >= 75)
    )
    SELECT
        fe.media_id,
        fe.media_type,
        fe.season_number,
        fe.episode_number,
        fe.next_episode
    FROM filtered_episodes fe
    ORDER BY fe.created_at DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;
