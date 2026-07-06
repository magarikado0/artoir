import { getOrientation, SIZE_PRESETS } from '../../lib/photoWall'

export const ROOM = {
  width: 12,
  depth: 12,
  height: 3.2,
  halfWidth: 6,
  halfDepth: 6,
  eyeHeight: 1.5,
}

export const WALL_ORDER = ['front', 'right', 'back', 'left']

const WALL_SPAN = 10.5
const WALL_MARGIN = 0.75
const WALL_OFFSET = 0.02
const VIEW_DISTANCE = 3.2
const DEFAULT_ASPECT = 0.8
const FRAME_EXTRA = 0.36
const BASE_GAP = 0.5
const MIN_GAP = 0.25
const SPAN_REFERENCE_SIZE = 800

const WALLS = {
  front: {
    normal: [0, 0, 1],
    rotationY: 0,
    yaw: 0,
    toPosition: (u) => [u, ROOM.eyeHeight, -ROOM.halfDepth + WALL_OFFSET],
    toViewPosition: (u) => [u, ROOM.eyeHeight, -ROOM.halfDepth + VIEW_DISTANCE],
  },
  right: {
    normal: [-1, 0, 0],
    rotationY: -Math.PI / 2,
    yaw: -Math.PI / 2,
    toPosition: (u) => [ROOM.halfWidth - WALL_OFFSET, ROOM.eyeHeight, u],
    toViewPosition: (u) => [ROOM.halfWidth - VIEW_DISTANCE, ROOM.eyeHeight, u],
  },
  back: {
    normal: [0, 0, -1],
    rotationY: Math.PI,
    yaw: Math.PI,
    toPosition: (u) => [-u, ROOM.eyeHeight, ROOM.halfDepth - WALL_OFFSET],
    toViewPosition: (u) => [-u, ROOM.eyeHeight, ROOM.halfDepth - VIEW_DISTANCE],
  },
  left: {
    normal: [1, 0, 0],
    rotationY: Math.PI / 2,
    yaw: Math.PI / 2,
    toPosition: (u) => [-ROOM.halfWidth + WALL_OFFSET, ROOM.eyeHeight, -u],
    toViewPosition: (u) => [-ROOM.halfWidth + VIEW_DISTANCE, ROOM.eyeHeight, -u],
  },
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function imageSizeFor(artwork, imageSizeMap = {}) {
  const measured = imageSizeMap[artwork.id]
  if (measured?.width > 0 && measured?.height > 0) return measured
  return { width: SPAN_REFERENCE_SIZE * DEFAULT_ASPECT, height: SPAN_REFERENCE_SIZE }
}

function spanForImageSize(imageSize) {
  const orientation = getOrientation({
    id: '',
    width: imageSize.width,
    height: imageSize.height,
  })
  const [, large] = SIZE_PRESETS[orientation]
  return { ...large }
}

function frameSizeFor(aspect, span) {
  const isLarge = span.spanX === 3 || span.spanY === 3 || (span.spanX === 2 && span.spanY === 2)
  const maxOuterWidth = isLarge ? 2.7 : 1.85
  const maxOuterHeight = isLarge ? 2.7 : 1.95
  const minOuterWidth = isLarge ? 1.05 : 0.72
  const maxImageWidth = maxOuterWidth - FRAME_EXTRA
  const maxImageHeight = maxOuterHeight - FRAME_EXTRA
  let imageWidth = maxImageWidth
  let imageHeight = imageWidth / aspect

  if (imageHeight > maxImageHeight) {
    imageHeight = maxImageHeight
    imageWidth = imageHeight * aspect
  }

  const outerWidth = clamp(imageWidth + FRAME_EXTRA, minOuterWidth, maxOuterWidth)
  const outerHeight = imageHeight + FRAME_EXTRA
  // 画像サイズは外形から逆算しない。極端な縦長で outerWidth が最小幅に
  // クランプされたとき、逆算すると画像がアスペクト比を失って横に伸びる
  return {
    imageWidth: Math.max(0.1, imageWidth),
    imageHeight: Math.max(0.1, imageHeight),
    outerWidth,
    outerHeight,
    spanX: span.spanX,
    spanY: span.spanY,
    sizeClass: isLarge ? 'large' : 'small',
  }
}

function splitEvenly(items) {
  const base = Math.floor(items.length / WALL_ORDER.length)
  const remainder = items.length % WALL_ORDER.length
  let cursor = 0
  return WALL_ORDER.map((wall, wallIndex) => {
    const count = base + (wallIndex < remainder ? 1 : 0)
    const slice = items.slice(cursor, cursor + count)
    cursor += count
    return { wall, items: slice }
  })
}

function fitWallItems(rawItems) {
  if (!rawItems.length) return { gap: BASE_GAP, scale: 1, items: [] }

  const totalWidth = rawItems.reduce((sum, item) => sum + item.outerWidth, 0)
  const baseGaps = BASE_GAP * Math.max(0, rawItems.length - 1)
  const minGaps = MIN_GAP * Math.max(0, rawItems.length - 1)
  const naturalWidth = totalWidth + baseGaps
  const gap = naturalWidth <= WALL_SPAN ? BASE_GAP : MIN_GAP
  const availableForFrames = Math.max(0.1, WALL_SPAN - (naturalWidth <= WALL_SPAN ? baseGaps : minGaps))
  const scale = totalWidth > availableForFrames ? availableForFrames / totalWidth : 1
  const fittedWidth = totalWidth * scale + gap * Math.max(0, rawItems.length - 1)
  let cursor = -fittedWidth / 2

  const items = rawItems.map((item) => {
    const outerWidth = item.outerWidth * scale
    const outerHeight = item.outerHeight * scale
    const imageWidth = item.imageWidth * scale
    const imageHeight = item.imageHeight * scale
    const u = cursor + outerWidth / 2
    cursor += outerWidth + gap
    return {
      ...item,
      u,
      outerWidth,
      outerHeight,
      imageWidth,
      imageHeight,
      scale,
    }
  })

  return { gap, scale, items }
}

function buildViewpoints(wall, wallItems) {
  const wallDef = WALLS[wall]
  const groups = []
  for (let index = 0; index < wallItems.length; index += 3) {
    groups.push(wallItems.slice(index, index + 3))
  }
  return groups.map((group, index) => {
    const min = Math.min(...group.map((item) => item.u - item.outerWidth / 2))
    const max = Math.max(...group.map((item) => item.u + item.outerWidth / 2))
    const u = (min + max) / 2
    return {
      id: `${wall}-${index}`,
      wall,
      artworkIds: group.map((item) => String(item.id)),
      position: wallDef.toViewPosition(u),
      yaw: wallDef.yaw,
      targetU: u,
    }
  })
}

export function createGalleryLayout(artworks = [], imageSizeMap = {}) {
  const items = artworks.filter((artwork) => artwork?.image_url)
  const walls = {}
  const frames = []
  const viewpoints = []

  splitEvenly(items).forEach(({ wall, items: wallArtworks }) => {
    const rawItems = wallArtworks.map((artwork, wallIndex) => {
      const imageSize = imageSizeFor(artwork, imageSizeMap)
      const aspect = imageSize.width / imageSize.height
      const span = spanForImageSize(imageSize)
      return {
        id: String(artwork.id),
        artwork,
        wall,
        wallIndex,
        aspect,
        ...frameSizeFor(aspect, span),
      }
    })
    const fitted = fitWallItems(rawItems)
    const wallDef = WALLS[wall]
    const wallFrames = fitted.items.map((item) => ({
      ...item,
      position: wallDef.toPosition(item.u),
      rotation: [0, wallDef.rotationY, 0],
      normal: wallDef.normal,
    }))
    walls[wall] = {
      wall,
      span: WALL_SPAN,
      margin: WALL_MARGIN,
      gap: fitted.gap,
      scale: fitted.scale,
      frames: wallFrames,
    }
    frames.push(...wallFrames)
    viewpoints.push(...buildViewpoints(wall, wallFrames))
  })

  const safeViewpoints = viewpoints.length
    ? viewpoints
    : [{ id: 'center', wall: 'center', position: [0, ROOM.eyeHeight, 0], yaw: 0, targetU: 0 }]

  return {
    room: ROOM,
    walls,
    frames,
    viewpoints: safeViewpoints,
    initialViewpoint: safeViewpoints[0],
  }
}
