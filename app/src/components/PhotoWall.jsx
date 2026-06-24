import { useMemo } from 'react'
import { usePhotoWallLayout } from '../lib/usePhotoWallLayout'

/**
 * 写真ウォール表示コンポーネント。CSS Grid で span を反映する。
 *
 * 各セルの高さは rowHeight 固定（grid-auto-rows）で、spanY が縦の高さに対応する。
 * セルの中身は renderItem(item, photo) で描画する。
 *
 * @param {object} props
 * @param {{id:string,width:number,height:number}[]} props.photos
 * @param {number} [props.columns=4] 列数
 * @param {number} [props.rowHeight=160] 1 行の高さ(px)
 * @param {number} [props.gap=8] セル間の隙間(px)
 * @param {object} [props.options] レイアウトエンジンの調整オプション
 * @param {(item:object, photo:object) => React.ReactNode} props.renderItem セル描画
 */
export default function PhotoWall({
  photos = [],
  columns = 4,
  rowHeight = 160,
  gap = 8,
  options,
  renderItem,
}) {
  const { items } = usePhotoWallLayout(photos, columns, options)

  // id → photo の対応表（renderItem に元データも渡せるように）。
  const photoById = useMemo(() => {
    const map = new Map()
    for (const p of photos) map.set(p.id, p)
    return map
  }, [photos])

  return (
    <div
      className="ui-photo-wall"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gridAutoRows: `${rowHeight}px`,
        gridAutoFlow: 'row dense',
        gap,
      }}
    >
      {items.map((item) => (
        <div
          key={item.id}
          className="ui-photo-wall-cell"
          style={{
            gridColumn: `span ${item.spanX}`,
            gridRow: `span ${item.spanY}`,
            minWidth: 0,
            minHeight: 0,
          }}
        >
          {renderItem(item, photoById.get(item.id))}
        </div>
      ))}
    </div>
  )
}
