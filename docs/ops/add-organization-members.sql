-- Add shared management for organization publishers.
-- Run after docs/ops/add-publisher-kind.sql.

alter table public.user_orgs
  add column if not exists member_email text;

create unique index if not exists user_orgs_user_org_unique
  on public.user_orgs (user_id, org_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_orgs_role_check'
      and conrelid = 'public.user_orgs'::regclass
  ) then
    alter table public.user_orgs
      add constraint user_orgs_role_check
      check (role in ('owner', 'admin'));
  end if;
end $$;

create table if not exists public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null default 'admin' check (role in ('owner', 'admin')),
  token text not null unique,
  invited_by uuid not null references auth.users(id),
  accepted_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.organization_invites enable row level security;

drop policy if exists "organization_invites_owner_manage" on public.organization_invites;
create policy "organization_invites_owner_manage"
on public.organization_invites
for all
using (
  exists (
    select 1
    from public.user_orgs uo
    where uo.org_id = organization_invites.org_id
      and uo.user_id = auth.uid()
      and uo.role = 'owner'
  )
)
with check (
  exists (
    select 1
    from public.user_orgs uo
    where uo.org_id = organization_invites.org_id
      and uo.user_id = auth.uid()
      and uo.role = 'owner'
  )
);

drop policy if exists "organization_invites_invitee_read_update" on public.organization_invites;
create policy "organization_invites_invitee_read_update"
on public.organization_invites
for select
using (lower(email) = lower(auth.jwt() ->> 'email'));

drop policy if exists "organization_invites_invitee_accept" on public.organization_invites;
create policy "organization_invites_invitee_accept"
on public.organization_invites
for update
using (lower(email) = lower(auth.jwt() ->> 'email'))
with check (lower(email) = lower(auth.jwt() ->> 'email'));

-- If user_orgs RLS is enabled, add equivalent policies there:
-- 1. owners can select/update/delete user_orgs rows for their org
-- 2. invited users can insert their own user_orgs row when a matching unexpired invite exists
-- 3. never allow the UI/API to remove or demote the final owner
