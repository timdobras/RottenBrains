-- Families: shared "household" groups that own integrations (Jellyfin, Jellyseerr, *arr, ...)
--
-- Model:
--   families                  — a household, owned by one user
--   family_members            — who belongs, with a role (owner|admin|member)
--   family_invites            — redeemable codes to join a family
--   family_integrations       — an integration owned by the family (type-tagged, generic)
--   integration_member_links  — per-member binding to an integration (e.g. each member's
--                               own Jellyfin account/token on the family's shared server)
--
-- Access control is enforced via RLS using SECURITY DEFINER helpers to avoid the
-- classic recursive-policy trap on family_members.
--
-- NOTE: tables are created first, then the helper functions (their SQL bodies
-- reference family_members / family_integrations and are validated at creation),
-- then the RLS policies that call those helpers.

-- ============================================================
-- 1. Tables (+ indexes, RLS enabled; policies added later)
-- ============================================================
CREATE TABLE IF NOT EXISTS families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE families ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (family_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_family_members_user ON family_members (user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_family ON family_members (family_id);
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS family_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(9), 'hex'),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ,
    max_uses INTEGER,
    uses INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_family_invites_code ON family_invites (code);
ALTER TABLE family_invites ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS family_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    type TEXT NOT NULL,                              -- 'jellyfin' | 'jellyseerr' | 'sonarr' | 'radarr' | ...
    server_url TEXT,
    api_key TEXT,                                    -- shared/admin key for the integration
    webhook_secret TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    config JSONB NOT NULL DEFAULT '{}'::JSONB,        -- type-specific extras
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (family_id, type, server_url)
);
CREATE INDEX IF NOT EXISTS idx_family_integrations_family_type ON family_integrations (family_id, type);
CREATE INDEX IF NOT EXISTS idx_family_integrations_webhook ON family_integrations (webhook_secret);
ALTER TABLE family_integrations ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS integration_member_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID NOT NULL REFERENCES family_integrations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    external_user_id TEXT,                           -- e.g. jellyfin_user_id
    external_username TEXT,
    access_token TEXT,                               -- per-member token (X-Emby-Token for Jellyfin)
    sync_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (integration_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_integration_member_links_integration ON integration_member_links (integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_member_links_user ON integration_member_links (user_id);
CREATE INDEX IF NOT EXISTS idx_integration_member_links_external
    ON integration_member_links (integration_id, external_user_id);
ALTER TABLE integration_member_links ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. Membership helper functions (SECURITY DEFINER → bypass RLS, no recursion)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_family_member(p_family_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM family_members
    WHERE family_id = p_family_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_family_admin(p_family_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM family_members
    WHERE family_id = p_family_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_integration_family_member(p_integration_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM family_integrations fi
    JOIN family_members fm ON fm.family_id = fi.family_id
    WHERE fi.id = p_integration_id AND fm.user_id = auth.uid()
  );
$$;

-- ============================================================
-- 3. RLS policies
-- ============================================================
-- families
CREATE POLICY "Members can read their families"
    ON families FOR SELECT USING (public.is_family_member(id));
CREATE POLICY "Users can create families they own"
    ON families FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Admins can update their family"
    ON families FOR UPDATE USING (public.is_family_admin(id));
CREATE POLICY "Owner can delete their family"
    ON families FOR DELETE USING (owner_id = auth.uid());
CREATE POLICY "Service role full access to families"
    ON families FOR ALL USING (auth.role() = 'service_role');

-- family_members
CREATE POLICY "Members can read co-members"
    ON family_members FOR SELECT USING (public.is_family_member(family_id));
CREATE POLICY "Admins can add members"
    ON family_members FOR INSERT WITH CHECK (public.is_family_admin(family_id));
CREATE POLICY "Admins can update members"
    ON family_members FOR UPDATE USING (public.is_family_admin(family_id));
CREATE POLICY "Admins remove members or members leave"
    ON family_members FOR DELETE USING (public.is_family_admin(family_id) OR user_id = auth.uid());
CREATE POLICY "Service role full access to family_members"
    ON family_members FOR ALL USING (auth.role() = 'service_role');

-- family_invites
CREATE POLICY "Admins can read their family invites"
    ON family_invites FOR SELECT USING (public.is_family_admin(family_id));
CREATE POLICY "Admins can create invites"
    ON family_invites FOR INSERT WITH CHECK (public.is_family_admin(family_id));
CREATE POLICY "Admins can delete invites"
    ON family_invites FOR DELETE USING (public.is_family_admin(family_id));
CREATE POLICY "Service role full access to family_invites"
    ON family_invites FOR ALL USING (auth.role() = 'service_role');

-- family_integrations
CREATE POLICY "Members can read family integrations"
    ON family_integrations FOR SELECT USING (public.is_family_member(family_id));
CREATE POLICY "Admins can insert family integrations"
    ON family_integrations FOR INSERT WITH CHECK (public.is_family_admin(family_id));
CREATE POLICY "Admins can update family integrations"
    ON family_integrations FOR UPDATE USING (public.is_family_admin(family_id));
CREATE POLICY "Admins can delete family integrations"
    ON family_integrations FOR DELETE USING (public.is_family_admin(family_id));
CREATE POLICY "Service role full access to family_integrations"
    ON family_integrations FOR ALL USING (auth.role() = 'service_role');

-- integration_member_links
CREATE POLICY "Family members can read integration links"
    ON integration_member_links FOR SELECT USING (public.is_integration_family_member(integration_id));
CREATE POLICY "Users manage their own integration link (insert)"
    ON integration_member_links FOR INSERT
    WITH CHECK (user_id = auth.uid() AND public.is_integration_family_member(integration_id));
CREATE POLICY "Users manage their own integration link (update)"
    ON integration_member_links FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users manage their own integration link (delete)"
    ON integration_member_links FOR DELETE
    USING (user_id = auth.uid() OR public.is_integration_family_member(integration_id));
CREATE POLICY "Service role full access to integration_member_links"
    ON integration_member_links FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- 4. Backfill from existing user_jellyfin_config
--    Each existing Jellyfin user gets a personal family (they own) + a family
--    Jellyfin integration + their own member link. Preserves webhook_secret so
--    already-configured Jellyfin webhooks keep working.
--    user_jellyfin_config is intentionally LEFT IN PLACE as a rollback safety net;
--    drop it in a later migration once the family model is verified in prod.
-- ============================================================
DO $$
DECLARE
    r RECORD;
    v_family_id UUID;
    v_integration_id UUID;
    v_label TEXT;
BEGIN
    FOR r IN SELECT * FROM user_jellyfin_config LOOP
        SELECT COALESCE(NULLIF(name, ''), NULLIF(username, ''), 'My')
          INTO v_label
          FROM users WHERE id = r.user_id;

        INSERT INTO families (name, owner_id)
        VALUES (COALESCE(v_label, 'My') || '''s Family', r.user_id)
        RETURNING id INTO v_family_id;

        INSERT INTO family_members (family_id, user_id, role)
        VALUES (v_family_id, r.user_id, 'owner');

        INSERT INTO family_integrations (family_id, type, server_url, api_key, webhook_secret, created_by)
        VALUES (v_family_id, 'jellyfin', r.server_url, r.api_key, r.webhook_secret, r.user_id)
        RETURNING id INTO v_integration_id;

        INSERT INTO integration_member_links
            (integration_id, user_id, external_user_id, external_username, access_token, sync_enabled)
        VALUES
            (v_integration_id, r.user_id, r.jellyfin_user_id, r.jellyfin_username, r.api_key, r.sync_enabled);
    END LOOP;
END $$;
