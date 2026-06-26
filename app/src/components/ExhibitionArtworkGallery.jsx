import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import ArtworkMedia from './ArtworkMedia'
import { getModalImageUrl, getWallThumbnailUrl, preloadImageUrl } from '../lib/imageUrl'
import { usePhotoWallLayout } from '../lib/usePhotoWallLayout'
import { useImageNaturalSizes } from '../lib/useImageNaturalSizes'
import FavoriteButton from './FavoriteButton'
import { T } from '../lib/tokens'

// 画像サイズが未計測のあいだの仮サイズ（正方形扱い）。計測後に正しい span へ反映される。
const FALLBACK_SIZE = { width: 1000, height: 1000 }

// コンテナ幅から列数を決める（スマホ3・タブレット4・デスクトップ6）。
function columnsForWidth(width) {
  if (width < 640) return 3
  if (width < 1024) return 4
  return 6
}

export default function ExhibitionArtworkGallery({ artworks, onOpenArtwork }) {
  const wrapRef = useRef(null)
  const [containerWidth, setContainerWidth] = useState(0)

  // 実際の表示幅を計測し、列幅に合わせて行高を決める（タイルの比率を画面サイズに依らず一定に保つ）。
  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return undefined
    const update = () => setContainerWidth(el.clientWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const gap = containerWidth && containerWidth < 640 ? 8 : 16
  const columns = columnsForWidth(containerWidth || 1024)
  // 1 セル（1×1）が正方形になるよう、行高 = 列幅 にそろえる。
  const columnWidth = containerWidth > 0 ? (containerWidth - gap * (columns - 1)) / columns : 0
  const rowHeight = columnWidth > 0 ? columnWidth : 120

  const items = useMemo(() => artworks.filter((a) => a.image_url), [artworks])

  // サムネイルの自然サイズを計測（DB に幅高さが無いため）。
  const sources = useMemo(
    () => items.map((a) => ({ id: String(a.id), url: getWallThumbnailUrl(a.image_url) })),
    [items],
  )
  const sizes = useImageNaturalSizes(sources)

  // エンジン入力（id・width・height）。未計測は仮サイズ。
  const photos = useMemo(
    () => items.map((a) => {
      const measured = sizes.get(String(a.id))
      return { id: String(a.id), width: measured?.width ?? FALLBACK_SIZE.width, height: measured?.height ?? FALLBACK_SIZE.height }
    }),
    [items, sizes],
  )

  const artworkById = useMemo(() => {
    const map = new Map()
    for (const a of items) map.set(String(a.id), a)
    return map
  }, [items])

  const { items: layoutItems } = usePhotoWallLayout(photos, columns)

  // 未保存作品の栞は既定で隠す。PC はホバー（CSS）、モバイルは長押しで「追加」ボタンを出す。
  // 保存済みは常時表示（CSS の .is-active）。長押し中はこの id のカードに .is-revealed を付ける。
  const [revealedId, setRevealedId] = useState(null)
  const longPressTimer = useRef(null)
  const suppressClickRef = useRef(false)
  const pointerStartRef = useRef(null)

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    pointerStartRef.current = null
  }

  const handlePointerDown = (e, id) => {
    // 栞ボタン自体のタップは邪魔しない（トグルさせる）。
    if (e.target.closest('.ui-artwork-wall-fav')) return
    // 別のカードに触れたら前の表示を畳む。
    setRevealedId((cur) => (cur === id ? cur : null))
    cancelLongPress()
    pointerStartRef.current = { x: e.clientX, y: e.clientY }
    longPressTimer.current = setTimeout(() => {
      suppressClickRef.current = true // 直後の click（モーダル展開）を抑止する
      setRevealedId(id)
    }, 450)
  }

  const handlePointerMove = (e) => {
    const start = pointerStartRef.current
    if (!start) return
    // スクロール/ドラッグとみなせる移動があれば長押しを取り消す。
    if (Math.abs(e.clientX - start.x) > 10 || Math.abs(e.clientY - start.y) > 10) cancelLongPress()
  }

  const handleOpen = (artwork) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false // 長押し直後のクリックは無視（栞を出すだけ）
      return
    }
    setRevealedId(null)
    onOpenArtwork(artwork)
  }

  if (items.length === 0) return null

  return (
    <div
      ref={wrapRef}
      className="ui-photo-wall"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gridAutoRows: `${rowHeight}px`,
        gridAutoFlow: 'row dense',
        gap,
      }}
    >
      {layoutItems.map((item, index) => {
        const artwork = artworkById.get(item.id)
        if (!artwork) return null
        const label = artwork.title?.trim() || `作品 ${index + 1}`
        return (
          <div
            key={item.id}
            className={`ui-list-card ui-artwork-wall-card${revealedId === item.id ? ' is-revealed' : ''}`}
            style={{ gridColumn: `span ${item.spanX}`, gridRow: `span ${item.spanY}`, minWidth: 0, minHeight: 0 }}
            onPointerDown={(e) => handlePointerDown(e, item.id)}
            onPointerMove={handlePointerMove}
            onPointerUp={cancelLongPress}
            onPointerCancel={cancelLongPress}
            onPointerLeave={cancelLongPress}
            onContextMenu={(e) => e.preventDefault()}
          >
            <button
              type="button"
              className="ui-artwork-wall-open"
              onPointerEnter={() => preloadImageUrl(getModalImageUrl(artwork.image_url))}
              onFocus={() => preloadImageUrl(getModalImageUrl(artwork.image_url))}
              onClick={() => handleOpen(artwork)}
              aria-label={`${label}の詳細を見る`}
            >
              <ArtworkMedia
                src={getWallThumbnailUrl(artwork.image_url)}
                alt=""
                decorative
                loading="lazy"
                fillHeight
                fit="contain"
                wrapperStyle={{ borderRadius: 4, background: T.surfaceMuted, width: '100%', height: '100%' }}
                // 枠いっぱいに拡大して contain（上下または左右の辺が枠に接する）。
                // 既定の contain は自然サイズ上限で拡大しないため、明示的に枠を充たす。
                imageStyle={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 4 }}
              />
            </button>
            <FavoriteButton
              targetType="artwork"
              targetId={artwork.id}
              kind="bookmark"
              appearance="icon"
              stopPropagation
              className="ui-artwork-wall-fav"
            />
          </div>
        )
      })}
    </div>
  )
}
