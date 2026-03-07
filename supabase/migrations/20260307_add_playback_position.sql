-- Add playback_position column to watch_history.
--
-- This stores the actual video playback position in seconds (where the user
-- paused or last reported their position). This is different from time_spent
-- which accumulates total wall-clock time on the page.
--
-- Only players that support postMessage progress reporting (e.g. Videasy)
-- will populate this field. For other providers it remains NULL.

ALTER TABLE watch_history
ADD COLUMN IF NOT EXISTS playback_position INTEGER DEFAULT NULL;
