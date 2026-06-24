import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import ArtworkMedia from './ArtworkMedia'
import { getGalleryThumbnailUrl, getModalImageUrl, preloadImageUrl } from '../lib/imageUrl'
import { usePhotoWallLayout } from '../lib/usePhotoWallLayout'
import { useImageNaturalSizes } from '../lib/useImageNaturalSizes'
import FavoriteButton from './FavoriteButton'
import { T } from '../lib/tokens'

// 画像サイズが未計測のあいだの仮サイズ（正方形扱い）。計測後に正しい span へ反映される。
const FALLBACK_SIZE = { width: 1000, height: 1000 }

// コンテナ幅から列数を決める（スマホ2・小型タブレット3・タブレット4・デスクトップ6）。
function columnsForWidth(width) {
  if (width < 420) return 2
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
    () => items.map((a) => ({ id: String(a.id), url: getGalleryThumbnailUrl(a.image_url) })),
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
            className="ui-list-card ui-artwork-wall-card"
            style={{ gridColumn: `span ${item.spanX}`, gridRow: `span ${item.spanY}`, minWidth: 0, minHeight: 0 }}
          >
            <button
              type="button"
              className="ui-artwork-wall-open"
              onPointerEnter={() => preloadImageUrl(getModalImageUrl(artwork.image_url))}
              onFocus={() => preloadImageUrl(getModalImageUrl(artwork.image_url))}
              onClick={() => onOpenArtwork(artwork)}
              aria-label={`${label}の詳細を見る`}
            >
              <ArtworkMedia
                src={getGalleryThumbnailUrl(artwork.image_url)}
                alt=""
                decorative
                loading="lazy"
                fillHeight
                fit="contain"
                wrapperStyle={{ borderRadius: 4, background: T.surfaceMuted, width: '100%', height: '100%' }}
                imageStyle={{ borderRadius: 4 }}
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
