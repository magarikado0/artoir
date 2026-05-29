import { useEffect, useRef } from 'react'
import ArtworkMedia from './ArtworkMedia'
import { getThumbnailUrl } from '../lib/imageUrl'

export default function ExhibitionArtworkGallery({ artworks, onOpenArtwork }) {
  const galleryRef = useRef(null)

  useEffect(() => {
    const root = galleryRef.current
    if (!root) return undefined
    const items = root.querySelectorAll('.gallery-item')
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('visible') }),
      { threshold: 0.1 },
    )
    items.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [artworks])

  const items = artworks.filter((a) => getThumbnailUrl(a.image_url))
  if (items.length === 0) return null

  return (
    <div ref={galleryRef} className="ui-exhibition-artwork-grid">
      {items.map((artwork, index) => {
        const label = artwork.title?.trim() || `作品 ${index + 1}`
        return (
          <button
            key={artwork.id}
            type="button"
            className="gallery-item ui-list-card ui-exhibition-artwork-card"
            onClick={() => onOpenArtwork(artwork)}
            aria-label={`${label}の詳細を見る`}
          >
            <ArtworkMedia
              src={getThumbnailUrl(artwork.image_url)}
              alt=""
              decorative
              loading="lazy"
              fillHeight
              aspectRatio="1 / 1"
              fit="contain"
              wrapperStyle={{ borderRadius: 7, background: 'rgba(228, 211, 184, 0.12)' }}
              imageStyle={{ borderRadius: 7 }}
            />
          </button>
        )
      })}
    </div>
  )
}
