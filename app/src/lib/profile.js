export function slugifyProfileId(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s\u3000]+/g, '-')
    .replace(/[^a-z0-9_-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

export function normalizeProfile(raw) {
  if (!raw) return null
  return {
    ...raw,
    display_name: raw.display_name || raw.name || '',
    slug: raw.slug || '',
    bio: raw.bio || '',
    sns_links: raw.sns_links || {},
  }
}

export function normalizeArtworkCreators(creatorRows) {
  if (!Array.isArray(creatorRows)) return []
  return creatorRows
    .filter((row) => row?.profiles)
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
    .map((row) => ({
      profile_id: row.profile_id || row.profiles?.id,
      display_order: row.display_order ?? 0,
      is_visible: row.is_visible !== false,
      profile: normalizeProfile(row.profiles),
    }))
}

export function attachNormalizedCreators(artwork) {
  return {
    ...artwork,
    creators: normalizeArtworkCreators(artwork?.artwork_creators),
  }
}
