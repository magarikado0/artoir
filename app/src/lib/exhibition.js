export function exhStatus(exh) {
  const today = new Date().toISOString().slice(0, 10)
  if (!exh.start_date) return 'ended'
  if (exh.start_date > today) return 'upcoming'
  if (!exh.end_date || exh.end_date >= today) return 'live'
  return 'ended'
}

export function getExhibitionPeriodText(exhibition) {
  if (!exhibition) return '未設定'
  return [
    exhibition.start_date || '未設定',
    exhibition.start_time,
    '〜',
    exhibition.end_date || '未設定',
    exhibition.end_time,
  ].filter(Boolean).join(' ')
}

export function getExhibitionThumbnailUrlFromRecord(exhibition) {
  return String(exhibition?.thumbnail_url || '').trim()
}

export function sortArtworksByOrder(artworks) {
  if (!Array.isArray(artworks)) return []
  return artworks.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

export function getFirstArtworkImageUrl(artworks) {
  for (const artwork of sortArtworksByOrder(artworks)) {
    const url = String(artwork?.image_url || '').trim()
    if (url) return url
  }
  return ''
}

export function mapExhibitionListRow({ artworks, ...exhibition }) {
  const sortedArtworks = sortArtworksByOrder(artworks)
  return {
    ...exhibition,
    artworks: sortedArtworks,
    artworkCount: sortedArtworks.length,
  }
}

export function getExhibitionThumbnailUrl(exhibition) {
  const explicit = String(exhibition?.thumbnail_url || '').trim()
  if (explicit) return explicit
  return getFirstArtworkImageUrl(exhibition?.artworks)
}