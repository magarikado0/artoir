-- Public artwork-gallery view options for each exhibition.
-- Existing exhibitions keep the current behavior: curated (when saved), wall, and grid.

alter table public.exhibitions
  add column if not exists gallery_view_modes text[] not null
    default array['curated', 'wall', 'grid']::text[],
  add column if not exists gallery_default_view text not null
    default 'curated';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'exhibitions_gallery_view_modes_check'
      and conrelid = 'public.exhibitions'::regclass
  ) then
    alter table public.exhibitions
      add constraint exhibitions_gallery_view_modes_check
      check (
        cardinality(gallery_view_modes) between 1 and 3
        and gallery_view_modes <@ array['curated', 'wall', 'grid']::text[]
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'exhibitions_gallery_default_view_check'
      and conrelid = 'public.exhibitions'::regclass
  ) then
    alter table public.exhibitions
      add constraint exhibitions_gallery_default_view_check
      check (
        gallery_default_view in ('curated', 'wall', 'grid')
        and gallery_default_view = any(gallery_view_modes)
      );
  end if;
end $$;
