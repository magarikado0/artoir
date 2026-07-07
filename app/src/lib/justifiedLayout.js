/**
 * ウォール（段組＋トールバンド）レイアウトエンジン。
 *
 * 出力は「バンド」の列。バンドは横一列の「カラム」で構成され、カラムは
 *   - 単独カラム: 1枚がバンド高いっぱいに表示される（通常行のセル、または縦長作品の2行ぶち抜き）
 *   - スタックカラム: 2枚を縦に積む。幅は等しく、高さの合計＋gap がバンド高に一致する
 * のどちらか。アスペクト比は常に厳密に保たれる（トリミングしない）。
 *
 * アルゴリズム（貪欲法・縦長優先。ペア組みのための並び替えを許容）:
 * 1. 通常時は従来どおり目標行高 targetRowHeight で行を左から詰める。
 * 2. 縦長作品（aspect < TALL_ASPECT_MAX）が来たら必ずトールバンド
 *    （名目高 B ≒ 2×targetRowHeight + gap）を開く。行バッファの作品は
 *    順序を保ったままバンドの素材として処理し直す。バンドが有効な幅では
 *    すべての縦長が2行ぶち抜きの単独カラムになることを保証する。
 * 3. バンド内では「縦長 → 単独カラム、それ以外 → 2枚そろったら縦積みスタック」
 *    を繰り返す。名目高でコンテナ幅に達したらバンドを確定する。
 * 4. 確定時に未ペアの作品が残っていたら、この先のストリームから直近の非縦長を
 *    前借りしてペアを完成させる（ここだけ作品順が入れ替わる）。前借り相手が
 *    どこにもいなければ、その1枚は次の通常行へ退避する
 *    （1枚をバンド高までレターボックスで引き伸ばすことはしない）。
 * 5. バンド高 B は「カラム幅の合計＋gap ＝ コンテナ幅」となるよう厳密に解く。
 *    総幅は B の一次式（単独: a・B、スタック: (B−gap)/S, S=1/a₁+1/a₂）なので閉形式で求まる。
 * 6. 最終行/最終バンドは幅が埋まらないため、高さ上限（行1.4×・バンド2.2×target）で
 *    伸ばしすぎを抑えて左寄せにする。
 * 7. 狭幅（containerWidth < MIN_BAND_WIDTH）ではスタックが窮屈になるためバンドを無効化し、
 *    従来の段組（全て単独カラムの行）に退化する。
 *
 * @param {{id:string, aspectRatio:number}[]} items 表示順の作品（aspectRatio = width/height）
 * @param {number} containerWidth コンテナ幅(px)
 * @param {number} gap アイテム間・行間の余白(px)
 * @param {number} targetRowHeight 目標行高(px)
 * @returns {{height:number, columns:{width:number, items:{id:string, width:number, height:number, clamped:boolean}[]}[]}[]}
 *   バンドごとの表示サイズ。columns[].items は 1枚（単独）または 2枚（縦積み）。
 */

// 極端な縦長/横長はレイアウトが破綻するため比率を制限する（clamped=true で通知し、描画側は contain にする）。
const MIN_ASPECT = 0.5
const MAX_ASPECT = 2.5
// この比率未満の縦長を「2行ぶち抜き」候補にする。
// 1.0 = 高さ > 幅ならすべて大判（4:5 等の緩やかな縦長も含む）。
const TALL_ASPECT_MAX = 1.0
// 最終行（幅が埋まらない行）が1枚だけ等のとき、無制限に拡大しないための上限。
const LAST_ROW_MAX_SCALE = 1.4
// 最終トールバンドの高さ上限（×targetRowHeight）。名目高（約2.07×）より少し余裕を持たせる。
const LAST_BAND_MAX_SCALE = 2.2
// これ未満のコンテナ幅ではトールバンドを作らない（通常行のみ）。
// スマホ縦（375〜414px）でも縦長のぶち抜きを残したいので、実機の最小幅より下に置く。
const MIN_BAND_WIDTH = 320

