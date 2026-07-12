export const ARTWORK_IMAGE_TYPES = [
  ['full', '全体'],
  ['detail', '部分'],
  ['side', '側面'],
  ['back', '背面'],
  ['installation', '展示風景'],
  ['process', '制作過程'],
  ['other', 'その他'],
]

export function getArtworkImages(artwork) {
  const rows = Array.isArray(artwork?.artwork_images) ? artwork.artwork_images : []
  if (rows.length) return rows.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  if (!artwork?.image_url) return []
  return [{
    id: `legacy-${artwork.id}`,
    artwork_id: artwork.id,
    url: artwork.image_url,
    order: 1,
    type: 'full',
    width: artwork.image_width,
    height: artwork.image_height,
  }]
}

export function getArtworkCoverImage(artwork) {
  const images = getArtworkImages(artwork)
  return images.find((image) => String(image.id) === String(artwork?.cover_image_id)) || images[0] || null
}

export function getArtworkImageCount(artwork) {
  return getArtworkImages(artwork).length
}

export function artworkImageTypeLabel(type) {
  return ARTWORK_IMAGE_TYPES.find(([value]) => value === type)?.[1] || ''
}

export function filesToArtworkImages(files, existing = []) {
  const known = new Set(existing.map((item) => `${item.file?.name}:${item.file?.size}:${item.file?.lastModified}`))
  const next = []
  for (const file of Array.from(files || [])) {
    const key = `${file.name}:${file.size}:${file.lastModified}`
    if (known.has(key)) continue
    known.add(key)
    next.push({
      id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${next.length}`,
      file,
      previewUrl: URL.createObjectURL(file),
      type: existing.length === 0 && next.length === 0 ? 'full' : '',
      caption: '',
      progress: null,
      error: '',
    })
  }
  return [...existing, ...next].slice(0, 5)
}
