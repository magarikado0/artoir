export const LAYOUT_PAGE_SIZE = 120

const GAP = 0.025
const LEFT = 0.025
const RIGHT = 0.975
const MIN_CANVAS_HEIGHT = 0.72

const round = (value) => Math.round(value * 1000000) / 1000000

export function artworkAspectRatio(artwork) {
  const cover = artwork?.artwork_images?.find((image) => String(image.id) === String(artwork.cover_image_id))
    || artwork?.artwork_images?.[0]
  const width = Number(cover?.width || artwork?.image_width) || 1
  const height = Number(cover?.height || artwork?.image_height) || 1
  return Math.max(0.2, Math.min(5, width / height))
}

function initialWidth(aspect) {
  if (aspect > 1.35) return 0.29
  if (aspect < 0.78) return 0.18
  return 0.22
}

export function normalizePlacement(row) {
  return {
    artwork_id: row.artwork_id,
    x: Number(row.x),
    y: Number(row.y),
    width: Number(row.width),
    height: Number(row.height),
    z_index: Number(row.z_index) || 0,
    rotation: Number(row.rotation) || 0,
    is_visible: row.is_visible !== false,
  }
}

/** Missing works are appended below saved work so additions never overlap existing curation. */
export function completeExhibitionLayout(artworks, savedRows = []) {
  const saved = new Map(savedRows.map((row) => [String(row.artwork_id), normalizePlacement(row)]))
  const result = []
  let x = LEFT
  let y = 0.04
  let rowHeight = 0
  let z = 0

  for (const artwork of artworks) {
    const placement = saved.get(String(artwork.id))
    if (!placement) continue
    result.push(placement)
    z = Math.max(z, placement.z_index)
    y = Math.max(y, placement.y + placement.height + GAP)
  }

  if (result.length > 0) {
    x = LEFT
    rowHeight = 0
  }

  for (const artwork of artworks) {
    if (saved.has(String(artwork.id))) continue
    const aspect = artworkAspectRatio(artwork)
    const width = initialWidth(aspect)
    const height = width / aspect
    if (x + width > RIGHT) {
      x = LEFT
      y += rowHeight + GAP
      rowHeight = 0
    }
    z += 1
    result.push({
      artwork_id: artwork.id,
      x: round(x),
      y: round(y),
      width: round(width),
      height: round(height),
      z_index: z,
      rotation: 0,
      is_visible: true,
    })
    x += width + GAP
    rowHeight = Math.max(rowHeight, height)
  }

  return result
}

export function exhibitionCanvasHeight(placements) {
  return Math.max(
    MIN_CANVAS_HEIGHT,
    ...placements.filter((item) => item.is_visible).map((item) => item.y + item.height + 0.04),
  )
}

export function clampPlacement(item) {
  const width = Math.max(0.08, Math.min(0.7, item.width))
  const height = Math.max(0.04, item.height)
  return {
    ...item,
    x: round(Math.max(0, Math.min(1 - width, item.x))),
    y: round(Math.max(0, item.y)),
    width: round(width),
    height: round(height),
  }
}
