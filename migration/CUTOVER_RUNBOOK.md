# RottenBrains self-host cutover runbook

Merging `migrate/self-host` → `master` triggers a Coolify deploy = the cutover.
The branch is build- and runtime-validated and merges clean (only package.json
deps, already resolved on the branch). Below is the turnkey sequence.

## What the cutover does
Flips the live app from Supabase (Auth + Postgres + Storage) to the self-hosted
stack: **Postgres `10.10.20.7:5438`** (Prisma), **Better Auth**, **MinIO**. All
users re-login (new session system). The old Supabase project is untouched =
the rollback.

## 0. Pre-cutover (do anytime before — no downtime)
- [ ] **Google console** → add redirect URI `https://rotten-brains.com/api/auth/callback/google`
- [ ] **Discord console** → add redirect URI `https://rotten-brains.com/api/auth/callback/discord`
- [x] Coolify env vars added (DATABASE_URL, BETTER_AUTH_*, GOOGLE_/DISCORD_*, MINIO_*).
- [x] Storage objects copied to MinIO + bucket public policy set.
- [x] Schema (001/002/003) already applied to the new Postgres (it IS the DATABASE_URL target).
- [x] Dockerfile + next.config staged for Prisma on Next standalone.

## 1. Freeze (start downtime — keep it short)
- [ ] Put the app in maintenance OR stop the current (Supabase) container so no
      new writes hit Supabase during the sync. (Coolify: stop the app.)

## 2. Final data re-sync (Supabase → new Postgres)
The new DB is stale vs live Supabase. Re-sync with the latest:
```bash
cd /root/projects/RottenBrains-migrate   # or the deployed checkout
export SUPABASE_ACCESS_TOKEN=<from .env.local>
export PGURL='postgresql://rottenbrains:<pw>@10.10.20.7:5438/rottenbrains'
bash migration/resync_from_supabase.sh   # truncate+reload all tables + rebuild Better Auth accounts
```
Verify the printed row counts look right (users / watch_history / posts / accounts).

## 3. Deploy
- [ ] Merge `migrate/self-host` → `master` (package.json conflict already resolved on the branch):
      `git checkout master && git merge migrate/self-host` (should be near-clean).
- [ ] Coolify auto-builds (new Dockerfile: `prisma generate`, engine copied into
      standalone) + deploys with the new env. Watch the build log.

## 4. Verify (end downtime once green)
- [ ] Email/password login (a known migrated user — bcrypt).
- [ ] Google + Discord login (the re-linked accounts).
- [ ] Protected route loads for a premium user; non-premium → /premium; logged-out → /login.
- [ ] A data page renders (feed / continue-watching / a post).
- [ ] A profile image loads from MinIO (minios3.timdobras.com).
- [ ] Notification badge shows + polls.
- [ ] Sign up a new user end-to-end; sign out.

## 5. Rollback (if needed)
- [ ] `git revert` the merge commit on master → Coolify redeploys the old
      Supabase app. Supabase still has all data (untouched). Re-point nothing.

## Known follow-ups (non-blocking, post-cutover)
- BullMQ worker (notification fan-out, new-episode cron, TMDB cache, image proc) — use `BULLMQ_REDIS_URL` (REDIS_URL is the extractor's).
- Google One-Tap → Better Auth one-tap plugin (currently unrendered).
- Remove dead Supabase files (old /auth/callback route, VPNDebugPanel, test page).
- Premium changes lag ≤5min (Better Auth cookieCache) — same as the old premium cookie.
