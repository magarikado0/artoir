-- DEPRECATED: replaced by docs/ops/rebuild-profiles-organizations.sql.
-- Fix: owners cannot promote admins to owner (missing user_orgs UPDATE policy).
-- Safe to re-run. Apply in Supabase SQL Editor if member role changes silently fail.

create or replace function public.user_org_role(p_org_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.user_orgs
  where org_id = p_org_id
    and user_id = auth.uid()
  limit 1;
$$;

create or replace function public.is_org_owner(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.user_org_role(p_org_id) = 'owner';
$$;

create or replace function public.is_org_member(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.user_org_role(p_org_id) is not null;
$$;

grant execute on function public.user_org_role(uuid) to authenticated;
grant execute on function public.is_org_owner(uuid) to authenticated;
grant execute on function public.is_org_member(uuid) to authenticated;

alter table public.user_orgs enable row level security;

drop policy if exists "user_orgs_select" on public.user_orgs;
create policy "user_orgs_select"
on public.user_orgs
for select
using (public.is_org_member(org_id));

drop policy if exists "user_orgs_owner_update" on public.user_orgs;
create policy "user_orgs_owner_update"
on public.user_orgs
for update
using (public.is_org_owner(org_id))
with check (public.is_org_owner(org_id));

drop policy if exists "user_orgs_owner_delete" on public.user_orgs;
create policy "user_orgs_owner_delete"
on public.user_orgs
for delete
using (public.is_org_owner(org_id));

drop policy if exists "user_orgs_bootstrap_owner" on public.user_orgs;
create policy "user_orgs_bootstrap_owner"
on public.user_orgs
for insert
with check (
  user_id = auth.uid()
  and role = 'owner'
  and not exists (
    select 1
    from public.user_orgs existing
    where existing.org_id = user_orgs.org_id
  )
);

drop policy if exists "user_orgs_owner_insert" on public.user_orgs;
create policy "user_orgs_owner_insert"
on public.user_orgs
for insert
with check (
  user_id = auth.uid()
  and public.is_org_owner(org_id)
);

drop policy if exists "user_orgs_invite_accept" on public.user_orgs;
create policy "user_orgs_invite_accept"
on public.user_orgs
for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.organization_invites oi
    where oi.org_id = user_orgs.org_id
      and lower(oi.email) = lower(auth.jwt() ->> 'email')
      and oi.accepted_at is null
      and oi.expires_at > now()
  )
);

drop policy if exists "organization_invites_owner_manage" on public.organization_invites;
create policy "organization_invites_owner_manage"
on public.organization_invites
for all
using (public.is_org_owner(org_id))
with check (public.is_org_owner(org_id));
