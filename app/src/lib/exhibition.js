export function exhStatus(exh) {
  const today = new Date().toISOString().slice(0, 10)
  if (!exh.start_date) return 'ended'
  if (exh.start_date > today) return 'upcoming'
  if (!exh.end_date || exh.end_date >= today) return 'live'
  return 'ended'
}

export const EXHIBITION_VISIBILITY = {
  PUBLIC: 'public',
  PRIVATE: 'private',
  DRAFT: 'draft',
  UNLISTED: 'unlisted',
}

export const EXHIBITION_VISIBILITY_OPTIONS = [
  {
    value: EXHIBITION_VISIBILITY.PUBLIC,
    label: '公開',
    description: '公開ページ、一覧、検索に表示されます。',
  },
  {
    value: EXHIBITION_VISIBILITY.PRIVATE,
    label: '非公開',
    description: '管理画面だけで表示されます。',
  },
]

export function normalizeExhibitionVisibility(visibility) {
  return Object.values(EXHIBITION_VISIBILITY).includes(visibility)
    ? visibility
    : EXHIBITION_VISIBILITY.PUBLIC
}

export function isPublicExhibition(exhibition) {
  return normalizeExhibitionVisibility(exhibition?.visibility) === EXHIBITION_VISIBILITY.PUBLIC
}

export function getExhibitionVisibilityLabel(exhibition) {
  const visibility = normalizeExhibitionVisibility(exhibition?.visibility)
  const labels = {
    [EXHIBITION_VISIBILITY.PUBLIC]: '公開',
    [EXHIBITION_VISIBILITY.PRIVATE]: '非公開',
    [EXHIBITION_VISIBILITY.DRAFT]: '下書き',
    [EXHIBITION_VISIBILITY.UNLISTED]: '限定公開',
  }
  return labels[visibility] || labels[EXHIBITION_VISIBILITY.PUBLIC]
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
