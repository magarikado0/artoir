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

// 視点(カメラ)関連
export const DEFAULT_FOV = 55            // Canvas の camera fov と一致させる(縦画角)
const DEFAULT_VIEWPORT_ASPECT = 1.6      // 画面アスペクト未指定時の既定(幅/高さ)
const VIEW_MARGIN = 0.35                 // 作品が画面端に張り付かないための余白(m)
const MIN_VIEW_DISTANCE = 1.6            // これ以上は作品に近づかない
const MAX_VIEW_DISTANCE = 8.0            // 部屋の奥行き内に収める上限
const VIEW_DISTANCE_SCALE = 1.3          // 全視点の引き量(大きいほど後ろに下がる)
// 縦長(狭い)画面では横画角が極端に狭くなり距離が暴走するので、距離計算用に丸める
const VIEW_ASPECT_MIN = 0.9
const VIEW_ASPECT_MAX = 2.4
// 配置・スケール関連
const FLOOR_MARGIN = 0.35                // 額の下端と床の最小距離
const CEIL_MARGIN = 0.3                  // 額の上端と天井の最小距離
const HANG_CENTER_Y = 2.05               // 横長・小型作品が壁の下に寄りすぎないための標準中心高
const VIEW_EYE_HEIGHT = 2.0              // 3D空間内の視点高。作品中心に近い高さから見る
const MAX_UPSCALE = 1.25                 // 空いた壁を埋めるための拡大上限

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

// 作品数に応じて使う壁の枚数を決める。少数を4面に薄く散らして
// 壁がすかすかになるのを避け、少ないときは前面から順に集約する。
function wallCountForItems(count) {
  if (count <= 2) return 1
  if (count <= 4) return 2
  if (count <= 8) return 3
  return WALL_ORDER.length
}

function distributeToWalls(items) {
  const wallCount = wallCountForItems(items.length)
  const targetWalls = WALL_ORDER.slice(0, wallCount)
  const base = Math.floor(items.length / wallCount)
  const remainder = items.length % wallCount
  let cursor = 0
  return targetWalls.map((wall, wallIndex) => {
    const count = base + (wallIndex < remainder ? 1 : 0)
    const slice = items.slice(cursor, cursor + count)
    cursor += count
    return { wall, items: slice }
  })
}

function maxUpscaleForItemCount(count) {
  if (count <= 2) return 1
  if (count <= 4) return 1.08
  if (count <= 8) return 1.18
  return MAX_UPSCALE
}

function viewDistanceScaleForItemCount(count) {
  if (count <= 2) return 1.08
  if (count <= 4) return 1.16
  return VIEW_DISTANCE_SCALE
}

function fitWallItems(rawItems, itemCount) {
  if (!rawItems.length) return { gap: BASE_GAP, scale: 1, items: [] }

  const totalWidth = rawItems.reduce((sum, item) => sum + item.outerWidth, 0)
  const baseGaps = BASE_GAP * Math.max(0, rawItems.length - 1)
  const minGaps = MIN_GAP * Math.max(0, rawItems.length - 1)
  const naturalWidth = totalWidth + baseGaps
  const gap = naturalWidth <= WALL_SPAN ? BASE_GAP : MIN_GAP
  const availableForFrames = Math.max(0.1, WALL_SPAN - (naturalWidth <= WALL_SPAN ? baseGaps : minGaps))
  // 天井に額が突き抜けないよう、最も背の高い額を基準に拡大上限を作る
  const tallest = Math.max(...rawItems.map((item) => item.outerHeight))
  const ceilingScale = (ROOM.height - FLOOR_MARGIN - CEIL_MARGIN) / tallest
  // 収まらなければ縮小、余れば拡大して壁の空きを埋める。
  // 少数作品では壁幅いっぱいに拡大すると、視点距離まで不自然に遠くなるため控えめにする。
  const scale = Math.min(availableForFrames / totalWidth, maxUpscaleForItemCount(itemCount), ceilingScale)
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

// 額「自身の大きさ」が画面に収まる距離を逆算する(額の中心を画面中央に見る前提)。
// 目線高から天辺までを入れようとすると背の高い額で距離が暴走するので、そうしない。
// 縦横の位置ズレはカメラのピッチ(見上げ/見下ろし)で吸収する。
function viewDistanceForFrame(item, fov, aspect, itemCount) {
  const halfTan = Math.tan((fov * Math.PI) / 180 / 2)
  const effAspect = clamp(aspect, VIEW_ASPECT_MIN, VIEW_ASPECT_MAX)
  const distV = (item.outerHeight / 2 + VIEW_MARGIN) / halfTan
  const distH = (item.outerWidth / 2 + VIEW_MARGIN) / (halfTan * effAspect)
  const distance = Math.max(distV, distH) * viewDistanceScaleForItemCount(itemCount)
  return clamp(distance, MIN_VIEW_DISTANCE, MAX_VIEW_DISTANCE)
}

function buildViewpoints(wall, wallItems, fov, aspect, itemCount) {
  const wallDef = WALLS[wall]
  return wallItems.map((item, index) => {
    const u = item.u
    const distance = viewDistanceForFrame(item, fov, aspect, itemCount)
    const viewY = Math.min(item.centerY - 0.06, VIEW_EYE_HEIGHT)
    // カメラは作品中心に近い高さに立ち、額の中心を見上げる/見下ろす角度を向く。
    // これで距離を伸ばさずに、額を画面中央に収められる。
    const pitch = Math.atan2(item.centerY - viewY, distance)
    return {
      id: `${wall}-${index}`,
      wall,
      artworkIds: [String(item.id)],
      position: wallDef.toViewPosition(u, viewY, distance),
      yaw: wallDef.yaw,
      pitch,
      targetU: u,
    }
  })
}

export function createGalleryLayout(artworks = [], imageSizeMap = {}, options = {}) {
  const items = artworks.filter((artwork) => artwork?.image_url)
  const itemCount = items.length
  const fov = options.fov ?? DEFAULT_FOV
  const aspect = options.aspect ?? DEFAULT_VIEWPORT_ASPECT
  const walls = {}
  const frames = []
  const viewpoints = []

  distributeToWalls(items).forEach(({ wall, items: wallArtworks }) => {
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
    const fitted = fitWallItems(rawItems, itemCount)
    const wallDef = WALLS[wall]
    const wallFrames = fitted.items.map((item) => {
      // 額の中心は標準の掛け位置へ寄せ、背の高い額だけ床・天井の余白に合わせて調整する。
      // 横長作品が目線高に固定されて壁の下側へ見える問題を避ける。
      const minCenterY = item.outerHeight / 2 + FLOOR_MARGIN
      const maxCenterY = ROOM.height - CEIL_MARGIN - item.outerHeight / 2
      const centerY = clamp(HANG_CENTER_Y, minCenterY, Math.max(minCenterY, maxCenterY))
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
    viewpoints.push(...buildViewpoints(wall, wallFrames, fov, aspect, itemCount))
  })

  const safeViewpoints = viewpoints.length
    ? viewpoints
    : [{ id: 'center', wall: 'center', position: [0, ROOM.eyeHeight, 0], yaw: 0, pitch: 0, targetU: 0 }]

  return {
    room: ROOM,
    walls,
    frames,
    viewpoints: safeViewpoints,
    initialViewpoint: safeViewpoints[0],
  }
}
