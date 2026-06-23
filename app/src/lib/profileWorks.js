export function isProfileWorksExhibition(exhibition) {
  if (!exhibition?.profile_id) return false
  return exhibition.slug === 'works' || exhibition.title === '作品'
}
