-- 個人展覧会の所有プロフィールを作品作者として紐付け可能にする。
-- 旧関数はプロフィール直下作品と団体展だけを許可し、個人展を判定していなかった。
create or replace function public.artwork_creator_allowed(
  p_artwork_id uuid,
  p_creator_profile_id uuid
)
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
        or (e.profile_id is not null and e.profile_id = p_creator_profile_id)
        or (
          e.organization_id is not null
          and public.profile_is_org_member(e.organization_id, p_creator_profile_id)
        )
      )
  );
$$;

grant execute on function public.artwork_creator_allowed(uuid, uuid) to authenticated;
