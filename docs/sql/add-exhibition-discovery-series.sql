-- 展覧会の発見導線（芸術分野・表現タグ）と、定期開催シリーズを追加する。
-- 既存展覧会は分類・シリーズとも未設定のまま維持されるため、非破壊で適用できる。
-- Supabase SQL Editor で実行する。

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 固定の芸術分野と、表現タグのマスタ
-- ---------------------------------------------------------------------------

create table if not exists public.art_disciplines (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  sort_order integer not null default 0,
  constraint art_disciplines_slug_not_blank check (length(trim(slug)) > 0),
  constraint art_disciplines_name_not_blank check (length(trim(name)) > 0),
  constraint art_disciplines_sort_order_check check (sort_order >= 0),
  constraint art_disciplines_slug_key unique (slug)
);

create index if not exists art_disciplines_sort_order_idx
  on public.art_disciplines (sort_order, name);

-- slug は公開側でも固定キーとして利用する。再実行時は表示名と順序を正に戻す。
insert into public.art_disciplines (slug, name, sort_order)
values
  ('calligraphy',             '書・文字',                 10),
  ('painting-drawing',        '絵画・ドローイング',       20),
  ('photography',             '写真',                     30),
  ('printmaking',             '版画',                     40),
  ('sculpture-installation',  '彫刻・立体',               50),
  ('craft',                   '工芸',                     60),
  ('design-illustration',     'デザイン・イラスト',       70),
  ('moving-digital',          '映像・デジタル',           80),
  ('interdisciplinary',       '複合表現',                 90)
on conflict (slug) do update
set name = excluded.name,
    sort_order = excluded.sort_order;

create table if not exists public.art_expression_tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  tag_type text not null,
  sort_order integer not null default 0,
  constraint art_expression_tags_slug_not_blank check (length(trim(slug)) > 0),
  constraint art_expression_tags_name_not_blank check (length(trim(name)) > 0),
  constraint art_expression_tags_type_check check (tag_type in ('medium', 'theme', 'visual')),
  constraint art_expression_tags_sort_order_check check (sort_order >= 0),
  constraint art_expression_tags_slug_key unique (slug)
);

create index if not exists art_expression_tags_type_sort_idx
  on public.art_expression_tags (tag_type, sort_order, name);

-- 最初の横断導線に必要な小さな語彙。追加・整理は service role / SQL Editor で行う。
insert into public.art_expression_tags (slug, name, tag_type, sort_order)
values
  ('ink',             '墨',         'medium', 10),
  ('paper',           '紙',         'medium', 20),
  ('oil',             '油彩',       'medium', 30),
  ('ceramic',         '陶',         'medium', 40),
  ('text',            '文字',       'theme',  10),
  ('nature',          '自然',       'theme',  20),
  ('figure',          '人物',       'theme',  30),
  ('abstraction',     '抽象',       'theme',  40),
  ('line',            '線',         'visual', 10),
  ('negative-space',  '余白',       'visual', 20),
  ('monochrome',      'モノクロ',   'visual', 30),
  ('vivid-color',     '鮮色',       'visual', 40),
  ('geometric',       '幾何学',     'visual', 50),
  ('light',           '光',         'visual', 60)
on conflict (slug) do update
set name = excluded.name,
    tag_type = excluded.tag_type,
    sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------------
-- 展覧会シリーズ
-- ---------------------------------------------------------------------------

create table if not exists public.exhibition_series (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  profile_id uuid,
  slug text not null,
  name text not null,
  description text,
  recurrence_label text,
  start_year integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exhibition_series_organization_id_fkey
    foreign key (organization_id) references public.organizations(id) on delete cascade,
  constraint exhibition_series_profile_id_fkey
    foreign key (profile_id) references public.profiles(id) on delete cascade,
  constraint exhibition_series_owner_xor_check
    check ((organization_id is not null) <> (profile_id is not null)),
  constraint exhibition_series_slug_not_blank check (length(trim(slug)) > 0),
  constraint exhibition_series_name_not_blank check (length(trim(name)) > 0),
  constraint exhibition_series_recurrence_label_not_blank
    check (recurrence_label is null or length(trim(recurrence_label)) > 0),
  constraint exhibition_series_start_year_check
    check (start_year is null or start_year between 1000 and 9999)
);

