-- 1作品に最大5枚の画像を持たせる（既存 artworks.image_url はカバーURLとして維持）。
-- Supabase SQL Editor で適用する。

create extension if not exists pgcrypto;

alter table public.artworks add column if not exists image_width integer;
alter table public.artworks add column if not exists image_height integer;

create table if not exists public.artwork_images (
  id uuid primary key default gen_random_uuid(),
  artwork_id uuid not null references public.artworks(id) on delete cascade,
  url text not null,
  "order" integer not null,
  type text,
  caption text,
  width integer,
  height integer,
  file_name text,
  file_size bigint,
  created_at timestamptz not null default now(),
  constraint artwork_images_order_check check ("order" between 1 and 5),
  constraint artwork_images_type_check check (type is null or type in ('full', 'detail', 'side', 'back', 'installation', 'process', 'other')),
  constraint artwork_images_artwork_order_key unique (artwork_id, "order")
);

-- 同じ元画像を異なるクロップで複数登録できるよう、URLの一意制約は持たせない。
alter table public.artwork_images drop constraint if exists artwork_images_artwork_url_key;

alter table public.artworks add column if not exists cover_image_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'artworks_cover_image_id_fkey') then
    alter table public.artworks
      add constraint artworks_cover_image_id_fkey
      foreign key (cover_image_id) references public.artwork_images(id) on delete set null;
  end if;
end $$;

create index if not exists artwork_images_artwork_order_idx
  on public.artwork_images (artwork_id, "order");

-- 既存の単一画像を1件目として移行する。再実行しても重複しない。
insert into public.artwork_images (artwork_id, url, "order", type, width, height, file_name, file_size)
select id, image_url, 1, 'full', image_width, image_height, file_name, file_size
from public.artworks a
where nullif(trim(a.image_url), '') is not null
  and not exists (select 1 from public.artwork_images ai where ai.artwork_id = a.id);

update public.artworks a
set cover_image_id = ai.id
from public.artwork_images ai
where ai.artwork_id = a.id
  and ai."order" = 1
  and a.cover_image_id is null;

create or replace function public.enforce_artwork_image_limit()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.artwork_images where artwork_id = new.artwork_id and (tg_op = 'INSERT' or id <> new.id)) >= 5 then
    raise exception '1作品につき画像は最大5枚です';
  end if;
  return new;
end;
$$;

drop trigger if exists artwork_images_limit_trigger on public.artwork_images;
create trigger artwork_images_limit_trigger
before insert or update of artwork_id on public.artwork_images
for each row execute function public.enforce_artwork_image_limit();

create or replace function public.validate_artwork_cover_image()
returns trigger language plpgsql as $$
begin
  if new.cover_image_id is not null and not exists (
    select 1 from public.artwork_images ai
    where ai.id = new.cover_image_id and ai.artwork_id = new.id
  ) then
    raise exception 'カバー画像は同じ作品に登録された画像から選択してください';
  end if;
  return new;
end;
$$;

drop trigger if exists artworks_cover_image_trigger on public.artworks;
create trigger artworks_cover_image_trigger
before insert or update of cover_image_id on public.artworks
for each row execute function public.validate_artwork_cover_image();

alter table public.artwork_images enable row level security;

drop policy if exists "Public can read artwork images" on public.artwork_images;
create policy "Public can read artwork images"
  on public.artwork_images for select using (true);

drop policy if exists "Owners can insert artwork images" on public.artwork_images;
create policy "Owners can insert artwork images"
  on public.artwork_images for insert to authenticated
  with check (exists (
    select 1
    from public.artworks a
    left join public.exhibitions e on e.id = a.exhibition_id
    where a.id = artwork_id and (
      a.profile_id = auth.uid()
      or e.profile_id = auth.uid()
      or exists (
        select 1 from public.organization_members om
        where om.organization_id = e.organization_id and om.profile_id = auth.uid()
      )
    )
  ));

drop policy if exists "Owners can update artwork images" on public.artwork_images;
create policy "Owners can update artwork images"
  on public.artwork_images for update to authenticated
  using (exists (
    select 1 from public.artworks a
    left join public.exhibitions e on e.id = a.exhibition_id
    where a.id = artwork_id and (
      a.profile_id = auth.uid() or e.profile_id = auth.uid()
      or exists (select 1 from public.organization_members om where om.organization_id = e.organization_id and om.profile_id = auth.uid())
    )
  ));

drop policy if exists "Owners can delete artwork images" on public.artwork_images;
create policy "Owners can delete artwork images"
  on public.artwork_images for delete to authenticated
  using (exists (
    select 1 from public.artworks a
    left join public.exhibitions e on e.id = a.exhibition_id
    where a.id = artwork_id and (
      a.profile_id = auth.uid() or e.profile_id = auth.uid()
      or exists (select 1 from public.organization_members om where om.organization_id = e.organization_id and om.profile_id = auth.uid())
    )
  ));
