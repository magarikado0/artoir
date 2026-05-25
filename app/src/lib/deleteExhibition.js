/** 展覧会に紐づく作品を先に削除してから展覧会を削除する */
export async function deleteExhibition(client, exhibitionId) {
  const { error: artErr } = await client.from('artworks').delete().eq('exhibition_id', exhibitionId)
  if (artErr) return { error: artErr }
  const { error: exhErr } = await client.from('exhibitions').delete().eq('id', exhibitionId)
  if (exhErr) return { error: exhErr }
  return { error: null }
}
