export function reorderArtworksById(items, fromId, toId) {
  if (String(fromId) === String(toId)) return items

  const fromIndex = items.findIndex((item) => String(item.id) === String(fromId))
  const toIndex = items.findIndex((item) => String(item.id) === String(toId))
  if (fromIndex < 0 || toIndex < 0) return items

  const next = [...items]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)

  return next.map((item, index) => ({ ...item, order: index + 1 }))
}

export async function persistArtworkOrder(client, orderedArtworks) {
  const results = await Promise.all(
    orderedArtworks.map((artwork, index) =>
      client.from('artworks').update({ order: index + 1 }).eq('id', artwork.id),
    ),
  )

  const failed = results.find((result) => result.error)
  if (failed?.error) throw failed.error
}