-- NULL を含む複合 UNIQUE では所有者ごとの一意性を表せないため、主体別に分ける。
create unique index if not exists exhibition_series_organization_slug_key
  on public.exhibition_series (organization_id, lower(slug))
  where organization_id is not null;

create unique index if not exists exhibition_series_profile_slug_key
  on public.exhibition_series (profile_id, lower(slug))
  where profile_id is not null;

-- 開催回との複合FKで、シリーズと開催回の所有主体一致を競合なく保証する。
create unique index if not exists exhibition_series_id_organization_key
  on public.exhibition_series (id, organization_id);

create unique index if not exists exhibition_series_id_profile_key
  on public.exhibition_series (id, profile_id);

create index if not exists exhibition_series_organization_start_idx
  on public.exhibition_series (organization_id, start_year desc, name)
  where organization_id is not null;

create index if not exists exhibition_series_profile_start_idx
  on public.exhibition_series (profile_id, start_year desc, name)
  where profile_id is not null;

create or replace function public.set_exhibition_series_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists exhibition_series_updated_at_trigger on public.exhibition_series;
create trigger exhibition_series_updated_at_trigger
before update on public.exhibition_series
for each row execute function public.set_exhibition_series_updated_at();

-- 既存行を変えずに、任意のシリーズ所属と開催回メタデータを追加する。
alter table public.exhibitions
  add column if not exists series_id uuid,
  add column if not exists edition_year integer,
  add column if not exists edition_number integer,
  add column if not exists edition_label text,
  add column if not exists is_series_milestone boolean not null default false,
  add column if not exists participant_count integer,
  add column if not exists discovery_classified boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'exhibitions_series_id_fkey'
      and conrelid = 'public.exhibitions'::regclass
  ) then
    alter table public.exhibitions
      add constraint exhibitions_series_id_fkey
      foreign key (series_id) references public.exhibition_series(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'exhibitions_series_organization_owner_fkey'
      and conrelid = 'public.exhibitions'::regclass
  ) then
    alter table public.exhibitions
      add constraint exhibitions_series_organization_owner_fkey
      foreign key (series_id, organization_id)
      references public.exhibition_series(id, organization_id)
      deferrable initially deferred;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'exhibitions_series_profile_owner_fkey'
      and conrelid = 'public.exhibitions'::regclass
  ) then
    alter table public.exhibitions
      add constraint exhibitions_series_profile_owner_fkey
      foreign key (series_id, profile_id)
      references public.exhibition_series(id, profile_id)
      deferrable initially deferred;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'exhibitions_edition_year_check'
      and conrelid = 'public.exhibitions'::regclass
  ) then
    alter table public.exhibitions
      add constraint exhibitions_edition_year_check
      check (edition_year is null or edition_year between 1000 and 9999);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'exhibitions_edition_number_check'
      and conrelid = 'public.exhibitions'::regclass
  ) then
    alter table public.exhibitions
      add constraint exhibitions_edition_number_check
      check (edition_number is null or edition_number > 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'exhibitions_edition_label_not_blank'
      and conrelid = 'public.exhibitions'::regclass
  ) then
    alter table public.exhibitions
      add constraint exhibitions_edition_label_not_blank
      check (edition_label is null or length(trim(edition_label)) > 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'exhibitions_participant_count_check'
      and conrelid = 'public.exhibitions'::regclass
  ) then
    alter table public.exhibitions
      add constraint exhibitions_participant_count_check
      check (participant_count is null or participant_count >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'exhibitions_series_metadata_check'
      and conrelid = 'public.exhibitions'::regclass
  ) then
    alter table public.exhibitions
      add constraint exhibitions_series_metadata_check
      check (
        series_id is not null
        or (
          edition_year is null
          and edition_number is null
          and edition_label is null
          and is_series_milestone = false
        )
      );
  end if;
end $$;

create index if not exists exhibitions_series_edition_idx
  on public.exhibitions (series_id, edition_year desc, edition_number desc, start_date desc)
  where series_id is not null;

