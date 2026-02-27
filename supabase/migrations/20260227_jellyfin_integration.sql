-- Jellyfin Integration: bidirectional watch sync
-- Creates config table, sync log table, adds sync_source to watch_history,
-- and updates the atomic upsert RPC to accept sync_source.

-- ============================================================
-- 1. user_jellyfin_config — per-user Jellyfin connection settings
-- ============================================================
CREATE TABLE IF NOT EXISTS user_jellyfin_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    server_url TEXT NOT NULL,
    api_key TEXT NOT NULL,
    jellyfin_user_id TEXT NOT NULL,
    sync_enabled BOOLEAN NOT NULL DEFAULT true,
    webhook_secret TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id)
);

-- RLS policies
ALTER TABLE user_jellyfin_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own jellyfin config"
    ON user_jellyfin_config FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own jellyfin config"
    ON user_jellyfin_config FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jellyfin config"
    ON user_jellyfin_config FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own jellyfin config"
    ON user_jellyfin_config FOR DELETE
    USING (auth.uid() = user_id);

-- Service role needs to read config for webhook processing
-- (webhooks come without user auth, we look up by webhook_secret)
CREATE POLICY "Service role can read all jellyfin configs"
    ON user_jellyfin_config FOR SELECT
    USING (auth.role() = 'service_role');

-- ============================================================
-- 2. jellyfin_sync_log — audit trail for sync events
-- ============================================================
CREATE TABLE IF NOT EXISTS jellyfin_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    direction TEXT NOT NULL CHECK (direction IN ('to_jellyfin', 'from_jellyfin')),
    media_type TEXT NOT NULL,
    media_id INTEGER NOT NULL,
    season_number INTEGER,
    episode_number INTEGER,
    status TEXT NOT NULL CHECK (status IN ('success', 'skipped', 'error')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying user's recent sync events
CREATE INDEX idx_jellyfin_sync_log_user_created
    ON jellyfin_sync_log (user_id, created_at DESC);

-- Index for anti-loop timestamp dedup check
CREATE INDEX idx_jellyfin_sync_log_dedup
    ON jellyfin_sync_log (user_id, media_type, media_id, direction, created_at DESC);

-- RLS policies
ALTER TABLE jellyfin_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own sync logs"
    ON jellyfin_sync_log FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all sync logs"
    ON jellyfin_sync_log FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================
-- 3. Add sync_source column to watch_history
-- ============================================================
ALTER TABLE watch_history
    ADD COLUMN IF NOT EXISTS sync_source TEXT NOT NULL DEFAULT 'app';

-- ============================================================
-- 4. Updated atomic upsert RPC with sync_source parameter
-- ============================================================
CREATE OR REPLACE FUNCTION upsert_watch_history_atomic(
    p_user_id UUID,
    p_media_type TEXT,
    p_media_id INTEGER,
    p_new_time_spent INTEGER,
    p_new_percentage NUMERIC,
    p_season_number INTEGER DEFAULT -1,
    p_episode_number INTEGER DEFAULT -1,
    p_sync_source TEXT DEFAULT 'app'
)
RETURNS JSONB AS $$
DECLARE
    result_row watch_history%ROWTYPE;
BEGIN
    INSERT INTO watch_history (
        user_id, media_type, media_id,
        time_spent, percentage_watched,
        season_number, episode_number,
        created_at, hidden_until, sync_source
    ) VALUES (
        p_user_id, p_media_type, p_media_id,
        p_new_time_spent,
        LEAST(p_new_percentage, 100),
        p_season_number, p_episode_number,
        NOW(), NULL, p_sync_source
    )
    ON CONFLICT (user_id, media_type, media_id, season_number, episode_number)
    DO UPDATE SET
        time_spent = watch_history.time_spent + EXCLUDED.time_spent,
        percentage_watched = LEAST(
            watch_history.percentage_watched::NUMERIC + EXCLUDED.percentage_watched::NUMERIC,
            100
        ),
        created_at = NOW(),
        hidden_until = NULL,
        sync_source = EXCLUDED.sync_source
    RETURNING * INTO result_row;

    RETURN jsonb_build_object(
        'success', true,
        'action', 'upserted',
        'time_spent', result_row.time_spent,
        'percentage_watched', result_row.percentage_watched,
        'sync_source', result_row.sync_source
    );
END;
$$ LANGUAGE plpgsql;
