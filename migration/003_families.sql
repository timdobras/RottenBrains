-- 003_families.sql — families feature delta (captured 2026-06-29)
-- RLS NOT recreated; auth.users FKs retargeted to users.
-- NOTE: is_family_admin/is_family_member/is_integration_family_member OMITTED
--       (RLS-only helpers depending on auth.uid(); membership now enforced app-side).

-- TABLES
CREATE TABLE public.families (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
); 

CREATE TABLE public.family_integrations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL,
  type text NOT NULL,
  server_url text,
  api_key text,
  webhook_secret text NOT NULL DEFAULT (gen_random_uuid())::text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
); 

CREATE TABLE public.family_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL,
  code text NOT NULL DEFAULT encode(gen_random_bytes(9), 'hex'::text),
  created_by uuid,
  expires_at timestamp with time zone,
  max_uses integer,
  uses integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
); 

CREATE TABLE public.family_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
); 

CREATE TABLE public.integration_member_links (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL,
  user_id uuid NOT NULL,
  external_user_id text,
  external_username text,
  access_token text,
  sync_enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
); 

-- CONSTRAINTS
ALTER TABLE public.families ADD CONSTRAINT families_pkey PRIMARY KEY (id);
ALTER TABLE public.family_integrations ADD CONSTRAINT family_integrations_family_id_type_server_url_key UNIQUE (family_id, type, server_url);
ALTER TABLE public.family_integrations ADD CONSTRAINT family_integrations_pkey PRIMARY KEY (id);
ALTER TABLE public.family_invites ADD CONSTRAINT family_invites_code_key UNIQUE (code);
ALTER TABLE public.family_invites ADD CONSTRAINT family_invites_pkey PRIMARY KEY (id);
ALTER TABLE public.family_members ADD CONSTRAINT family_members_family_id_user_id_key UNIQUE (family_id, user_id);
ALTER TABLE public.family_members ADD CONSTRAINT family_members_pkey PRIMARY KEY (id);
ALTER TABLE public.family_members ADD CONSTRAINT family_members_role_check CHECK ((role = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text])));
ALTER TABLE public.integration_member_links ADD CONSTRAINT integration_member_links_integration_id_user_id_key UNIQUE (integration_id, user_id);
ALTER TABLE public.integration_member_links ADD CONSTRAINT integration_member_links_pkey PRIMARY KEY (id);
ALTER TABLE public.families ADD CONSTRAINT families_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public.family_integrations ADD CONSTRAINT family_integrations_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public.family_integrations ADD CONSTRAINT family_integrations_family_id_fkey FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE;
ALTER TABLE public.family_invites ADD CONSTRAINT family_invites_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public.family_invites ADD CONSTRAINT family_invites_family_id_fkey FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE;
ALTER TABLE public.family_members ADD CONSTRAINT family_members_family_id_fkey FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE;
ALTER TABLE public.family_members ADD CONSTRAINT family_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public.integration_member_links ADD CONSTRAINT integration_member_links_integration_id_fkey FOREIGN KEY (integration_id) REFERENCES family_integrations(id) ON DELETE CASCADE;
ALTER TABLE public.integration_member_links ADD CONSTRAINT integration_member_links_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
-- INDEXES
CREATE INDEX idx_family_members_user ON public.family_members USING btree (user_id);
CREATE INDEX idx_family_members_family ON public.family_members USING btree (family_id);
CREATE INDEX idx_family_invites_code ON public.family_invites USING btree (code);
CREATE INDEX idx_family_integrations_family_type ON public.family_integrations USING btree (family_id, type);
CREATE INDEX idx_family_integrations_webhook ON public.family_integrations USING btree (webhook_secret);
CREATE INDEX idx_integration_member_links_integration ON public.integration_member_links USING btree (integration_id);
CREATE INDEX idx_integration_member_links_user ON public.integration_member_links USING btree (user_id);
CREATE INDEX idx_integration_member_links_external ON public.integration_member_links USING btree (integration_id, external_user_id);
