import { useEffect } from 'react'
import ArtworkMedia from './ArtworkMedia'
import { getFullImageUrl } from '../lib/imageUrl'

export default function ArtworkModal({ artwork, onClose }) {
  const open = !!artwork

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  if (!open) return null

  const title = artwork.title?.trim() ?? ''
  const description = artwork.description?.trim() ?? ''
  const hasTitle = Boolean(title)
  const hasDescription = Boolean(description)
  const hasDetail = hasTitle || hasDescription

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={hasTitle ? 'artwork-modal-title' : undefined}
      aria-label={hasTitle ? undefined : '作品詳細'}
      className={['ui-artwork-modal', !hasDetail && 'ui-artwork-modal--media-only'].filter(Boolean).join(' ')}
    >
      <div className="ui-artwork-modal-bar">
        <div className="ui-artwork-modal-eyebrow">ARTWORK</div>
        <button
          onClick={onClose}
          className="ui-modal-close ui-artwork-modal-close"
          aria-label="作品詳細を閉じる"
          type="button"
        >
          ×
        </button>
      </div>

      <div className="ui-artwork-modal-body">
        <div className="ui-artwork-modal-viewer">
          <ArtworkMedia
            src={getFullImageUrl(artwork.image_url)}
            alt={artwork.title}
            label={artwork.title}
            loading="eager"
            fit="contain"
            className="ui-artwork-modal-media"
            wrapperStyle={{ borderRadius: 8 }}
            imageStyle={{ borderRadius: 8 }}
          />
        </div>

        {hasDetail && (
          <aside className="ui-artwork-modal-detail">
            {hasTitle && (
              <div>
                <div className="ui-artwork-modal-detail-label">TITLE</div>
                <h2 id="artwork-modal-title" className="ui-artwork-modal-title">
                  {title}
                </h2>
              </div>
            )}

            {hasDescription && (
              <div className={hasTitle ? 'ui-artwork-modal-description-wrap' : undefined}>
                <div className="ui-artwork-modal-detail-label">DESCRIPTION</div>
                <div className="ui-artwork-modal-description">{description}</div>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  )
}
