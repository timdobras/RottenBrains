-- Add hidden_until column to watch_history table
-- This allows users to temporarily hide items from their continue watching list

ALTER TABLE watch_history
ADD COLUMN IF NOT EXISTS hidden_until TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index for better query performance when filtering by hidden_until
CREATE INDEX IF NOT EXISTS idx_watch_history_hidden_until
ON watch_history(user_id, hidden_until)
WHERE hidden_until IS NOT NULL;

-- Update the get_next_episodes function is already using this column,
-- so no changes needed to that function
