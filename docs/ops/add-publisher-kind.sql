-- DEPRECATED: replaced by docs/ops/rebuild-profiles-organizations.sql.
-- Kept only as historical context for the older organizations.kind model.

alter table public.organizations
  add column if not exists kind text not null default 'organization';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'organizations_kind_check'
      and conrelid = 'public.organizations'::regclass
  ) then
    alter table public.organizations
      add constraint organizations_kind_check
      check (kind in ('organization', 'person'));
  end if;
end $$;

update public.organizations
set kind = 'organization'
where kind is null;
