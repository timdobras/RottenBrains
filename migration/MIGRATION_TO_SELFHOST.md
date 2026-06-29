# RottenBrains — Supabase → Self-Hosted Migration

**Goal:** move off Supabase (high latency from eu-central, limited control) to a self-hosted
stack on the homelab. Done **incrementally, part by part** — each phase below is independently
shippable and reversible.

**Started:** 2026-06-29

## Target architecture

| Concern | From (Supabase) | To (self-hosted) |
|---|---|---|
| Database | Supabase Postgres (eu-central-1) | **Plain Postgres on db-server `10.10.20.7`** |
| Data layer | `supabase-js` `.from()` / `.rpc()` | **Prisma** + raw SQL for the heavy RPC functions |
| Auth | Supabase Auth (GoTrue) | **Better Auth** — email/password + Google + Discord |
| Storage | Supabase Storage (3 buckets) | **MinIO** (`10.10.20.55`, already running) |
| Realtime | `postgres_changes` on `notifications` | **Dropped** — notification badge polls on load |
| Background jobs | pg_cron + API routes | **BullMQ worker + Redis** |

**Decisions locked with the owner (2026-06-29):**
- Not self-hosting the full Supabase stack (too heavy) — bare Postgres + Better Auth + Prisma.
- DB lives on db-server (owner freeing disk space there; it's at ~92% / 33 GB free, but this DB is tiny).
- Realtime is not needed — remove it.
- Full backfill: same users + all data.

### The one critical invariant
**Better Auth `user.id` = the existing Supabase `auth.users.id` (UUID).**
Every FK in the app (`posts.creatorid`, `likes.user_id`, `watch_history.user_id`, …) references a
user UUID, so preserving the UUIDs makes the entire data backfill a clean 1:1 copy with **zero
remapping**. `public.users` becomes the canonical root user table (Better Auth's user model maps
onto it); its old FK to `auth.users` is dropped.

## What's actually on Supabase today (recon 2026-06-29)

- **Project:** `ketxnamtpbvfvblowfoo` (RottenBrains), region eu-central-1.
- **Data is tiny:** ~5,000 rows total. `watch_history` 2.9k, `likes` 583, `posts` 471, `users` 319.
- **16 public tables**, **54 functions**, **non-constraint indexes** 36, **12 triggers**, **38 RLS policies**.
- **Extensions in use that matter:** `uuid-ossp`, `pgcrypto`, `pg_cron` (2 cleanup jobs). `pgsodium`/`vault` are Supabase-auth internals — not needed.
- **Auth: 356 users**, all email-confirmed.
  - 155 email/password — bcrypt `$2a$10$` hashes (Better Auth verifies via a custom hasher, rehashes on next login).
  - 213 Google + 12 Discord OAuth identities (in `auth.identities`, keyed by provider `sub`).
- **Storage:** 3 public buckets, ~74 small objects (`profile_pictures` 35, `dev_blog_images` 26, `backdrop_pictures` 13).
- **All 54 functions are pure** (take `user_id` as a param; **zero** reference `auth.uid()`/`auth.*`) → they port to plain Postgres 1:1. Only `on_auth_user_created` trigger is auth-coupled (replaced by Better Auth).

### Code coupling (from full-repo scan)
- Client factories: `lib/supabase/{client,server,serviceClient,middleware}.ts`.
- Auth surfaces: `middleware.ts`, `lib/auth/premiumCookie.ts`, `app/(auth)/login|register`, `app/(auth)/auth/callback/route.ts`, `lib/server/OAuthSignIn.ts` (Google + Discord), `components/features/auth/GoogleOneTap.tsx`.
- Data: **103 `.from()` queries**, **18 distinct `.rpc()` calls** (~60% server, ~40% client). Client-side queries on `user_ip_addresses`, `user_jellyfin_config`, `notifications` currently rely on RLS — these move to server actions / app-layer checks.
- Storage: `lib/supabase/clientQueries.ts` (profile + backdrop uploads).
- Realtime: only `components/features/notifications/NotificationButton.tsx` (`notifications` channel) → replace with poll-on-load.

## Coexistence strategy (agreed 2026-06-29) — strangler, then final flip
Migrate the **code** incrementally; move the **database** once at the end. The hard constraint:
data lives in ONE db at a time (every table FKs to `users`, so it can't be split by feature), so
old (supabase-js) and new (Prisma) code must point at the **same** db during coexistence.

1. **Point Prisma at the *current Supabase* db** (owner provides the direct connection string).
   Apply `002_better_auth.sql` to Supabase too (additive — so the `users` model's `email_verified`/
   `updated_at` columns exist and the Prisma schema matches). Both code paths now hit one db → no divergence.
2. **Migrate data modules to Prisma one at a time**, deploying on master as we go. Identity comes from
   the Supabase session via the seam `lib/server/current-user.ts` (`getCurrentUserId`). Auth stays on
   Supabase this whole phase. Un-migrated modules keep using supabase-js. Test each in prod.
3. **Final flip (short window):** sync data Supabase→local, change Prisma `DATABASE_URL` → local db
   (latency win lands here), swap the identity seam + auth → Better Auth, remove supabase-js.

The local db + Better Auth + backfill already built = the step-3 destination (validated, waiting).
**Blocked on:** owner to provide the Supabase Postgres connection string (Dashboard → Project Settings
→ Database → Connection string / direct, with the DB password).

## Phase plan

- [x] **P1 — Schema + new DB.** ✅ 2026-06-29. Coolify-managed Postgres (`postgres:17-alpine`) + Redis
  (`redis:7.2`) provisioned on db-server in the RottenBrains project. `001_core_schema.sql` applied
  in one transaction: 16 tables, 54 app functions, 24 FKs, 61 indexes, 12 triggers. Conn details in
  `CONNECTION.local.md` (gitignored). PG `10.10.20.7:5438`, Redis `10.10.20.7:6383`.
- [~] **P2 — Data backfill.** ✅ **data half done** 2026-06-29 (`backfill/010_data_backfill.sql`):
  all 16 app tables mirror Supabase (5,423 rows), counts verified 1:1, FK integrity clean, `jsonb[]`
  round-trips OK. Loaded with `session_replication_role=replica` (triggers/FK off). **Remaining:**
  auth backfill (`auth.users`/`auth.identities` → Better Auth `account`/`session`, preserve UUIDs +
  bcrypt + emailVerified) — depends on P3 creating those tables. Storage objects → MinIO (P5).
- [~] **P3 — Auth swap.** ✅ **foundation done + verified** 2026-06-29. Installed Prisma 6 (introspected
  → `prisma/schema.prisma`) + Better Auth + bcryptjs. `lib/auth.ts` maps Better Auth's `user` model
  onto the `users` table (bcrypt verify/hash, google+discord social w/ account-linking, session cookie
  cache, databaseHook defaults username=email). `002_better_auth.sql` applied (account/session/
  verification + users.email_verified/updated_at). `backfill/020_auth_backfill.sql` applied — 155
  credential + 213 google + 12 discord accounts, 0 orphans. Route `app/api/auth/[...all]/route.ts`
  + `lib/auth-client.ts`. **End-to-end test passed**: signup→signin creates users row + bcrypt
  credential acct + session, genre-stats trigger fires, cascade-delete clean.
  **Building blocks built + validated (additive new modules):** `lib/server/auth-session.ts`
  (`getServerUser`/`getServerSession`, react-cached) replaces `supabase.auth.getUser()`; `lib/db/rpc.ts`
  (`rpc`/`rpcOne`/`jsonb`/`serializeRows`) calls the ported DB functions via Prisma named-arg SQL —
  pattern validated against `get_continue_watching`, `get_top_movie_genres_for_user`,
  `get_batch_watched_items` (jsonb). `lib/prisma.ts` singleton.
  **Remaining (the cutover rewire — touches shared/active files, do in a freeze window):** swap the
  supabase-js factories + `middleware.ts` + login/register actions + OAuth sign-in + callback +
  GoogleOneTap + getCurrentUser + the ~103 `.from()`/18 `.rpc()` call sites onto Better Auth + Prisma.
  *Needs from owner:* GOOGLE_CLIENT_ID/SECRET + DISCORD_CLIENT_ID/SECRET, and new redirect URIs added
  in the Google + Discord consoles (`/api/auth/callback/google` + `/discord`).
- [~] **P4 — Data-layer swap (strangler, in progress).** ✅ pattern PROVEN 2026-06-29: `lib/db/queries.ts`
  (Prisma, identical signatures to `serverQueries.ts`) — getUserFromDB/getPostById tested vs local mirror.
  Identity via `lib/server/current-user.ts` seam (Supabase session now → Better Auth at flip). `rpc()` helper
  calls the ported DB functions. Full `serverQueries.ts` (27 fns) port underway. **TODO:** finish serverQueries,
  then `clientQueries.ts` — but client-component queries run in the browser where Prisma can't, so those become
  server actions / API routes (bigger transform). Then switch call-site imports one at a time.
  Dev/test against the LOCAL mirror (this LXC can't reach Supabase Postgres directly — see CONNECTION.local.md).
- [ ] **P5 — Storage → MinIO** + **drop realtime** (polling badge).
- [ ] **P6 — BullMQ worker + cutover.** Jobs: notification fan-out (replacing the like/follow/comment/post triggers), new-episode checks + the 2 pg_cron cleanups, TMDB sync/caching, image processing. Then flip env + DNS.

## Worker scope (owner-selected, all four)
1. **Notification fan-out** — move the like/comment/follow/new-post notification generation off DB triggers into the worker.
2. **New-episode checks + cron** — `/api/new-episodes` polling + the 2 pg_cron cleanups → scheduled BullMQ jobs.
3. **TMDB sync / caching** — background prefetch/cache of TMDB metadata.
4. **Image processing** — resize/optimize profile + backdrop uploads (sharp) → MinIO.

## ⚠️ Concurrent development — re-sync before cutover
The repo is under active development *during* this migration. The **families feature**
(commit `4ffcb55`) added 5 tables (`families`, `family_members`, `family_invites`,
`family_integrations`, `integration_member_links`) + 3 RLS helper fns to Supabase *after* my
initial capture; Jellyfin integration was refactored onto `integration_member_links`
(`user_jellyfin_config` kept as rollback). Synced into the new DB via `003_families.sql` +
`backfill/030_families_backfill.sql` (2026-06-29) → new DB now 24 tables, faithful mirror.
There is also **uncommitted native-player POC** work in the tree (`NativePlayer.tsx`,
`app/api/stream/`, modified `middleware.ts`). **Implication:** the final cutover needs a brief
code/DB freeze + a final schema+data delta re-sync. Supabase mgmt API: use **curl, not python**
(Cloudflare 1010 blocks the python UA).

## Credentials prepared (2026-06-29)
- **OAuth**: pulled Google + Discord client IDs/secrets from Supabase auth config → app `.env.local`.
  Reuse the existing OAuth apps; only redirect URIs need adding in the consoles at cutover.
- **MinIO**: bucket `rottenbrains` created. Public policy + scoped service account + the ~74-object
  copy + DB URL rewrite are deferred to cutover (PUT-with-body hangs from CT137 → do from another host).

## Open items / decisions needed
- **Provision style:** add Postgres + Redis to the RottenBrains Coolify project (managed backups, consistent with the other DBs) vs. standalone `docker run`. *Leaning Coolify-managed.*
- **Public endpoint:** browser-side calls (storage uploads, any client data fetch) need the new API reachable from browsers → expose via Traefik (e.g. a subdomain) or move all such calls server-side. Storage uploads will go through a server action hitting MinIO.
- **`user_ip_addresses.ip_address`** is `inet`. Keep `inet` in Postgres; model as `String`/`Unsupported` in Prisma (or switch to `text`). *Leaning keep inet, handle in app.*
- **`users.feed_genres`** is `jsonb[]`; `dev_blog.{images,features,tags}` are `text[]`.
- Better Auth maps onto existing `users` table; adds columns `email_verified bool`, `updated_at timestamptz`, maps `image` → `image_url`. Extra profile fields (username, bio, premium, …) configured as additionalFields.

## Artifacts in `migration/`
- `schema/tables.sql` — 16 CREATE TABLE (catalog-generated, identifiers quoted).
- `schema/functions.sql` — 54 functions (verbatim `pg_get_functiondef`).
- `schema/constraints.sql` — PK/UNIQUE/CHECK/FK (raw; `001` applies the auth-FK adaptations).
- `schema/indexes_nonconstraint.sql` — 36 indexes (constraint-backed ones excluded).
- `schema/triggers.sql` — 11 triggers (raw).
- `schema/rls_policies.txt` — 38 RLS policies (reference for app-layer auth rules; not recreated).
- `schema/columns.txt` — full column inventory.
- **`001_core_schema.sql`** — consolidated, ready-to-apply rebuild (extensions → tables → functions → adapted constraints → indexes → adapted triggers). **Not yet validated against a live Postgres.**
- _next:_ `002_better_auth.sql`, `backfill/` scripts.
