// 写真ウォール（Pinterest / 雑誌風）レイアウトエンジン。
//
// 設計方針:
//  - 「いいね数」などの外部指標は使わず、画像の元サイズ(width/height)と
//    画面の列数だけでレイアウトを決定する。
//  - 同じ画像サイズなら常に同じサイズ(span)になる（純粋・決定的）。
//  - 配置自体は CSS Grid の dense auto placement に任せる。

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

export type Photo = {
  id: string
  width: number
  height: number
}

export type Orientation = 'landscape' | 'portrait' | 'square'

/** グリッド上で占有するセル数。 */
export type Span = {
  spanX: number
  spanY: number
}

/** レイアウト結果の 1 要素。 */
export type LayoutItem = {
  id: string
  spanX: number
  spanY: number
}

export type PhotoWallLayout = {
  items: LayoutItem[]
  /** 横方向の列数（CSS Grid の列数）。 */
  columns: number
}

export type PhotoWallOptions = {
  /** グリッドの列数。既定 4。 */
  columns?: number
  /**
   * 面積スコアの基準ピクセル数。area /(area + areaReference) で 0..1 に正規化する。
   * 小さいほど「すぐ大きい扱い」になる。既定 600000（≒775px四方）。
   */
  areaReference?: number
}

// ---------------------------------------------------------------------------
// サイズ候補
// ---------------------------------------------------------------------------

// 3D ギャラリーも参照する互換用プリセット。
export const SIZE_PRESETS: Record<Orientation, [Span, Span]> = {
  landscape: [
    { spanX: 2, spanY: 1 },
    { spanX: 3, spanY: 1 },
  ],
  square: [
    { spanX: 1, spanY: 1 },
    { spanX: 2, spanY: 2 },
  ],
  portrait: [
    { spanX: 1, spanY: 2 },
    { spanX: 1, spanY: 3 },
  ],
}

type SpanCandidate = Span & {
  minAspect?: number
  maxAspect?: number
  minColumns?: number
}

const WALL_SPAN_CANDIDATES: Record<Orientation, SpanCandidate[]> = {
  landscape: [
    { spanX: 2, spanY: 1, maxAspect: 1.8 },
    { spanX: 3, spanY: 2, minAspect: 1.25, maxAspect: 2.15 },
    { spanX: 3, spanY: 1, minAspect: 1.8 },
    { spanX: 4, spanY: 2, minAspect: 1.45, maxAspect: 2.5, minColumns: 4 },
    { spanX: 4, spanY: 1, minAspect: 2.35, minColumns: 4 },
  ],
  square: [
    { spanX: 1, spanY: 1 },
    { spanX: 2, spanY: 2 },
    { spanX: 3, spanY: 2, minAspect: 1.05, minColumns: 3 },
    { spanX: 2, spanY: 3, maxAspect: 0.95 },
  ],
  portrait: [
    { spanX: 1, spanY: 2, minAspect: 0.58 },
    { spanX: 2, spanY: 3, minAspect: 0.55, maxAspect: 0.92 },
    { spanX: 1, spanY: 3, maxAspect: 0.62 },
    { spanX: 2, spanY: 4, maxAspect: 0.72 },
  ],
}

// ---------------------------------------------------------------------------
// 向き判定・サイズ決定
// ---------------------------------------------------------------------------

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v)

/** aspectRatio = width / height で向きを判定する。 */
export function getOrientation(photo: Photo): Orientation {
  const aspectRatio = photo.width / photo.height
  if (aspectRatio > 1.3) return 'landscape'
  if (aspectRatio < 0.8) return 'portrait'
  return 'square'
}

function filterCandidates(candidates: SpanCandidate[], aspectRatio: number, columns: number): SpanCandidate[] {
  return candidates.filter((candidate) => {
    if (candidate.minColumns && columns < candidate.minColumns) return false
    if (candidate.minAspect && aspectRatio < candidate.minAspect) return false
    if (candidate.maxAspect && aspectRatio > candidate.maxAspect) return false
    return true
  })
}

function targetCellCount(orientation: Orientation, areaScore: number): number {
  if (orientation === 'square') return 1 + areaScore * 3
  if (orientation === 'portrait') return 2 + areaScore * 5
  return 2 + areaScore * 6
}

function spanScore(candidate: SpanCandidate, aspectRatio: number, targetCells: number): number {
  const candidateAspect = candidate.spanX / candidate.spanY
  const candidateCells = candidate.spanX * candidate.spanY
  const aspectDistance = Math.abs(Math.log(aspectRatio / candidateAspect))
  const areaDistance = Math.abs(candidateCells - targetCells) / Math.max(1, targetCells)

  return aspectDistance * 1.4 + areaDistance * 0.6
}

function pickBestSpan(candidates: SpanCandidate[], aspectRatio: number, targetCells: number): Span {
  let best = candidates[0]
  let bestScore = spanScore(best, aspectRatio, targetCells)

  for (const candidate of candidates.slice(1)) {
    const score = spanScore(candidate, aspectRatio, targetCells)
    if (score < bestScore) {
      best = candidate
      bestScore = score
    }
  }

  return { spanX: best.spanX, spanY: best.spanY }
}

/**
 * 1 枚の写真のサイズ(span)を決める。
 *
 * - 実アスペクト比に近い候補を優先する。
 * - 面積が大きい画像ほど、大きい span が選ばれやすい。
 * - 乱数は使わず、同じ画像サイズと列数なら常に同じ span になる。
 */
export function decideSpan(photo: Photo, options: PhotoWallOptions = {}): Span {
  const areaReference = options.areaReference ?? 600000
  const safeWidth = Math.max(1, photo.width)
  const safeHeight = Math.max(1, photo.height)
  const aspectRatio = safeWidth / safeHeight
  const orientation = getOrientation({ ...photo, width: safeWidth, height: safeHeight })
  const columns = Math.max(1, Math.floor(options.columns ?? 4))

  const area = safeWidth * safeHeight
  const areaScore = clamp01(area / (area + areaReference))
  const targetCells = targetCellCount(orientation, areaScore)
  const candidates = WALL_SPAN_CANDIDATES[orientation]
  const matched = filterCandidates(candidates, aspectRatio, columns)
  const pool = matched.length > 0 ? matched : candidates.filter((candidate) => !candidate.minColumns || columns >= candidate.minColumns)

  return pickBestSpan(pool.length > 0 ? pool : candidates, aspectRatio, targetCells)
}

/**
 * 写真ウォールのレイアウトを計算する純粋関数。
 *
 * 同じ photos 配列・同じ options を渡せば常に同じ結果を返す。
 *
 * @param photos 入力写真（id と元サイズ width/height）
 * @param options 列数や面積スコア基準の調整
 */
export function layoutPhotoWall(photos: Photo[], options: PhotoWallOptions = {}): PhotoWallLayout {
  const columns = Math.max(1, Math.floor(options.columns ?? 4))

  if (photos.length === 0) {
    return { items: [], columns }
  }

  const items: LayoutItem[] = []

  for (const photo of photos) {
    const span = decideSpan(photo, options)
    // 列数より広い span は列数に丸める（例: 3 列グリッドの 3x1 はそのまま、2 列なら 2x1 に）。
    span.spanX = Math.min(span.spanX, columns)
    items.push({ id: photo.id, spanX: span.spanX, spanY: span.spanY })
  }

  return { items, columns }
}
