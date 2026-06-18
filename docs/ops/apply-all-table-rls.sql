-- Apply RLS and grants for every app table in the current Artoir schema.
-- Run after docs/ops/rebuild-profiles-organizations.sql.

-- Tables covered:
-- profiles, organizations, organization_members, organization_invites,
-- exhibitions, artworks, artwork_creators

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

grant execute on function public.profile_is_org_member(uuid, uuid) to anon, authenticated;
grant execute on function public.profile_org_role(uuid, uuid) to authenticated;
grant execute on function public.profile_is_org_owner(uuid, uuid) to authenticated;
grant execute on function public.exhibition_belongs_to_member_org(uuid, uuid) to authenticated;
grant execute on function public.artwork_belongs_to_member_org(uuid, uuid) to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_invites enable row level security;
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
grant select, insert, update, delete on public.organization_invites to authenticated;

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
-- owners manage members; invitees can join via valid invite.
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

drop policy if exists "organization_members_invite_accept" on public.organization_members;
create policy "organization_members_invite_accept"
on public.organization_members
for insert
with check (
  profile_id = auth.uid()
  and exists (
    select 1
    from public.organization_invites oi
    where oi.organization_id = organization_members.organization_id
      and lower(oi.email) = lower(auth.jwt() ->> 'email')
      and oi.accepted_at is null
      and oi.expires_at > now()
      and oi.role = organization_members.role
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

-- organization_invites: owners manage; invited email can read and mark accepted.
drop policy if exists "organization_invites_owner_manage" on public.organization_invites;

drop policy if exists "organization_invites_owner_select" on public.organization_invites;
create policy "organization_invites_owner_select"
on public.organization_invites
for select
using (public.profile_is_org_owner(organization_id));

drop policy if exists "organization_invites_invitee_read" on public.organization_invites;
create policy "organization_invites_invitee_read"
on public.organization_invites
for select
using (lower(email) = lower(auth.jwt() ->> 'email'));

drop policy if exists "organization_invites_owner_insert" on public.organization_invites;
create policy "organization_invites_owner_insert"
on public.organization_invites
for insert
with check (
  public.profile_is_org_owner(organization_id)
  and invited_by = auth.uid()
);

drop policy if exists "organization_invites_owner_update" on public.organization_invites;
create policy "organization_invites_owner_update"
on public.organization_invites
for update
using (public.profile_is_org_owner(organization_id))
with check (public.profile_is_org_owner(organization_id));

drop policy if exists "organization_invites_invitee_accept" on public.organization_invites;
create policy "organization_invites_invitee_accept"
on public.organization_invites
for update
using (
  lower(email) = lower(auth.jwt() ->> 'email')
  and accepted_at is null
  and expires_at > now()
)
with check (lower(email) = lower(auth.jwt() ->> 'email'));

drop policy if exists "organization_invites_owner_delete" on public.organization_invites;
create policy "organization_invites_owner_delete"
on public.organization_invites
for delete
using (public.profile_is_org_owner(organization_id));

-- exhibitions: public read; org members create/edit/delete.
drop policy if exists "exhibitions_public_read" on public.exhibitions;
create policy "exhibitions_public_read"
on public.exhibitions
for select
using (true);

drop policy if exists "exhibitions_member_insert" on public.exhibitions;
create policy "exhibitions_member_insert"
on public.exhibitions
for insert
with check (public.profile_is_org_member(organization_id));

drop policy if exists "exhibitions_member_update" on public.exhibitions;
create policy "exhibitions_member_update"
on public.exhibitions
for update
using (public.profile_is_org_member(organization_id))
with check (public.profile_is_org_member(organization_id));

drop policy if exists "exhibitions_member_delete" on public.exhibitions;
create policy "exhibitions_member_delete"
on public.exhibitions
for delete
using (public.profile_is_org_member(organization_id));

-- artworks: public read; members of the artwork's exhibition org manage.
drop policy if exists "artworks_public_read" on public.artworks;
create policy "artworks_public_read"
on public.artworks
for select
using (true);

drop policy if exists "artworks_member_insert" on public.artworks;
create policy "artworks_member_insert"
on public.artworks
for insert
with check (public.exhibition_belongs_to_member_org(exhibition_id));

drop policy if exists "artworks_member_update" on public.artworks;
create policy "artworks_member_update"
on public.artworks
for update
using (public.exhibition_belongs_to_member_org(exhibition_id))
with check (public.exhibition_belongs_to_member_org(exhibition_id));

drop policy if exists "artworks_member_delete" on public.artworks;
create policy "artworks_member_delete"
on public.artworks
for delete
using (public.exhibition_belongs_to_member_org(exhibition_id));

-- artwork_creators: visible creator rows are public; org members can manage
-- creator rows, but only for profiles that are members of the same organization.
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
using (public.artwork_belongs_to_member_org(artwork_id));

drop policy if exists "artwork_creators_member_insert" on public.artwork_creators;
create policy "artwork_creators_member_insert"
on public.artwork_creators
for insert
with check (
  public.artwork_belongs_to_member_org(artwork_id)
  and public.artwork_belongs_to_member_org(artwork_id, profile_id)
);

drop policy if exists "artwork_creators_member_update" on public.artwork_creators;
create policy "artwork_creators_member_update"
on public.artwork_creators
for update
using (public.artwork_belongs_to_member_org(artwork_id))
with check (
  public.artwork_belongs_to_member_org(artwork_id)
  and public.artwork_belongs_to_member_org(artwork_id, profile_id)
);

drop policy if exists "artwork_creators_member_delete" on public.artwork_creators;
create policy "artwork_creators_member_delete"
on public.artwork_creators
for delete
using (public.artwork_belongs_to_member_org(artwork_id));
