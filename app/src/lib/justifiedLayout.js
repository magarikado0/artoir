/**
 * ジャスティファイド（段組）レイアウトエンジン。Flickr / Google フォト風。
 * 目標行高で左から詰めていき、行がコンテナ幅を超えた時点でその行を
 * 「幅＋ギャップ＝コンテナ幅」ちょうどに縮めて確定する（貪欲法）。
 *
 * @param {{id:string, aspectRatio:number}[]} items 表示順の作品（aspectRatio = width/height）
 * @param {number} containerWidth コンテナ幅(px)
 * @param {number} gap アイテム間・行間の余白(px)
 * @param {number} targetRowHeight 目標行高(px)
 * @returns {{id:string, width:number, height:number, clamped:boolean}[][]} 行ごとの表示サイズ
 */

// 極端な縦長/横長はレイアウトが破綻するため比率を制限する（clamped=true で通知し、描画側は contain にする）。
const MIN_ASPECT = 0.5
const MAX_ASPECT = 2.5
// 最終行（幅が埋まらない行）が1枚だけ等のとき、無制限に拡大しないための上限。
const LAST_ROW_MAX_SCALE = 1.4

export function computeJustifiedRows(items, containerWidth, gap, targetRowHeight) {
  if (!items?.length || !(containerWidth > 0) || !(targetRowHeight > 0)) return []

  const entries = items.map(({ id, aspectRatio }) => {
    const raw = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 4 / 3
    const ratio = Math.min(MAX_ASPECT, Math.max(MIN_ASPECT, raw))
    return { id, ratio, clamped: ratio !== raw }
  })

  const rows = []
  let row = []
  let ratioSum = 0

  const flushRow = (isLast) => {
    if (!row.length) return
    const available = containerWidth - gap * (row.length - 1)
    // 行内の画像幅の合計が available に一致する高さ。確定行はこれでピッタリ揃う。
    let height = available / ratioSum
    // 最終行は幅が埋まっていないので height > target になる。伸ばしすぎを抑える。
    if (isLast) height = Math.min(height, targetRowHeight * LAST_ROW_MAX_SCALE)
    rows.push(row.map(({ id, ratio, clamped }) => ({
      id,
      width: Math.round(ratio * height),
      height: Math.round(height),
      clamped,
    })))
    row = []
    ratioSum = 0
  }

  for (const entry of entries) {
    row.push(entry)
    ratioSum += entry.ratio
    // 目標行高のままだと幅を超える（＝これ以上入らない）ならここで行を確定する。
    // 1枚でコンテナ幅を超える横長も、この判定で単独行になり縮小される。
    const rowWidthAtTarget = ratioSum * targetRowHeight + gap * (row.length - 1)
    if (rowWidthAtTarget >= containerWidth) flushRow(false)
  }
  flushRow(true)

  return rows
}
