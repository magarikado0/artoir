-- 3D展示で使用する画像を、一覧カバーとは独立して任意指定できるようにする。
-- Supabase SQL Editor で適用する。未指定（null）は先頭カバーへフォールバックする。

alter table public.artworks add column if not exists gallery_image_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'artworks_gallery_image_id_fkey') then
    alter table public.artworks
      add constraint artworks_gallery_image_id_fkey
      foreign key (gallery_image_id) references public.artwork_images(id) on delete set null;
  end if;
end $$;

create or replace function public.validate_artwork_gallery_image()
returns trigger language plpgsql as $$
begin
  if new.gallery_image_id is not null and not exists (
    select 1 from public.artwork_images ai
    where ai.id = new.gallery_image_id and ai.artwork_id = new.id
  ) then
    raise exception '3D展示画像は同じ作品に登録された画像から選択してください';
  end if;
  return new;
end;
$$;

drop trigger if exists artworks_gallery_image_trigger on public.artworks;
create trigger artworks_gallery_image_trigger
before insert or update of gallery_image_id on public.artworks
for each row execute function public.validate_artwork_gallery_image();
