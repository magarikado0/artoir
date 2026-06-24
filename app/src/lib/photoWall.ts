// 写真ウォール（Pinterest / 雑誌風）レイアウトエンジン。
//
// 設計方針:
//  - 「いいね数」などの外部指標は使わず、画像の元サイズ(width/height)と
//    photo.id をシードにした疑似乱数だけでレイアウトを決定する。
//  - 同じ photo.id なら常に同じサイズ(span)になる（純粋・決定的）。
//  - 配置は Occupancy Grid（占有グリッド）方式。
//  - すべて純粋関数で、React からは layoutPhotoWall() の結果を使うだけ。
//
// 計算量は概ね O(n × rows × columns)（写真数 n に対して O(n²) 程度）。

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

/** レイアウト結果の 1 要素。x,y は占有開始セル（0 始まり）。 */
export type LayoutItem = {
  id: string
  x: number
  y: number
  spanX: number
  spanY: number
}

export type PhotoWallLayout = {
  items: LayoutItem[]
  /** 横方向の列数（CSS Grid の列数）。 */
  columns: number
  /** 使用した行数（CSS Grid の総行数）。 */
  rows: number
}

export type PhotoWallOptions = {
  /** グリッドの列数。既定 4。 */
  columns?: number
  /**
   * 大きいサイズ(span)が選ばれる基礎確率。
   * 面積に依存しない下駄。既定 0.15。
   */
  largeBase?: number
  /**
   * 面積スコア(0..1)が大きいサイズ確率に与える重み。既定 0.7。
   * largeProbability = largeBase + largeAreaWeight × areaScore
   */
  largeAreaWeight?: number
  /**
   * 面積スコアの基準ピクセル数。area /(area + areaReference) で 0..1 に正規化する。
   * 小さいほど「すぐ大きい扱い」になる。既定 600000（≒775px四方）。
   */
  areaReference?: number
}

// ---------------------------------------------------------------------------
// サイズ候補プリセット（向きごとに [小, 大] の 2 段）
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// シード付き疑似乱数（同じ文字列 → 同じ乱数列）
// ---------------------------------------------------------------------------

/** 文字列を 32bit シードに畳み込む（xmur3）。 */
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return h >>> 0
  }
}

/** 32bit シードから [0,1) の乱数を返す関数を作る（mulberry32）。 */
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * 文字列シードから決定的な乱数生成器を作る。
 * 同じ seed なら毎回まったく同じ乱数列を返す。
 */