create index if not exists exhibitions_public_series_idx
  on public.exhibitions (series_id)
  where series_id is not null and visibility = 'public';

create unique index if not exists exhibitions_series_edition_number_key
  on public.exhibitions (series_id, edition_number)
  where series_id is not null and edition_number is not null;

-- シリーズと開催回は必ず同じ団体、または同じ個人に属する。
-- ON DELETE SET NULL でシリーズが外れた場合は、回次情報だけを自動的に片付ける。
create or replace function public.validate_exhibition_series_assignment()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.series_id is null then
    new.edition_year := null;
    new.edition_number := null;
    new.edition_label := null;
    new.is_series_milestone := false;
    return new;
  end if;

  if not exists (
    select 1
    from public.exhibition_series s
    where s.id = new.series_id
      and s.organization_id is not distinct from new.organization_id
      and s.profile_id is not distinct from new.profile_id
  ) then
    raise exception '展覧会とシリーズの所有者が一致していません';
  end if;

  return new;
end;
$$;

drop trigger if exists exhibitions_validate_series_trigger on public.exhibitions;
create trigger exhibitions_validate_series_trigger
before insert or update of series_id, organization_id, profile_id on public.exhibitions
for each row execute function public.validate_exhibition_series_assignment();

-- 開催回が残っている間は、シリーズだけを別主体へ移せないようにする。
create or replace function public.validate_exhibition_series_owner_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.organization_id is not distinct from old.organization_id
     and new.profile_id is not distinct from old.profile_id then
    return new;
  end if;

  if exists (
    select 1
    from public.exhibitions e
    where e.series_id = new.id
      and (
        e.organization_id is distinct from new.organization_id
        or e.profile_id is distinct from new.profile_id
      )
  ) then
    raise exception '開催回が登録されたシリーズの所有者は変更できません';
  end if;

  return new;
end;
$$;

drop trigger if exists exhibition_series_validate_owner_change_trigger on public.exhibition_series;
create trigger exhibition_series_validate_owner_change_trigger
before update of organization_id, profile_id on public.exhibition_series
for each row execute function public.validate_exhibition_series_owner_change();

-- ---------------------------------------------------------------------------
-- 展覧会と分類・タグの関連
-- ---------------------------------------------------------------------------

create table if not exists public.exhibition_disciplines (
  exhibition_id uuid not null,
  discipline_id uuid not null,
  is_primary boolean not null default false,
  sort_order integer not null,
  constraint exhibition_disciplines_pkey primary key (exhibition_id, discipline_id),
  constraint exhibition_disciplines_exhibition_id_fkey
    foreign key (exhibition_id) references public.exhibitions(id) on delete cascade,
  constraint exhibition_disciplines_discipline_id_fkey
    foreign key (discipline_id) references public.art_disciplines(id) on delete restrict,
  constraint exhibition_disciplines_slot_check check (
    (is_primary = true and sort_order = 0)
    or (is_primary = false and sort_order between 1 and 2)
  ),
  constraint exhibition_disciplines_exhibition_sort_key unique (exhibition_id, sort_order)
);

-- 0番を主分野、1・2番を副分野に固定することで、副分野はDB上も最大2件になる。
create unique index if not exists exhibition_disciplines_one_primary_key
  on public.exhibition_disciplines (exhibition_id)
  where is_primary = true;

create index if not exists exhibition_disciplines_discovery_idx
  on public.exhibition_disciplines (discipline_id, is_primary desc, exhibition_id);

-- 関連を1件以上持つ展覧会には、必ず主分野が1件あることをトランザクション終端で検証する。
-- 遅延制約なので、主分野・副分野を一度に差し替える更新も可能。
create or replace function public.validate_exhibition_discipline_set()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  target_exhibition_id uuid;
  relation_count integer;
  primary_count integer;
