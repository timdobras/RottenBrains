-- Batch function to get percentage watched for multiple items at once
-- Replaces N separate RPC calls with a single query
-- Created: 2026-01-10

CREATE OR REPLACE FUNCTION get_batch_percentage_watched(
    p_user_id UUID,
    p_items JSONB  -- Array of {media_type, media_id, season_number, episode_number}
)
RETURNS TABLE (
    media_type TEXT,
    media_id INTEGER,
    season_number INTEGER,
    episode_number INTEGER,
    percentage_watched NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH input_items AS (
        SELECT
            (item->>'media_type')::TEXT AS media_type,
            (item->>'media_id')::INTEGER AS media_id,
            COALESCE((item->>'season_number')::INTEGER, -1) AS season_number,
            COALESCE((item->>'episode_number')::INTEGER, -1) AS episode_number
        FROM jsonb_array_elements(p_items) AS item
    )
    SELECT
        i.media_type,
        i.media_id,
        i.season_number,
        i.episode_number,
        COALESCE(wh.percentage_watched::NUMERIC, 0) AS percentage_watched
    FROM input_items i
    LEFT JOIN watch_history wh ON
        wh.user_id = p_user_id
        AND wh.media_type = i.media_type
        AND wh.media_id = i.media_id
        AND COALESCE(wh.season_number, -1) = i.season_number
        AND COALESCE(wh.episode_number, -1) = i.episode_number;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION get_batch_percentage_watched(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_batch_percentage_watched(UUID, JSONB) TO service_role;

COMMENT ON FUNCTION get_batch_percentage_watched IS
'Batch retrieves percentage watched for multiple media items in a single query.
Input: user_id and JSONB array of items with media_type, media_id, season_number, episode_number.
Returns: Table with matched percentage_watched values (0 if not found).';
