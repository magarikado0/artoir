/** 団体配下の作品・展覧会・メンバーシップを削除してから団体を削除する */
export async function deleteOrganization(client, orgId) {
  const { data: exhibitions, error: listErr } = await client
    .from('exhibitions')
    .select('id')
    .eq('org_id', orgId)
  if (listErr) return { error: listErr }

  const exhIds = (exhibitions || []).map((e) => e.id)
  if (exhIds.length > 0) {
    const { error: artErr } = await client.from('artworks').delete().in('exhibition_id', exhIds)
    if (artErr) return { error: artErr }
  }

  const { error: exhErr } = await client.from('exhibitions').delete().eq('org_id', orgId)
  if (exhErr) return { error: exhErr }

  const { error: linkErr } = await client.from('user_orgs').delete().eq('org_id', orgId)
  if (linkErr) return { error: linkErr }

  const { error: orgErr } = await client.from('organizations').delete().eq('id', orgId)
  if (orgErr) return { error: orgErr }

  return { error: null }
}
