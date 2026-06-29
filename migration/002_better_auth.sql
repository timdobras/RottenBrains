-- =====================================================================
-- Better Auth tables + user columns (P3). Column names/types match the
-- hand-authored Prisma models (account/session/verification) so we never
-- need `prisma db push` (which would drop the commented-out numeric genre
-- columns). Apply with psql; idempotent.
-- =====================================================================

-- Better Auth fields on the existing users table.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT true;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.account (
  id                       uuid PRIMARY KEY,
  account_id               text NOT NULL,
  provider_id              text NOT NULL,
  user_id                  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  access_token             text,
  refresh_token            text,
  id_token                 text,
  access_token_expires_at  timestamptz,
  refresh_token_expires_at timestamptz,
  scope                    text,
  password                 text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS account_user_id_idx ON public.account(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS account_provider_account_uidx ON public.account(provider_id, account_id);

CREATE TABLE IF NOT EXISTS public.session (
  id          uuid PRIMARY KEY,
  expires_at  timestamptz NOT NULL,
  token       text NOT NULL UNIQUE,
  ip_address  text,
  user_agent  text,
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS session_user_id_idx ON public.session(user_id);

CREATE TABLE IF NOT EXISTS public.verification (
  id          uuid PRIMARY KEY,
  identifier  text NOT NULL,
  value       text NOT NULL,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS verification_identifier_idx ON public.verification(identifier);
