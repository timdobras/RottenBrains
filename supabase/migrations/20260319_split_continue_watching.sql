-- Split the combined get_next_episodes into two focused RPCs:
--   1. get_continue_watching  — in-progress items (< 75% watched)
--   2. get_up_next_episodes   — TV episodes where previous ep is done (>= 75%)
-- Each has its own LIMIT 10, so both sections get a full set of results.

-- 1. In-progress items: movies and TV episodes the user hasn't finished yet
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
      -- Exclude completed movies (>= 75%)
      AND NOT (le.media_type = 'movie' AND CAST(le.percentage_watched AS FLOAT) >= 75)
      -- Only include items that are still in progress (< 75%)
      AND CAST(le.percentage_watched AS FLOAT) < 75
    ORDER BY le.created_at DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- 2. TV episodes where the user finished the previous episode and should watch the next one
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
      -- Only TV shows where the episode is completed (>= 75%)
      AND le.media_type = 'tv'
      AND CAST(le.percentage_watched AS FLOAT) >= 75
    ORDER BY le.created_at DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;
