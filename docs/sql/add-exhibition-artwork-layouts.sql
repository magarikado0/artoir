-- 展覧会内での作品配置。座標・寸法はキャンバス幅を1とする正規化値。
-- artworks 本体から分離し、同じ作品モデルの互換性を維持する。
create table if not exists public.exhibition_artwork_layouts (
  exhibition_id uuid not null references public.exhibitions(id) on delete cascade,
  artwork_id uuid not null references public.artworks(id) on delete cascade,
  x numeric not null check (x >= 0),
  y numeric not null check (y >= 0),
  width numeric not null check (width > 0 and width <= 1),
  height numeric not null check (height > 0),
  z_index integer not null default 0,
  rotation numeric not null default 0,
  is_visible boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (exhibition_id, artwork_id)
);

create index if not exists exhibition_artwork_layouts_exhibition_idx
  on public.exhibition_artwork_layouts (exhibition_id, z_index);

alter table public.exhibition_artwork_layouts enable row level security;

drop policy if exists "Public can read public exhibition layouts" on public.exhibition_artwork_layouts;
create policy "Public can read public exhibition layouts"
  on public.exhibition_artwork_layouts for select
  using (exists (
    select 1 from public.exhibitions e
    where e.id = exhibition_id and e.visibility = 'public'
  ));

drop policy if exists "Owners can read exhibition layouts" on public.exhibition_artwork_layouts;
create policy "Owners can read exhibition layouts"
  on public.exhibition_artwork_layouts for select to authenticated
  using (exists (
    select 1 from public.exhibitions e
    where e.id = exhibition_id and (
      e.profile_id = auth.uid()
      or exists (
        select 1 from public.organization_members om
        where om.organization_id = e.organization_id and om.profile_id = auth.uid()
      )
    )
  ));

drop policy if exists "Owners can insert exhibition layouts" on public.exhibition_artwork_layouts;
create policy "Owners can insert exhibition layouts"
  on public.exhibition_artwork_layouts for insert to authenticated
  with check (
    exists (
      select 1 from public.exhibitions e
      where e.id = exhibition_id and (
        e.profile_id = auth.uid()
        or exists (
          select 1 from public.organization_members om
          where om.organization_id = e.organization_id and om.profile_id = auth.uid()
        )
      )
    )
    and exists (
      select 1 from public.artworks a
      where a.id = artwork_id and a.exhibition_id = exhibition_id
    )
  );

drop policy if exists "Owners can update exhibition layouts" on public.exhibition_artwork_layouts;
create policy "Owners can update exhibition layouts"
  on public.exhibition_artwork_layouts for update to authenticated
  using (exists (
    select 1 from public.exhibitions e
    where e.id = exhibition_id and (
      e.profile_id = auth.uid()
      or exists (
        select 1 from public.organization_members om
        where om.organization_id = e.organization_id and om.profile_id = auth.uid()
      )
    )
  ));

drop policy if exists "Owners can delete exhibition layouts" on public.exhibition_artwork_layouts;
create policy "Owners can delete exhibition layouts"
  on public.exhibition_artwork_layouts for delete to authenticated
  using (exists (
    select 1 from public.exhibitions e
    where e.id = exhibition_id and (
      e.profile_id = auth.uid()
      or exists (
        select 1 from public.organization_members om
        where om.organization_id = e.organization_id and om.profile_id = auth.uid()
      )
    )
  ));
