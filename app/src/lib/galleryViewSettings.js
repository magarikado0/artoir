export const GALLERY_VIEW_MODES = ['curated', 'wall', 'grid']

export const GALLERY_VIEW_LABELS = {
  curated: '自由配置',
  wall: 'ウォール',
  grid: 'グリッド',
}

const DEFAULT_MODES = [...GALLERY_VIEW_MODES]
const DEFAULT_VIEW = 'curated'

export function normalizeGalleryViewSettings(exhibition) {
  const configuredModes = Array.isArray(exhibition?.gallery_view_modes)
    ? exhibition.gallery_view_modes.filter((mode, index, modes) => (
      GALLERY_VIEW_MODES.includes(mode) && modes.indexOf(mode) === index
    ))
    : DEFAULT_MODES
  const modes = configuredModes.length > 0 ? configuredModes : DEFAULT_MODES
  const requestedDefault = exhibition?.gallery_default_view
  const defaultView = modes.includes(requestedDefault)
    ? requestedDefault
    : modes.includes(DEFAULT_VIEW)
      ? DEFAULT_VIEW
      : modes[0]

  return { modes, defaultView }
}

export function getAvailableGalleryViews(exhibition, { hasCuratedLayout, supportsCuratedLayout }) {
  const settings = normalizeGalleryViewSettings(exhibition)
  const modes = settings.modes.filter((mode) => (
    mode !== 'curated' || (hasCuratedLayout && supportsCuratedLayout)
  ))
  const fallbackModes = modes.length > 0 ? modes : ['wall']
  const defaultView = fallbackModes.includes(settings.defaultView)
    ? settings.defaultView
    : fallbackModes.includes('wall')
      ? 'wall'
      : fallbackModes[0]

  return { modes: fallbackModes, defaultView }
}