begin
  target_exhibition_id := case when tg_op = 'DELETE' then old.exhibition_id else new.exhibition_id end;

  select count(*), count(*) filter (where is_primary)
    into relation_count, primary_count
  from public.exhibition_disciplines
  where exhibition_id = target_exhibition_id;

  if relation_count > 0 and primary_count <> 1 then
    raise exception '分野を設定する場合、主分野を1件指定してください';
  end if;

  if tg_op = 'UPDATE' and old.exhibition_id is distinct from new.exhibition_id then
    select count(*), count(*) filter (where is_primary)
      into relation_count, primary_count
    from public.exhibition_disciplines
    where exhibition_id = old.exhibition_id;

    if relation_count > 0 and primary_count <> 1 then
      raise exception '分野を設定する場合、主分野を1件指定してください';
    end if;
  end if;

  return null;
end;
$$;

drop trigger if exists exhibition_disciplines_validate_set_trigger on public.exhibition_disciplines;
create constraint trigger exhibition_disciplines_validate_set_trigger
after insert or update or delete on public.exhibition_disciplines
deferrable initially deferred
for each row execute function public.validate_exhibition_discipline_set();

create table if not exists public.exhibition_expression_tags (
  exhibition_id uuid not null,
  tag_id uuid not null,
  constraint exhibition_expression_tags_pkey primary key (exhibition_id, tag_id),
  constraint exhibition_expression_tags_exhibition_id_fkey
    foreign key (exhibition_id) references public.exhibitions(id) on delete cascade,
  constraint exhibition_expression_tags_tag_id_fkey
    foreign key (tag_id) references public.art_expression_tags(id) on delete restrict
);

create index if not exists exhibition_expression_tags_discovery_idx
  on public.exhibition_expression_tags (tag_id, exhibition_id);

-- 同じ展覧会の分類更新を直列化し、件数制約の並行書き込みによるすり抜けを防ぐ。
create or replace function public.lock_exhibition_discovery_metadata()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  target_exhibition_id uuid;
begin
  target_exhibition_id := new.exhibition_id;

  perform 1
  from public.exhibitions e
  where e.id = target_exhibition_id
    and (
      e.profile_id = auth.uid()
      or exists (
        select 1
        from public.organization_members om
        where om.organization_id = e.organization_id
          and om.profile_id = auth.uid()
      )
    )
  for update;

  if not found then
    raise exception '展覧会の分類を更新する権限がありません';
  end if;

  if tg_table_name = 'exhibition_expression_tags' then
    perform 1
    from public.art_expression_tags aet
    where aet.id = new.tag_id
    for share;

    if not found then
      raise exception '指定された表現タグが見つかりません';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists exhibition_disciplines_lock_trigger on public.exhibition_disciplines;
create trigger exhibition_disciplines_lock_trigger
before insert or update on public.exhibition_disciplines
for each row execute function public.lock_exhibition_discovery_metadata();

drop trigger if exists exhibition_expression_tags_lock_trigger on public.exhibition_expression_tags;
create trigger exhibition_expression_tags_lock_trigger
before insert or update on public.exhibition_expression_tags
for each row execute function public.lock_exhibition_discovery_metadata();

-- 使用中タグのtype変更は、既存展覧会の「各type最大3件」を壊し得るため明示的に拒否する。
create or replace function public.prevent_linked_expression_tag_type_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.tag_type is distinct from old.tag_type and exists (
    select 1
    from public.exhibition_expression_tags eet
    where eet.tag_id = old.id
  ) then
    raise exception '使用中の表現タグは分類を変更できません';
  end if;

  return new;
end;
$$;

drop trigger if exists art_expression_tags_prevent_type_change_trigger on public.art_expression_tags;
create trigger art_expression_tags_prevent_type_change_trigger
before update of tag_type on public.art_expression_tags
for each row execute function public.prevent_linked_expression_tag_type_change();

