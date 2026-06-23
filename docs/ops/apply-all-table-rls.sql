-- Apply RLS and grants for every app table in the current Artoir schema.
-- Run after docs/ops/rebuild-profiles-organizations.sql.

-- Tables covered:
-- profiles, organizations, organization_members, exhibitions, artworks, artwork_creators

alter table if exists public.exhibitions
  drop constraint if exists exhibitions_profile_id_fkey;

alter table if exists public.exhibitions
  drop constraint if exists exhibitions_owner_xor_check;

alter table if exists public.exhibitions
  add column if not exists profile_id uuid;

alter table if exists public.exhibitions
  alter column organization_id drop not null;

alter table if exists public.exhibitions
  add constraint exhibitions_profile_id_fkey
  foreign key (profile_id) references public.profiles(id) on delete cascade;

alter table if exists public.exhibitions
  add constraint exhibitions_owner_xor_check
  check (
    (organization_id is not null and profile_id is null)
    or
    (organization_id is null and profile_id is not null)
  );

drop index if exists public.exhibitions_organization_slug_unique;
drop index if exists public.exhibitions_profile_slug_unique;

create unique index exhibitions_organization_slug_unique
  on public.exhibitions (organization_id, slug)
  where organization_id is not null;

create unique index exhibitions_profile_slug_unique
  on public.exhibitions (profile_id, slug)
  where profile_id is not null;

alter table if exists public.artworks
  drop constraint if exists artworks_profile_id_fkey;

alter table if exists public.artworks
  drop constraint if exists artworks_owner_xor_check;

alter table if exists public.artworks
  add column if not exists profile_id uuid;

alter table if exists public.artworks
  alter column exhibition_id drop not null;

alter table if exists public.artworks
  add constraint artworks_profile_id_fkey
  foreign key (profile_id) references public.profiles(id) on delete cascade;

update public.artworks a
set profile_id = e.profile_id,
    exhibition_id = null
from public.exhibitions e
where a.exhibition_id = e.id
  and e.profile_id is not null
  and a.profile_id is null;

delete from public.exhibitions
where profile_id is not null;

alter table if exists public.artworks
  add constraint artworks_owner_xor_check
  check (
    (exhibition_id is not null and profile_id is null)
    or
    (exhibition_id is null and profile_id is not null)
  );

create index if not exists artworks_profile_id_idx
  on public.artworks (profile_id);

create or replace function public.profile_is_org_member(p_organization_id uuid, p_profile_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = p_organization_id
      and om.profile_id = p_profile_id
  );
$$;

create or replace function public.profile_org_role(p_organization_id uuid, p_profile_id uuid default auth.uid())
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.organization_members
  where organization_id = p_organization_id
    and profile_id = p_profile_id
  limit 1;
$$;