export function computeWallBands(items, containerWidth, gap, targetRowHeight) {
  if (!items?.length || !(containerWidth > 0) || !(targetRowHeight > 0)) return []

  const entries = items.map(({ id, aspectRatio }) => {
    const raw = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 4 / 3
    const ratio = Math.min(MAX_ASPECT, Math.max(MIN_ASPECT, raw))
    return { id, ratio, clamped: ratio !== raw, tall: ratio < TALL_ASPECT_MAX }
  })

  const bandsEnabled = containerWidth >= MIN_BAND_WIDTH
  // トールバンドの名目高。確定時に厳密な B に解き直す（行の targetRowHeight に相当）。
  const bandNominalHeight = targetRowHeight * 2 + gap

  const bands = []

  // カラム: { entries: [e] }（単独・バンド高いっぱい）または { entries: [e1, e2] }（縦積み）。
  // 高さ B のときの幅: 単独 = a・B、スタック = (B − gap)/S（S = 1/a₁ + 1/a₂、2枚は等幅）。
  const columnWidthAt = (col, height) => {
    if (col.entries.length === 1) return col.entries[0].ratio * height
    return (height - gap) / col.invSum
  }

  const bandWidthAt = (cols, height) =>
    cols.reduce((sum, col) => sum + columnWidthAt(col, height), 0) + gap * (cols.length - 1)

  // カラム列を「幅の合計＋gap ＝ コンテナ幅」となる高さ B で確定して出力する。
  // 総幅 = B・K + C（K = Σa + Σ(1/S)、C = gap・(nCols−1) − gap・Σ(1/S)）の一次式を解く。
  const emitBand = (cols, isLast, maxScale) => {
    if (!cols.length) return
    let coeff = 0
    let invSumTotal = 0
    for (const col of cols) {
      if (col.entries.length === 1) coeff += col.entries[0].ratio
      else {
        coeff += 1 / col.invSum
        invSumTotal += 1 / col.invSum
      }
    }
    const constant = gap * (cols.length - 1) - gap * invSumTotal
    let height = (containerWidth - constant) / coeff
    // 最終行/バンドは幅が埋まっていないので height が大きく出る。伸ばしすぎを抑える。
    if (isLast) height = Math.min(height, targetRowHeight * maxScale)

    const bandHeight = Math.round(height)
    // 端数は累積で丸め、確定バンドの「Σ幅＋gap ＝ コンテナ幅」を±1px以内に保つ。
    let acc = 0
    const columns = cols.map((col) => {
      const exact = columnWidthAt(col, height)
      const left = Math.round(acc)
      acc += exact
      const width = Math.round(acc) - left
      if (col.entries.length === 1) {
        const { id, clamped } = col.entries[0]
        return { width, items: [{ id, width, height: bandHeight, clamped }] }
      }
      // スタック: h₁ = w/a₁、h₂ は残り（h₁＋h₂＋gap ＝ バンド高 が厳密に成立）。
      const [top, bottom] = col.entries
      const topHeight = Math.round(width / top.ratio)
      const bottomHeight = bandHeight - gap - topHeight
      return {
        width,
        items: [
          { id: top.id, width, height: topHeight, clamped: top.clamped },
          { id: bottom.id, width, height: bottomHeight, clamped: bottom.clamped },
        ],
      }
    })
    bands.push({ height: bandHeight, columns })
  }

  let mode = 'row' // 'row' | 'band'
  let rowBuf = [] // 通常行のバッファ
  let bandCols = [] // 構築中のトールバンドのカラム
  let pending = null // バンド内で未ペアの非縦長作品

  const flushRow = (isLast) => {
    if (!rowBuf.length) return
    emitBand(rowBuf.map((e) => ({ entries: [e] })), isLast, LAST_ROW_MAX_SCALE)
    rowBuf = []
  }

  // 作品を処理順に積むワークスタック（末尾から取り出す）。バンドを開くとき、
  // 行バッファの作品を順序を保ったまま差し戻してバンドとして処理し直す。
  const work = entries.slice().reverse()

  // 未ペア作品の相手を、この先のストリームから前借りする（直近の非縦長1枚）。
  // 見つからなければ null（呼び出し側が通常行へ退避させる）。取り出しは splice
  // 1回だけなので、各作品が出力にちょうど1回現れる不変条件は保たれる。
  const borrowNonTall = () => {
    for (let i = work.length - 1; i >= 0; i--) {
      if (!work[i].tall) return work.splice(i, 1)[0]
    }
    return null
  }

  while (work.length) {
    const entry = work.pop()

    if (mode === 'row') {
      // 縦長が来たら必ずバンドを開く（並び替えでペアを完成できるため無条件でよい）。
      if (bandsEnabled && entry.tall) {
        mode = 'band'
        work.push(entry)
        for (let i = rowBuf.length - 1; i >= 0; i--) work.push(rowBuf[i])
        rowBuf = []
        continue
      }
      rowBuf.push(entry)
      // 目標行高のままだと幅を超える（＝これ以上入らない）ならここで行を確定する。
      const ratioSum = rowBuf.reduce((sum, e) => sum + e.ratio, 0)
      if (ratioSum * targetRowHeight + gap * (rowBuf.length - 1) >= containerWidth) flushRow(false)
      continue
    }

    // バンド構築: 縦長は必ず単独（2行ぶち抜き）、それ以外は2枚そろったら縦積み。
    if (entry.tall) {
      bandCols.push({ entries: [entry] })
    } else if (pending) {
      const invSum = 1 / pending.ratio + 1 / entry.ratio
      bandCols.push({ entries: [pending, entry], invSum })
      pending = null
    } else {
      pending = entry
      continue
    }
    // 名目高でコンテナ幅に達したらバンドを確定し、通常行へ戻る。
    if (bandWidthAt(bandCols, bandNominalHeight) >= containerWidth) {
      if (pending) {
        // 半端なスタックはこの先の非縦長を前借りして埋める。いなければ通常行へ退避。
        const mate = borrowNonTall()
        if (mate) {
          bandCols.push({ entries: [pending, mate], invSum: 1 / pending.ratio + 1 / mate.ratio })
        } else {
          rowBuf.push(pending)
        }
        pending = null
      }
      emitBand(bandCols, false, LAST_BAND_MAX_SCALE)
      bandCols = []
      mode = 'row'
    }
  }

  // 終端処理。バンド構築中なら左寄せの最終バンドとして確定し、
  // 未ペアの作品はレターボックスにせず最終行として押し戻す。
  if (mode === 'band') {
    emitBand(bandCols, true, LAST_BAND_MAX_SCALE)
    if (pending) rowBuf.push(pending)
  }
  flushRow(true)

  return bands
}