-- 素材・技法／主題／視覚的特徴は、それぞれ1展覧会につき最大3件。
create or replace function public.validate_exhibition_expression_tag_limit()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  target_exhibition_id uuid;
begin
  target_exhibition_id := case when tg_op = 'DELETE' then old.exhibition_id else new.exhibition_id end;

  if exists (
    select 1
    from public.exhibition_expression_tags eet
    join public.art_expression_tags aet on aet.id = eet.tag_id
    where eet.exhibition_id = target_exhibition_id
    group by aet.tag_type
    having count(*) > 3
  ) then
    raise exception '表現タグは各分類につき3件まで指定できます';
  end if;

  if tg_op = 'UPDATE' and old.exhibition_id is distinct from new.exhibition_id and exists (
    select 1
    from public.exhibition_expression_tags eet
    join public.art_expression_tags aet on aet.id = eet.tag_id
    where eet.exhibition_id = old.exhibition_id
    group by aet.tag_type
    having count(*) > 3
  ) then
    raise exception '表現タグは各分類につき3件まで指定できます';
  end if;

  return null;
end;
$$;

drop trigger if exists exhibition_expression_tags_limit_trigger on public.exhibition_expression_tags;
create constraint trigger exhibition_expression_tags_limit_trigger
after insert or update or delete on public.exhibition_expression_tags
deferrable initially deferred
for each row execute function public.validate_exhibition_expression_tag_limit();

-- ---------------------------------------------------------------------------
-- RLS helper functions
-- ---------------------------------------------------------------------------

create or replace function public.is_public_discovery_exhibition(p_exhibition_id uuid)
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
      and e.visibility = 'public'
  );
$$;

create or replace function public.is_published_exhibition_series(p_series_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.exhibitions e
    where e.series_id = p_series_id
      and e.visibility = 'public'
  );
$$;

create or replace function public.can_manage_discovery_exhibition(p_exhibition_id uuid)
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
        e.profile_id = auth.uid()
        or exists (
          select 1
          from public.organization_members om
          where om.organization_id = e.organization_id
            and om.profile_id = auth.uid()
        )
      )
  );
$$;

create or replace function public.can_manage_exhibition_series(p_series_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.exhibition_series s
    where s.id = p_series_id
      and (
        s.profile_id = auth.uid()
        or exists (
          select 1
          from public.organization_members om
          where om.organization_id = s.organization_id
            and om.profile_id = auth.uid()
        )
      )
  );
$$;