export function createSeededRandom(seed: string): () => number {
  const seedFn = xmur3(seed)
  return mulberry32(seedFn())
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

/**
 * 1 枚の写真のサイズ(span)を決める。
 *
 * - 面積が大きいほど大きい span が選ばれやすい（areaScore で確率を底上げ）。
 * - 完全固定ではなく seed 付き乱数で揺らぎを加える。
 * - areaScore は写真単体の面積だけから決まる（他の写真に依存しない）ため、
 *   同じ photo.id なら常に同じ span になる。
 */
export function decideSpan(photo: Photo, options: PhotoWallOptions = {}): Span {
  const largeBase = options.largeBase ?? 0.15
  const largeAreaWeight = options.largeAreaWeight ?? 0.7
  const areaReference = options.areaReference ?? 600000

  const orientation = getOrientation(photo)
  const [small, large] = SIZE_PRESETS[orientation]

  // 面積を 0..1 に飽和させる（写真単体で完結 → 決定的）。
  const area = Math.max(0, photo.width * photo.height)
  const areaScore = area / (area + areaReference)

  // 大きい span が選ばれる確率。面積が大きいほど高い。
  const largeProbability = clamp01(largeBase + largeAreaWeight * areaScore)

  // id をシードにした乱数で抽選（同じ id なら毎回同じ結果）。
  const rand = createSeededRandom(photo.id)
  return rand() < largeProbability ? { ...large } : { ...small }
}

// ---------------------------------------------------------------------------
// Occupancy Grid（占有グリッド）
// ---------------------------------------------------------------------------

type Grid = boolean[][] // grid[y][x] === true で占有済み

/** 行が足りなければ空行を追加して rowsNeeded 行を保証する。 */
function ensureRows(grid: Grid, rowsNeeded: number, columns: number): void {
  while (grid.length < rowsNeeded) {
    grid.push(new Array<boolean>(columns).fill(false))
  }
}

/**
 * (x,y) を左上として spanX×spanY が収まるか判定する。
 * グリッド外の行（未生成の下方向）は空きとみなす（後で行追加するため）。
 */
function fits(grid: Grid, x: number, y: number, span: Span, columns: number): boolean {
  if (x < 0 || x + span.spanX > columns) return false
  for (let yy = y; yy < y + span.spanY; yy++) {
    const row = grid[yy]
    if (!row) continue // 未生成の行は空き扱い
    for (let xx = x; xx < x + span.spanX; xx++) {
      if (row[xx]) return false
    }
  }
  return true
}

/** (x,y) に span を占有させる（必要なら行を追加）。 */
function occupy(grid: Grid, x: number, y: number, span: Span, columns: number): void {
  ensureRows(grid, y + span.spanY, columns)
  for (let yy = y; yy < y + span.spanY; yy++) {
    for (let xx = x; xx < x + span.spanX; xx++) {
      grid[yy][xx] = true
    }
  }
}

/**
 * span が収まる最初の空き位置を、行優先（上→下, 左→右）で探索する。
 *
 * 「行優先で最初に収まる位置」を選ぶことには次の品質上の意味がある:
 *  - 列数が固定なので、総行数を最小化することは「空白セルの総数を最小化する」
 *    ことと等価（空白 = rows×columns − 占有セル合計、占有合計は配置順に不変）。
 *    最小の y に置く＝総行数を増やしにくい＝空白が少ない。
 *  - 毎回上から探すので、後から来る小さい写真が上段に残った隙間を埋めていく。
 *    これにより「孤立した 1×1 の空白が大量に残る」のを防ぐ。
 */
function findPlacement(grid: Grid, span: Span, columns: number): { x: number; y: number } {
  // y は既存行の 1 つ下（= 新規行に置く）まで許可する。
  const maxY = grid.length
  for (let y = 0; y <= maxY; y++) {
    for (let x = 0; x + span.spanX <= columns; x++) {
      if (fits(grid, x, y, span, columns)) return { x, y }
    }
  }
  // 理論上ここには来ないが、保険として最下段に置く。
  return { x: 0, y: grid.length }
}

// ---------------------------------------------------------------------------
// 公開 API
// ---------------------------------------------------------------------------

/**
 * 写真ウォールのレイアウトを計算する純粋関数。
 *
 * 同じ photos 配列・同じ options を渡せば常に同じ結果を返す。
 * 各写真の span は photo.id と元サイズだけで決まる（順序や他の写真に非依存）。
 *
 * @param photos 入力写真（id と元サイズ width/height）
 * @param options 列数やサイズ確率の調整
 */
export function layoutPhotoWall(photos: Photo[], options: PhotoWallOptions = {}): PhotoWallLayout {
  const columns = Math.max(1, Math.floor(options.columns ?? 4))

  if (photos.length === 0) {
    return { items: [], columns, rows: 0 }
  }

  const grid: Grid = []
  const items: LayoutItem[] = []

  for (const photo of photos) {
    // 1) サイズ決定（決定的）。
    const span = decideSpan(photo, options)
    // 列数より広い span は列数に丸める（例: 3 列グリッドの 3x1 はそのまま、2 列なら 2x1 に）。
    span.spanX = Math.min(span.spanX, columns)

    // 2) 配置位置を探索して占有。
    const { x, y } = findPlacement(grid, span, columns)
    occupy(grid, x, y, span, columns)

    items.push({ id: photo.id, x, y, spanX: span.spanX, spanY: span.spanY })
  }

  return { items, columns, rows: grid.length }
}
