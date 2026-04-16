-- Add jellyfin_username column for display purposes.
-- The api_key column now stores either an admin API key or a per-user
-- access token from AuthenticateByName (both use X-Emby-Token header).
ALTER TABLE user_jellyfin_config
  ADD COLUMN IF NOT EXISTS jellyfin_username TEXT;
