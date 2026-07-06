import { getOrientation, SIZE_PRESETS } from '../../lib/photoWall'

export const ROOM = {
  width: 12,
  depth: 12,
  height: 4.6,
  halfWidth: 6,
  halfDepth: 6,
  eyeHeight: 1.5,
}

export const WALL_ORDER = ['front', 'right', 'back', 'left']

const WALL_SPAN = 10.5
const WALL_MARGIN = 0.75
const WALL_OFFSET = 0.02
const VIEW_DISTANCE = 2.5
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
    toPosition: (u, y = ROOM.eyeHeight) => [u, y, -ROOM.halfDepth + WALL_OFFSET],
    toViewPosition: (u, y = ROOM.eyeHeight, distance = VIEW_DISTANCE) => [u, y, -ROOM.halfDepth + distance],
  },
  right: {
    normal: [-1, 0, 0],
    rotationY: -Math.PI / 2,
    yaw: -Math.PI / 2,
    toPosition: (u, y = ROOM.eyeHeight) => [ROOM.halfWidth - WALL_OFFSET, y, u],
    toViewPosition: (u, y = ROOM.eyeHeight, distance = VIEW_DISTANCE) => [ROOM.halfWidth - distance, y, u],
  },
  back: {
    normal: [0, 0, -1],
    rotationY: Math.PI,
    yaw: Math.PI,
    toPosition: (u, y = ROOM.eyeHeight) => [-u, y, ROOM.halfDepth - WALL_OFFSET],
    toViewPosition: (u, y = ROOM.eyeHeight, distance = VIEW_DISTANCE) => [-u, y, ROOM.halfDepth - distance],
  },
  left: {
    normal: [1, 0, 0],
    rotationY: Math.PI / 2,
    yaw: Math.PI / 2,
    toPosition: (u, y = ROOM.eyeHeight) => [-ROOM.halfWidth + WALL_OFFSET, y, -u],
    toViewPosition: (u, y = ROOM.eyeHeight, distance = VIEW_DISTANCE) => [-ROOM.halfWidth + distance, y, -u],
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
  const isOneByThree = span.spanX === 1 && span.spanY === 3
  const isLarge = span.spanX === 3 || span.spanY === 3 || (span.spanX === 2 && span.spanY === 2)
  // 縦長(spanY > spanX)は高さ上限を引き上げて、より縦長に見せる
  const isTall = span.spanY > span.spanX
  // 横長(spanX > spanY)は大きめに見せる
  const isWide = span.spanX > span.spanY
  // 正方形(spanX === spanY)は少し小さめに抑える
  const isSquare = span.spanX === span.spanY
  const maxOuterWidth = isSquare
    ? (isLarge ? 2.25 : 1.55)
    : isWide
      ? (isLarge ? 4.0 : 2.75)
      : (isLarge ? 2.7 : 1.85)
  const maxOuterHeight = isSquare
    ? (isLarge ? 2.25 : 1.55)
    : isTall
      ? (isLarge ? 2.9 : 2.3)
      : isWide
        ? (isLarge ? 2.9 : 2.0)
        : (isLarge ? 2.7 : 1.95)
  const minOuterWidth = isLarge ? 1.05 : 0.72
  const maxImageWidth = maxOuterWidth - FRAME_EXTRA
  const maxImageHeight = maxOuterHeight - FRAME_EXTRA
  let imageWidth = maxImageWidth
  let imageHeight = imageWidth / aspect

  if (imageHeight > maxImageHeight) {
    imageHeight = maxImageHeight
    imageWidth = imageHeight * aspect
  }

  if (isOneByThree) {
    imageWidth *= 1.5
    imageHeight *= 1.5
  }

  const outerWidth = clamp(
    imageWidth + FRAME_EXTRA,
    minOuterWidth,
    isOneByThree ? maxOuterWidth * 1.5 : maxOuterWidth,
  )
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
    isOneByThree,
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

function buildViewpoints(wall, wallItems, viewDistance) {
  const wallDef = WALLS[wall]
  return wallItems.map((item, index) => {
    const u = item.u
    return {
      id: `${wall}-${index}`,
      wall,
      artworkIds: [String(item.id)],
      position: wallDef.toViewPosition(u, item.centerY, viewDistance),
      yaw: wallDef.yaw,
      targetU: u,
    }
  })
}

export function createGalleryLayout(artworks = [], imageSizeMap = {}, options = {}) {
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
    const wallFrames = fitted.items.map((item) => {
      const centerY = item.isOneByThree
        ? Math.max(ROOM.eyeHeight, item.outerHeight / 2 + 0.12)
        : ROOM.eyeHeight
      return {
        ...item,
        centerY,
        position: wallDef.toPosition(item.u, centerY),
        rotation: [0, wallDef.rotationY, 0],
        normal: wallDef.normal,
      }
    })
    walls[wall] = {
      wall,
      span: WALL_SPAN,
      margin: WALL_MARGIN,
      gap: fitted.gap,
      scale: fitted.scale,
      frames: wallFrames,
    }
    frames.push(...wallFrames)
    viewpoints.push(...buildViewpoints(wall, wallFrames, options.viewDistance ?? VIEW_DISTANCE))
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
