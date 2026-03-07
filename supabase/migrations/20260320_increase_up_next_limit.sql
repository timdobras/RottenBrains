-- Over-fetch in get_up_next_episodes so that after app-level filtering
-- (removing caught-up shows, shows with no next episode) we still end up
-- with ~10 visible items. The application layer slices to 10 after filtering.
-- Also bump get_continue_watching to 15 for a small safety margin.

CREATE OR REPLACE FUNCTION get_continue_watching(user_id_input UUID)
RETURNS TABLE (
  media_id INTEGER,
  media_type TEXT,
  season_number INTEGER,
  episode_number INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH latest_episodes AS (
        SELECT
            wh.media_id,
            wh.media_type,
            wh.season_number,
            wh.episode_number,
            wh.percentage_watched,
            wh.created_at,
            ROW_NUMBER() OVER (
                PARTITION BY wh.media_id
                ORDER BY wh.season_number DESC, wh.episode_number DESC
            ) AS row_num
        FROM watch_history wh
        WHERE wh.user_id = user_id_input
          AND wh.hidden_until IS NULL
    )
    SELECT
        le.media_id,
        le.media_type,
        le.season_number,
        le.episode_number
    FROM latest_episodes le
    WHERE le.row_num = 1
      AND NOT (le.media_type = 'movie' AND CAST(le.percentage_watched AS FLOAT) >= 75)
      AND CAST(le.percentage_watched AS FLOAT) < 75
    ORDER BY le.created_at DESC
    LIMIT 15;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_up_next_episodes(user_id_input UUID)
RETURNS TABLE (
  media_id INTEGER,
  media_type TEXT,
  season_number INTEGER,
  episode_number INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH latest_episodes AS (
        SELECT
            wh.media_id,
            wh.media_type,
            wh.season_number,
            wh.episode_number,
            wh.percentage_watched,
            wh.created_at,
            ROW_NUMBER() OVER (
                PARTITION BY wh.media_id
                ORDER BY wh.season_number DESC, wh.episode_number DESC
            ) AS row_num
        FROM watch_history wh
        WHERE wh.user_id = user_id_input
          AND wh.hidden_until IS NULL
    )
    SELECT
        le.media_id,
        le.media_type,
        le.season_number,
        le.episode_number
    FROM latest_episodes le
    WHERE le.row_num = 1
      AND le.media_type = 'tv'
      AND CAST(le.percentage_watched AS FLOAT) >= 75
    ORDER BY le.created_at DESC
    LIMIT 25;
END;
$$ LANGUAGE plpgsql;