create or replace function public.profile_is_org_owner(p_organization_id uuid, p_profile_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.profile_org_role(p_organization_id, p_profile_id) = 'owner';
$$;

create or replace function public.exhibition_belongs_to_member_org(p_exhibition_id uuid, p_profile_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.exhibitions e
    join public.organization_members om on om.organization_id = e.organization_id
    where e.id = p_exhibition_id
      and om.profile_id = p_profile_id
  );
$$;

create or replace function public.artwork_belongs_to_member_org(p_artwork_id uuid, p_profile_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.artworks a
    join public.exhibitions e on e.id = a.exhibition_id
    join public.organization_members om on om.organization_id = e.organization_id
    where a.id = p_artwork_id
      and om.profile_id = p_profile_id
  );
$$;

create or replace function public.profile_owns_artwork(p_artwork_id uuid, p_profile_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.artworks a
    where a.id = p_artwork_id
      and a.profile_id = p_profile_id
  );
$$;

create or replace function public.profile_owns_exhibition(p_exhibition_id uuid, p_profile_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.exhibitions e
    where e.id = p_exhibition_id
      and e.profile_id = p_profile_id
  );
$$;

create or replace function public.can_manage_exhibition(p_exhibition_id uuid, p_profile_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.exhibitions e
    where e.id = p_exhibition_id
      and (
        e.profile_id = p_profile_id
        or public.profile_is_org_member(e.organization_id, p_profile_id)
      )
  );
$$;

create or replace function public.artwork_belongs_to_manageable_exhibition(p_artwork_id uuid, p_profile_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.artworks a
    where a.id = p_artwork_id
      and public.can_manage_exhibition(a.exhibition_id, p_profile_id)
  );
$$;

create or replace function public.can_manage_artwork(p_artwork_id uuid, p_profile_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.artworks a
    where a.id = p_artwork_id
      and (
        a.profile_id = p_profile_id
        or public.can_manage_exhibition(a.exhibition_id, p_profile_id)
      )
  );
$$;

create or replace function public.artwork_creator_allowed(p_artwork_id uuid, p_creator_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.artworks a
    left join public.exhibitions e on e.id = a.exhibition_id
    where a.id = p_artwork_id
      and (
        (a.profile_id is not null and a.profile_id = p_creator_profile_id)
        or (
          e.organization_id is not null
          and public.profile_is_org_member(e.organization_id, p_creator_profile_id)
        )
      )
  );
$$;

grant execute on function public.profile_is_org_member(uuid, uuid) to anon, authenticated;
grant execute on function public.profile_org_role(uuid, uuid) to authenticated;
grant execute on function public.profile_is_org_owner(uuid, uuid) to authenticated;
grant execute on function public.exhibition_belongs_to_member_org(uuid, uuid) to authenticated;
grant execute on function public.artwork_belongs_to_member_org(uuid, uuid) to anon, authenticated;
grant execute on function public.profile_owns_exhibition(uuid, uuid) to authenticated;
grant execute on function public.profile_owns_artwork(uuid, uuid) to authenticated;
grant execute on function public.can_manage_exhibition(uuid, uuid) to authenticated;
grant execute on function public.artwork_belongs_to_manageable_exhibition(uuid, uuid) to anon, authenticated;
grant execute on function public.can_manage_artwork(uuid, uuid) to anon, authenticated;
grant execute on function public.artwork_creator_allowed(uuid, uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.exhibitions enable row level security;
alter table public.artworks enable row level security;
alter table public.artwork_creators enable row level security;

grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;

grant select on public.organizations to anon, authenticated;
grant insert, update, delete on public.organizations to authenticated;

grant select on public.exhibitions to anon, authenticated;
grant insert, update, delete on public.exhibitions to authenticated;

grant select on public.artworks to anon, authenticated;
grant insert, update, delete on public.artworks to authenticated;

grant select on public.artwork_creators to anon, authenticated;
grant insert, update, delete on public.artwork_creators to authenticated;

grant select, insert, update, delete on public.organization_members to authenticated;

-- profiles: public read, self create/update.
drop policy if exists "profiles_public_read" on public.profiles;
create policy "profiles_public_read"
on public.profiles
for select
using (true);

drop policy if exists "profiles_self_insert" on public.profiles;
create policy "profiles_self_insert"
on public.profiles
for insert
with check (id = auth.uid());

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update"
on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

-- organizations: public read, profile-owned create, member edit, owner delete.
drop policy if exists "organizations_public_read" on public.organizations;
create policy "organizations_public_read"
on public.organizations
for select
using (true);

drop policy if exists "organizations_profile_insert" on public.organizations;
create policy "organizations_profile_insert"
on public.organizations
for insert
with check (created_by = auth.uid());

drop policy if exists "organizations_member_update" on public.organizations;
create policy "organizations_member_update"
on public.organizations
for update
using (public.profile_is_org_member(id))
with check (public.profile_is_org_member(id));

drop policy if exists "organizations_owner_delete" on public.organizations;
create policy "organizations_owner_delete"
on public.organizations
for delete
using (public.profile_is_org_owner(id));

-- organization_members: members can read their org; first owner bootstrap;
-- owners manage members.
drop policy if exists "organization_members_select" on public.organization_members;
create policy "organization_members_select"
on public.organization_members
for select
using (public.profile_is_org_member(organization_id));

drop policy if exists "organization_members_bootstrap_owner" on public.organization_members;
create policy "organization_members_bootstrap_owner"
on public.organization_members
for insert
with check (
  profile_id = auth.uid()
  and role = 'owner'
  and not exists (
    select 1
    from public.organization_members existing
    where existing.organization_id = organization_members.organization_id
  )
);

drop policy if exists "organization_members_owner_insert" on public.organization_members;
create policy "organization_members_owner_insert"
on public.organization_members
for insert
with check (public.profile_is_org_owner(organization_id));

drop policy if exists "organization_members_owner_update" on public.organization_members;
create policy "organization_members_owner_update"
on public.organization_members
for update
using (public.profile_is_org_owner(organization_id))
with check (public.profile_is_org_owner(organization_id));

drop policy if exists "organization_members_owner_delete" on public.organization_members;
create policy "organization_members_owner_delete"
on public.organization_members
for delete
using (public.profile_is_org_owner(organization_id));

-- exhibitions: public read; org members or owning profile create/edit/delete.
drop policy if exists "exhibitions_public_read" on public.exhibitions;
create policy "exhibitions_public_read"
on public.exhibitions
for select
using (true);

drop policy if exists "exhibitions_member_insert" on public.exhibitions;
create policy "exhibitions_member_insert"
on public.exhibitions
for insert
with check (
  (organization_id is not null and profile_id is null and public.profile_is_org_member(organization_id))
  or
  (organization_id is null and profile_id = auth.uid())
);

drop policy if exists "exhibitions_member_update" on public.exhibitions;
create policy "exhibitions_member_update"
on public.exhibitions
for update
using (public.can_manage_exhibition(id))
with check (
  (organization_id is not null and profile_id is null and public.profile_is_org_member(organization_id))
  or
  (organization_id is null and profile_id = auth.uid())
);

drop policy if exists "exhibitions_member_delete" on public.exhibitions;
create policy "exhibitions_member_delete"
on public.exhibitions
for delete
using (public.can_manage_exhibition(id));

-- artworks: public read; profile owners or managers of the artwork's exhibition manage.
drop policy if exists "artworks_public_read" on public.artworks;
create policy "artworks_public_read"
on public.artworks
for select
using (true);

drop policy if exists "artworks_member_insert" on public.artworks;
create policy "artworks_member_insert"
on public.artworks
for insert
with check (
  (profile_id = auth.uid() and exhibition_id is null)
  or
  (profile_id is null and public.can_manage_exhibition(exhibition_id))
);

drop policy if exists "artworks_member_update" on public.artworks;
create policy "artworks_member_update"
on public.artworks
for update
using (public.can_manage_artwork(id))
with check (
  (profile_id = auth.uid() and exhibition_id is null)
  or
  (profile_id is null and public.can_manage_exhibition(exhibition_id))
);

drop policy if exists "artworks_member_delete" on public.artworks;
create policy "artworks_member_delete"
on public.artworks
for delete
using (public.can_manage_artwork(id));

-- artwork_creators: visible creator rows are public; exhibition managers can
-- manage creator rows, but creator profiles must be valid for that exhibition.
drop policy if exists "artwork_creators_member_manage" on public.artwork_creators;

drop policy if exists "artwork_creators_public_read_visible" on public.artwork_creators;
create policy "artwork_creators_public_read_visible"
on public.artwork_creators
for select
using (is_visible);

drop policy if exists "artwork_creators_member_read" on public.artwork_creators;
create policy "artwork_creators_member_read"
on public.artwork_creators
for select
using (public.can_manage_artwork(artwork_id));

drop policy if exists "artwork_creators_member_insert" on public.artwork_creators;
create policy "artwork_creators_member_insert"
on public.artwork_creators
for insert
with check (
  public.can_manage_artwork(artwork_id)
  and public.artwork_creator_allowed(artwork_id, profile_id)
);

drop policy if exists "artwork_creators_member_update" on public.artwork_creators;
create policy "artwork_creators_member_update"
on public.artwork_creators
for update
using (public.can_manage_artwork(artwork_id))
with check (
  public.can_manage_artwork(artwork_id)
  and public.artwork_creator_allowed(artwork_id, profile_id)
);

drop policy if exists "artwork_creators_member_delete" on public.artwork_creators;
create policy "artwork_creators_member_delete"
on public.artwork_creators
for delete
using (public.can_manage_artwork(artwork_id));
