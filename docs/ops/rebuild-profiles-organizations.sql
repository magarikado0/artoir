-- Rebuild Artoir's app data model around profiles, organizations, organization_members, and artwork_creators.
-- Intended for development DB rebuilds. Back up production data before running anywhere persistent.

drop table if exists public.artwork_creators cascade;
drop table if exists public.organization_invites cascade;
drop table if exists public.organization_members cascade;
drop table if exists public.user_orgs cascade;

alter table if exists public.exhibitions
  drop constraint if exists exhibitions_org_id_fkey;

alter table if exists public.exhibitions
  drop constraint if exists exhibitions_organization_id_fkey;

alter table if exists public.exhibitions
  drop constraint if exists exhibitions_profile_id_fkey;

alter table if exists public.exhibitions
  drop constraint if exists exhibitions_owner_xor_check;

alter table if exists public.organizations
  drop constraint if exists organizations_kind_check;

alter table if exists public.organizations
  drop column if exists kind;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  slug text not null unique,
  display_name text not null,
  bio text,
  avatar_url text,
  sns_links jsonb not null default '{}'::jsonb,
  homepage_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.organizations
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

alter table public.organizations
  alter column sns_links set default '{}'::jsonb;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'exhibitions'
      and column_name = 'org_id'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'exhibitions'
      and column_name = 'organization_id'
  ) then
    alter table public.exhibitions rename column org_id to organization_id;
  end if;
end $$;

alter table public.exhibitions
  add column if not exists organization_id uuid;

alter table public.exhibitions
  add column if not exists profile_id uuid;

alter table public.exhibitions
  alter column organization_id drop not null;

alter table public.exhibitions
  add constraint exhibitions_organization_id_fkey
  foreign key (organization_id) references public.organizations(id) on delete cascade;

alter table public.exhibitions
  add constraint exhibitions_profile_id_fkey
  foreign key (profile_id) references public.profiles(id) on delete cascade;

alter table public.exhibitions
  add constraint exhibitions_owner_xor_check
  check (
    (organization_id is not null and profile_id is null)
    or
    (organization_id is null and profile_id is not null)
  );

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'admin' check (role in ('owner', 'admin')),
  created_at timestamptz not null default now(),
  primary key (organization_id, profile_id)
);

create table if not exists public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null default 'admin' check (role in ('owner', 'admin')),
  token text not null unique,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  accepted_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.artwork_creators (
  artwork_id uuid not null references public.artworks(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  display_order int not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (artwork_id, profile_id)
);

drop index if exists public.exhibitions_organization_slug_unique;
drop index if exists public.exhibitions_profile_slug_unique;

create unique index exhibitions_organization_slug_unique
  on public.exhibitions (organization_id, slug)
  where organization_id is not null;

create unique index exhibitions_profile_slug_unique
  on public.exhibitions (profile_id, slug)
  where profile_id is not null;

create index if not exists organization_members_profile_idx
  on public.organization_members (profile_id);

create index if not exists artwork_creators_profile_idx
  on public.artwork_creators (profile_id);

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

create or replace function public.artwork_belongs_to_member_org(p_artwork_id uuid, p_profile_id uuid)
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
    join public.exhibitions e on e.id = a.exhibition_id
    where a.id = p_artwork_id
      and (
        (e.profile_id is not null and e.profile_id = p_creator_profile_id)
        or (
          e.organization_id is not null
          and public.profile_is_org_member(e.organization_id, p_creator_profile_id)
        )
      )
  );
$$;

