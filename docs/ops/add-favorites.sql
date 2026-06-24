-- いいね（作品）/ お気に入り（展覧会・団体・作家）機能のための favorites テーブル。
-- ログインユーザー本人だけが自分の保存状態を読み書きできる（いいね数は非公開・非SNS）。
-- 適用は Supabase SQL Editor で本ファイルを実行する（既存 ops と同じ運用）。
--
-- target_type と参照先：
--   artwork      -> public.artworks.id
--   exhibition   -> public.exhibitions.id
--   organization -> public.organizations.id   （団体・作家=person 両方）
--   profile      -> public.profiles.id          （個人プロフィールページ）
-- target_id は型ごとに参照先テーブルが異なるためポリモーフィック（FK は張らない）。

create table if not exists public.favorites (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('artwork','exhibition','organization','profile')),
  target_id   uuid not null,
  created_at  timestamptz not null default now(),
  unique (profile_id, target_type, target_id)
);

create index if not exists favorites_owner_idx
  on public.favorites (profile_id, target_type);

-- RLS：本人のみ読み書き（いいね数は公開しないので anon には付与しない）。
alter table public.favorites enable row level security;

grant select, insert, delete on public.favorites to authenticated;

drop policy if exists "favorites_self_select" on public.favorites;
create policy "favorites_self_select"
on public.favorites
for select
using (profile_id = auth.uid());

drop policy if exists "favorites_self_insert" on public.favorites;
create policy "favorites_self_insert"
on public.favorites
for insert
with check (profile_id = auth.uid());

drop policy if exists "favorites_self_delete" on public.favorites;
create policy "favorites_self_delete"
on public.favorites
for delete
using (profile_id = auth.uid());
