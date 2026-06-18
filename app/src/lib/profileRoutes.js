export function profilePath(slug) {
  return `/profile/${slug}`
}

export function profileDashboardPath(slug) {
  return `${profilePath(slug)}/dashboard`
}

export function profileExhibitionPath(profileSlug, exhibitionSlug) {
  return `${profilePath(profileSlug)}/exhibition/${exhibitionSlug}`
}

export function legacyProfileSlugFromOwnerSlug(value) {
  if (!value) return undefined
  let decoded = value
  try {
    decoded = decodeURIComponent(value)
  } catch {
    decoded = value
  }
  return decoded.startsWith('@') ? decoded.slice(1) : undefined
}
