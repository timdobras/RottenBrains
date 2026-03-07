-- Function to get playback position for a specific media item.
-- Used by watch pages to fetch resume position for players that support it.

CREATE OR REPLACE FUNCTION get_playback_position(
    p_user_id UUID,
    p_media_type TEXT,
    p_media_id INTEGER,
    p_season_number INTEGER DEFAULT NULL,
    p_episode_number INTEGER DEFAULT NULL
)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT playback_position
        FROM watch_history
        WHERE user_id = p_user_id
          AND media_type = p_media_type
          AND media_id = p_media_id
          AND season_number = COALESCE(p_season_number, -1)
          AND episode_number = COALESCE(p_episode_number, -1)
    );
END;
$$ LANGUAGE plpgsql;
