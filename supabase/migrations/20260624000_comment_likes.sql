-- Per-comment liking. Mirrors the post `likes` table + increment/decrement RPCs.
-- After applying, regenerate database.types.ts so the client is typed:
--   SUPABASE_ACCESS_TOKEN=$(grep -oE 'sbp_[a-z0-9]+' .env.local) \
--     npx supabase gen types typescript --project-id ketxnamtpbvfvblowfoo > database.types.ts

create table if not exists public.comment_likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  comment_id uuid not null references public.comments (id) on delete cascade,
  created_at timestamptz default now(),
  unique (user_id, comment_id)
);

create index if not exists comment_likes_comment_id_idx on public.comment_likes (comment_id);
create index if not exists comment_likes_user_id_idx on public.comment_likes (user_id);

alter table public.comment_likes enable row level security;

drop policy if exists "comment_likes are readable" on public.comment_likes;
create policy "comment_likes are readable" on public.comment_likes
  for select using (true);

drop policy if exists "users like as themselves" on public.comment_likes;
create policy "users like as themselves" on public.comment_likes
  for insert with check (auth.uid() = user_id);

drop policy if exists "users unlike their own" on public.comment_likes;
create policy "users unlike their own" on public.comment_likes
  for delete using (auth.uid() = user_id);

create or replace function public.increment_comment_likes(p_comment_id uuid)
returns void language sql security definer as $$
  update public.comments set total_likes = total_likes + 1 where id = p_comment_id;
$$;

create or replace function public.decrement_comment_likes(p_comment_id uuid)
returns void language sql security definer as $$
  update public.comments set total_likes = greatest(total_likes - 1, 0) where id = p_comment_id;
$$;

grant execute on function public.increment_comment_likes(uuid) to anon, authenticated;
grant execute on function public.decrement_comment_likes(uuid) to anon, authenticated;
