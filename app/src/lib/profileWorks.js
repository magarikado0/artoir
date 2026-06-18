export async function ensureProfileWorksExhibition(client, profileId) {
  const { data: existing, error: existingError } = await client
    .from('exhibitions')
    .select('id, slug')
    .eq('profile_id', profileId)
    .eq('slug', 'works')
    .maybeSingle()
  if (existingError) throw existingError
  if (existing?.id) return existing

  const { data: created, error: createError } = await client
    .from('exhibitions')
    .insert({
      profile_id: profileId,
      organization_id: null,
      title: '作品',
      slug: 'works',
      description: null,
    })
    .select('id, slug')
    .single()
  if (!createError && created?.id) return created

  const { data: fallback, error: fallbackError } = await client
    .from('exhibitions')
    .select('id, slug')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (fallbackError) throw fallbackError
  if (fallback?.id) return fallback
  throw createError || new Error('作品管理用の展示を作成できませんでした。')
}
