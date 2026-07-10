-- Add publication visibility to exhibitions.
-- Current UI uses public/private. The check constraint reserves draft/unlisted for later.

alter table public.exhibitions
  add column if not exists visibility text not null default 'public';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'exhibitions_visibility_check'
      and conrelid = 'public.exhibitions'::regclass
  ) then
    alter table public.exhibitions
      add constraint exhibitions_visibility_check
      check (visibility in ('public', 'private', 'draft', 'unlisted'));
  end if;
end $$;

create index if not exists exhibitions_visibility_idx
  on public.exhibitions (visibility);

-- If your current public read policy exposes every exhibition, replace it with
-- a policy that only allows public exhibitions to anonymous visitors.
-- Keep owner/admin policies for authenticated dashboard access as separate policies.
--
-- Example:
-- drop policy if exists "Public can read exhibitions" on public.exhibitions;
-- create policy "Public can read public exhibitions"
--   on public.exhibitions
--   for select
--   to anon
--   using (visibility = 'public');
