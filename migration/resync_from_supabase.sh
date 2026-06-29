#!/usr/bin/env bash
# =====================================================================
# Final data re-sync: Supabase (live) -> self-hosted Postgres.
# Run this DURING the cutover freeze (Supabase writes paused), right before
# flipping the app. It TRUNCATEs + reloads every app/family table and rebuilds
# the Better Auth `account` rows from auth.users/auth.identities — so the new DB
# matches Supabase exactly at cutover (the original backfill is hours stale).
#
# Idempotent: safe to run repeatedly. Does NOT touch session/verification
# (those are Better-Auth-owned and empty pre-cutover).
#
# Env required:
#   SUPABASE_ACCESS_TOKEN   (in app .env.local)
#   PGURL                   local DB, e.g. postgresql://rottenbrains:<pw>@10.10.20.7:5438/rottenbrains
# =====================================================================
set -euo pipefail
REF="ketxnamtpbvfvblowfoo"
: "${SUPABASE_ACCESS_TOKEN:?set SUPABASE_ACCESS_TOKEN}"
: "${PGURL:?set PGURL (local DB connection string)}"

API="https://api.supabase.com/v1/projects/$REF/database/query"
sb() { # run SQL on Supabase, return JSON  (curl — python UA is CF-blocked)
  curl -s -m 60 -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" \
    -X POST "$API" -d "{\"query\": $(python3 -c 'import json,sys;print(json.dumps(sys.argv[1]))' "$1")}"
}

# FK-safe order (parents first); reload happens with triggers/FKs disabled anyway.
APP_TABLES=(users posts comments comment_likes likes saves follows notifications \
  watch_history watch_list movie_genre_stats tv_genre_stats user_ip_addresses \
  user_jellyfin_config new_episodes dev_blog \
  families family_members family_invites family_integrations integration_member_links)

echo "== building reload SQL from current Supabase data =="
python3 - "$@" <<'PY' > /tmp/resync.sql
import json, subprocess, os, sys
REF="ketxnamtpbvfvblowfoo"; TOK=os.environ["SUPABASE_ACCESS_TOKEN"]
URL=f"https://api.supabase.com/v1/projects/{REF}/database/query"
def q(sql):
    r=subprocess.run(["curl","-s","-m","60","-H",f"Authorization: Bearer {TOK}","-H","Content-Type: application/json",
        "-X","POST",URL,"-d",json.dumps({"query":sql})],capture_output=True,text=True)
    return json.loads(r.stdout)
tables="users posts comments comment_likes likes saves follows notifications watch_history watch_list movie_genre_stats tv_genre_stats user_ip_addresses user_jellyfin_config new_episodes dev_blog families family_members family_invites family_integrations integration_member_links".split()
out=["BEGIN;","SET session_replication_role=replica;"]
# wipe in reverse dependency order, reload forward
# account + session also FK users, so they must be in the same TRUNCATE.
out.append("TRUNCATE "+", ".join("public."+t for t in tables)+", public.account, public.session RESTART IDENTITY;")
# `users` has Better-Auth-only NOT NULL columns (email_verified/updated_at) absent
# from Supabase — list the Supabase columns explicitly so their DEFAULTs apply.
USERS_COLS="id, created_at, username, name, email, image_url, tmdb_id, bio, backdrop_url, feed_genres, premium"
for t in tables:
    d=q(f"select coalesce(json_agg(x),'[]'::json) as d from public.{t} x")[0]["d"]
    j=json.dumps(d); assert "$j$" not in j
    if t=="users":
        out.append(f"INSERT INTO public.users ({USERS_COLS}) SELECT {USERS_COLS} FROM json_populate_recordset(NULL::public.users, $j${j}$j$::json); -- {len(d)} rows")
    else:
        out.append(f"INSERT INTO public.{t} SELECT * FROM json_populate_recordset(NULL::public.{t}, $j${j}$j$::json); -- {len(d)} rows")
# rebuild Better Auth accounts (credential bcrypt + oauth identities)
cred=q("select coalesce(json_agg(json_build_object('uid',id,'pw',encrypted_password)),'[]'::json) d from auth.users where encrypted_password is not null and encrypted_password<>''")[0]["d"]
oauth=q("select coalesce(json_agg(json_build_object('uid',user_id,'prov',provider,'aid',provider_id)),'[]'::json) d from auth.identities where provider in ('google','discord')")[0]["d"]
out.append(f"INSERT INTO public.account (id,account_id,provider_id,user_id,password,created_at,updated_at) SELECT gen_random_uuid(), r.uid::text,'credential',r.uid,r.pw,now(),now() FROM json_to_recordset($j${json.dumps(cred)}$j$) AS r(uid uuid,pw text);")
out.append(f"INSERT INTO public.account (id,account_id,provider_id,user_id,created_at,updated_at) SELECT gen_random_uuid(), r.aid,r.prov,r.uid,now(),now() FROM json_to_recordset($j${json.dumps(oauth)}$j$) AS r(uid uuid,prov text,aid text);")
# also keep users.email_verified=true + a username default for any new rows
out.append("UPDATE public.users SET email_verified=true WHERE email_verified IS NOT TRUE;")
out.append("UPDATE public.users SET username=email WHERE username IS NULL;")
out+=["SET session_replication_role=default;","COMMIT;"]
open(1,'w').write("\n".join(out))
PY

echo "== applying to $PGURL =="
psql "$PGURL" -v ON_ERROR_STOP=1 -f /tmp/resync.sql >/dev/null
echo "== row counts after resync =="
psql "$PGURL" -tAc "select 'users='||count(*) from users" \
  -c "select 'watch_history='||count(*) from watch_history" \
  -c "select 'posts='||count(*) from posts" \
  -c "select 'accounts='||count(*) from account"
rm -f /tmp/resync.sql
echo "== resync complete =="