create or replace function public.can_create_exhibition_series(
  p_organization_id uuid,
  p_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (p_profile_id = auth.uid() and p_organization_id is null)
    or (
      p_profile_id is null
      and exists (
        select 1
        from public.organization_members om
        where om.organization_id = p_organization_id
          and om.profile_id = auth.uid()
      )
    );
$$;

revoke all on function public.is_public_discovery_exhibition(uuid) from public;
revoke all on function public.is_published_exhibition_series(uuid) from public;
revoke all on function public.can_manage_discovery_exhibition(uuid) from public;
revoke all on function public.can_manage_exhibition_series(uuid) from public;
revoke all on function public.can_create_exhibition_series(uuid, uuid) from public;
grant execute on function public.is_public_discovery_exhibition(uuid) to anon, authenticated;
grant execute on function public.is_published_exhibition_series(uuid) to anon, authenticated;
grant execute on function public.can_manage_discovery_exhibition(uuid) to authenticated;
grant execute on function public.can_manage_exhibition_series(uuid) to authenticated;
grant execute on function public.can_create_exhibition_series(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.art_disciplines enable row level security;
alter table public.art_expression_tags enable row level security;
alter table public.exhibition_disciplines enable row level security;
alter table public.exhibition_expression_tags enable row level security;
alter table public.exhibition_series enable row level security;

drop policy if exists "Public can read art disciplines" on public.art_disciplines;
create policy "Public can read art disciplines"
  on public.art_disciplines for select
  using (true);

drop policy if exists "Public can read art expression tags" on public.art_expression_tags;
create policy "Public can read art expression tags"
  on public.art_expression_tags for select
  using (true);

drop policy if exists "Public can read public exhibition disciplines" on public.exhibition_disciplines;
create policy "Public can read public exhibition disciplines"
  on public.exhibition_disciplines for select
  using (public.is_public_discovery_exhibition(exhibition_id));

drop policy if exists "Owners can read exhibition disciplines" on public.exhibition_disciplines;
create policy "Owners can read exhibition disciplines"
  on public.exhibition_disciplines for select to authenticated
  using (public.can_manage_discovery_exhibition(exhibition_id));

drop policy if exists "Owners can insert exhibition disciplines" on public.exhibition_disciplines;
create policy "Owners can insert exhibition disciplines"
  on public.exhibition_disciplines for insert to authenticated
  with check (public.can_manage_discovery_exhibition(exhibition_id));

drop policy if exists "Owners can update exhibition disciplines" on public.exhibition_disciplines;
create policy "Owners can update exhibition disciplines"
  on public.exhibition_disciplines for update to authenticated
  using (public.can_manage_discovery_exhibition(exhibition_id))
  with check (public.can_manage_discovery_exhibition(exhibition_id));

drop policy if exists "Owners can delete exhibition disciplines" on public.exhibition_disciplines;
create policy "Owners can delete exhibition disciplines"
  on public.exhibition_disciplines for delete to authenticated
  using (public.can_manage_discovery_exhibition(exhibition_id));

drop policy if exists "Public can read public exhibition expression tags" on public.exhibition_expression_tags;
create policy "Public can read public exhibition expression tags"
  on public.exhibition_expression_tags for select
  using (public.is_public_discovery_exhibition(exhibition_id));

drop policy if exists "Owners can read exhibition expression tags" on public.exhibition_expression_tags;
create policy "Owners can read exhibition expression tags"
  on public.exhibition_expression_tags for select to authenticated
  using (public.can_manage_discovery_exhibition(exhibition_id));

drop policy if exists "Owners can insert exhibition expression tags" on public.exhibition_expression_tags;
create policy "Owners can insert exhibition expression tags"
  on public.exhibition_expression_tags for insert to authenticated
  with check (public.can_manage_discovery_exhibition(exhibition_id));

drop policy if exists "Owners can update exhibition expression tags" on public.exhibition_expression_tags;
create policy "Owners can update exhibition expression tags"
  on public.exhibition_expression_tags for update to authenticated
  using (public.can_manage_discovery_exhibition(exhibition_id))
  with check (public.can_manage_discovery_exhibition(exhibition_id));

drop policy if exists "Owners can delete exhibition expression tags" on public.exhibition_expression_tags;
create policy "Owners can delete exhibition expression tags"
  on public.exhibition_expression_tags for delete to authenticated
  using (public.can_manage_discovery_exhibition(exhibition_id));

-- 公開シリーズは、公開中の開催回を1件以上持つものだけを匿名閲覧可能にする。
-- 作成直後の空シリーズや非公開回だけのシリーズは、所有者ポリシーで管理画面から読める。
drop policy if exists "Public can read published exhibition series" on public.exhibition_series;
create policy "Public can read published exhibition series"
  on public.exhibition_series for select
  using (public.is_published_exhibition_series(id));

drop policy if exists "Owners can read exhibition series" on public.exhibition_series;
create policy "Owners can read exhibition series"
  on public.exhibition_series for select to authenticated
  using (public.can_manage_exhibition_series(id));

drop policy if exists "Owners can insert exhibition series" on public.exhibition_series;
create policy "Owners can insert exhibition series"
  on public.exhibition_series for insert to authenticated
  with check (public.can_create_exhibition_series(organization_id, profile_id));

drop policy if exists "Owners can update exhibition series" on public.exhibition_series;
create policy "Owners can update exhibition series"
  on public.exhibition_series for update to authenticated
  using (public.can_manage_exhibition_series(id))
  with check (public.can_create_exhibition_series(organization_id, profile_id));

drop policy if exists "Owners can delete exhibition series" on public.exhibition_series;
create policy "Owners can delete exhibition series"
  on public.exhibition_series for delete to authenticated
  using (public.can_manage_exhibition_series(id));

-- Supabase API から利用する権限。RLS が各行の公開範囲と所有権を制御する。
grant select on public.art_disciplines, public.art_expression_tags to anon, authenticated;
revoke insert, update, delete on public.art_disciplines, public.art_expression_tags from anon, authenticated;

grant select on public.exhibition_disciplines, public.exhibition_expression_tags,
  public.exhibition_series to anon, authenticated;
grant insert, update, delete on public.exhibition_disciplines,
  public.exhibition_expression_tags, public.exhibition_series to authenticated;

commit;
