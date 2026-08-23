import { getExhibitionYear } from './discoveryData.js'

export function normalizeArchiveText(value) {
  return String(value || '').normalize('NFKC').trim().toLocaleLowerCase('ja')
}

export function uniqueProfilesFromArtworks(artworks) {
  const profiles = new Map()
  for (const artwork of artworks || []) {
    for (const creator of artwork?.artwork_creators || []) {
      if (creator?.is_visible !== true) continue
      const profile = creator?.profiles
      if (profile?.id && profile?.slug) profiles.set(profile.id, profile)
    }
  }
  return [...profiles.values()]
}

export function exhibitionSearchText({ exhibition, org, profile, creators = [] }) {
  return normalizeArchiveText([
    exhibition?.title,
    exhibition?.description,
    exhibition?.location,
    exhibition?.start_date,
    exhibition?.end_date,
    getExhibitionYear(exhibition),
    org?.name,
    profile?.display_name,
    ...creators.map((creator) => creator.display_name),
    ...creators.map((creator) => creator.slug),
  ].filter(Boolean).join(' '))
}

export function updateArchiveParams(current, updates) {
  const next = new URLSearchParams(current)
  for (const [key, value] of Object.entries(updates)) {
    if (value == null || value === '' || value === 'all') next.delete(key)
    else next.set(key, String(value))
  }
  return next
}

export function formatActiveYears(exhibitions) {
  const years = [...new Set((exhibitions || []).map(getExhibitionYear).filter(Boolean))].sort((a, b) => a - b)
  if (years.length === 0) return '年次未設定'
  if (years.length === 1) return `${years[0]}`
  return `${years[0]} — ${years.at(-1)}`
}

export function sortByStartDateDesc(a, b) {
  return String(b?.start_date || '').localeCompare(String(a?.start_date || ''))
}