grant execute on function public.profile_is_org_member(uuid, uuid) to authenticated;
grant execute on function public.profile_org_role(uuid, uuid) to authenticated;
grant execute on function public.profile_is_org_owner(uuid, uuid) to authenticated;
grant execute on function public.artwork_belongs_to_member_org(uuid, uuid) to authenticated;
grant execute on function public.profile_owns_exhibition(uuid, uuid) to authenticated;
grant execute on function public.can_manage_exhibition(uuid, uuid) to authenticated;
grant execute on function public.artwork_belongs_to_manageable_exhibition(uuid, uuid) to authenticated;
grant execute on function public.artwork_creator_allowed(uuid, uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.exhibitions enable row level security;
alter table public.artworks enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_invites enable row level security;
alter table public.artwork_creators enable row level security;

drop policy if exists "profiles_public_read" on public.profiles;
create policy "profiles_public_read"
on public.profiles for select
using (true);

drop policy if exists "profiles_self_insert" on public.profiles;
create policy "profiles_self_insert"
on public.profiles for insert
with check (id = auth.uid());

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "organizations_public_read" on public.organizations;
create policy "organizations_public_read"
on public.organizations for select
using (true);

drop policy if exists "organizations_profile_insert" on public.organizations;
create policy "organizations_profile_insert"
on public.organizations for insert
with check (created_by = auth.uid());

drop policy if exists "organizations_member_update" on public.organizations;
create policy "organizations_member_update"
on public.organizations for update
using (public.profile_is_org_member(id))
with check (public.profile_is_org_member(id));

drop policy if exists "organizations_owner_delete" on public.organizations;
create policy "organizations_owner_delete"
on public.organizations for delete
using (public.profile_is_org_owner(id));

drop policy if exists "exhibitions_public_read" on public.exhibitions;
create policy "exhibitions_public_read"
on public.exhibitions for select
using (true);

drop policy if exists "exhibitions_member_insert" on public.exhibitions;
create policy "exhibitions_member_insert"
on public.exhibitions for insert
with check (
  (organization_id is not null and profile_id is null and public.profile_is_org_member(organization_id))
  or
  (organization_id is null and profile_id = auth.uid())
);

drop policy if exists "exhibitions_member_update" on public.exhibitions;
create policy "exhibitions_member_update"
on public.exhibitions for update
using (public.can_manage_exhibition(id))
with check (
  (organization_id is not null and profile_id is null and public.profile_is_org_member(organization_id))
  or
  (organization_id is null and profile_id = auth.uid())
);

drop policy if exists "exhibitions_member_delete" on public.exhibitions;
create policy "exhibitions_member_delete"
on public.exhibitions for delete
using (public.can_manage_exhibition(id));

drop policy if exists "artworks_public_read" on public.artworks;
create policy "artworks_public_read"
on public.artworks for select
using (true);

drop policy if exists "artworks_member_insert" on public.artworks;
create policy "artworks_member_insert"
on public.artworks for insert
with check (public.can_manage_exhibition(exhibition_id));

drop policy if exists "artworks_member_update" on public.artworks;
create policy "artworks_member_update"
on public.artworks for update
using (public.can_manage_exhibition(exhibition_id))
with check (public.can_manage_exhibition(exhibition_id));

drop policy if exists "artworks_member_delete" on public.artworks;
create policy "artworks_member_delete"
on public.artworks for delete
using (public.can_manage_exhibition(exhibition_id));

drop policy if exists "organization_members_select" on public.organization_members;
create policy "organization_members_select"
on public.organization_members for select
using (public.profile_is_org_member(organization_id));

drop policy if exists "organization_members_bootstrap_owner" on public.organization_members;
create policy "organization_members_bootstrap_owner"
on public.organization_members for insert
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
on public.organization_members for insert
with check (public.profile_is_org_owner(organization_id));

drop policy if exists "organization_members_owner_update" on public.organization_members;
create policy "organization_members_owner_update"
on public.organization_members for update
using (public.profile_is_org_owner(organization_id))
with check (public.profile_is_org_owner(organization_id));

drop policy if exists "organization_members_owner_delete" on public.organization_members;
create policy "organization_members_owner_delete"
on public.organization_members for delete
using (public.profile_is_org_owner(organization_id));

drop policy if exists "organization_invites_owner_manage" on public.organization_invites;
create policy "organization_invites_owner_manage"
on public.organization_invites for all
using (public.profile_is_org_owner(organization_id))
with check (public.profile_is_org_owner(organization_id));

drop policy if exists "organization_invites_invitee_read" on public.organization_invites;
create policy "organization_invites_invitee_read"
on public.organization_invites for select
using (lower(email) = lower(auth.jwt() ->> 'email'));

drop policy if exists "organization_invites_invitee_accept" on public.organization_invites;
create policy "organization_invites_invitee_accept"
on public.organization_invites for update
using (lower(email) = lower(auth.jwt() ->> 'email'))
with check (lower(email) = lower(auth.jwt() ->> 'email'));

drop policy if exists "artwork_creators_public_read_visible" on public.artwork_creators;
create policy "artwork_creators_public_read_visible"
on public.artwork_creators for select
using (is_visible or public.artwork_belongs_to_manageable_exhibition(artwork_id, auth.uid()));

drop policy if exists "artwork_creators_member_manage" on public.artwork_creators;
create policy "artwork_creators_member_manage"
on public.artwork_creators for all
using (public.artwork_belongs_to_manageable_exhibition(artwork_id, auth.uid()))
with check (
  public.artwork_belongs_to_manageable_exhibition(artwork_id, auth.uid())
  and public.artwork_creator_allowed(artwork_id, profile_id)
);
