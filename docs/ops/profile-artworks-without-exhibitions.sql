-- Move profile-owned artworks out of the synthetic "works" exhibition.
-- Run this before or together with the updated RLS in apply-all-table-rls.sql.

alter table public.artworks
  add column if not exists profile_id uuid references public.profiles(id) on delete cascade;

alter table public.artworks
  alter column exhibition_id drop not null;

update public.artworks a
set profile_id = e.profile_id,
    exhibition_id = null
from public.exhibitions e
where a.exhibition_id = e.id
  and e.profile_id is not null
  and a.profile_id is null;

delete from public.exhibitions
where profile_id is not null;

alter table public.artworks
  drop constraint if exists artworks_owner_xor_check;

alter table public.artworks
  add constraint artworks_owner_xor_check
  check (
    (exhibition_id is not null and profile_id is null)
    or
    (exhibition_id is null and profile_id is not null)
  );

create index if not exists artworks_profile_id_idx
  on public.artworks (profile_id);
