import { useCallback, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import ArtworkMedia from './ArtworkMedia'
import { getArtworkHighResolutionUrl, getGalleryThumbnailUrl, getModalImageUrl, preloadImageUrl } from '../lib/imageUrl'
import { profileExhibitionPath, profilePath } from '../lib/profileRoutes'
import { useHorizontalSwipe } from '../lib/useHorizontalSwipe'

function ModalNavIcon({ direction }) {
  const s = { stroke: 'currentColor', strokeWidth: 2, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" aria-hidden="true">
      {direction === 'prev' ? (
        <path d="M14 6l-6 6 6 6" {...s} />
      ) : (
        <path d="M10 6l6 6-6 6" {...s} />
      )}
    </svg>
  )
}

export default function ArtworkModal({ artwork, artworks = [], onSelectArtwork, onClose }) {
  const open = !!artwork
  const viewerRef = useRef(null)

  const currentIndex = open
    ? artworks.findIndex((item) => String(item.id) === String(artwork.id))
    : -1
  const hasMultiple = artworks.length > 1
  const canGoPrev = hasMultiple && currentIndex > 0
  const canGoNext = hasMultiple && currentIndex >= 0 && currentIndex < artworks.length - 1

  const goPrev = useCallback(() => {
    if (!canGoPrev || !onSelectArtwork) return
    onSelectArtwork(artworks[currentIndex - 1])
  }, [artworks, canGoPrev, currentIndex, onSelectArtwork])

  const goNext = useCallback(() => {
    if (!canGoNext || !onSelectArtwork) return
    onSelectArtwork(artworks[currentIndex + 1])
  }, [artworks, canGoNext, currentIndex, onSelectArtwork])

  const closeIfCurrentPath = useCallback((to) => {
    if (typeof window === 'undefined') return
    if (window.location.pathname === to) onClose()
  }, [onClose])

  useHorizontalSwipe(viewerRef, {
    onPrev: canGoPrev ? goPrev : undefined,
    onNext: canGoNext ? goNext : undefined,
    enabled: open && hasMultiple,
  })

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const handler = (e) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goPrev()
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        goNext()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose, goPrev, goNext])

  useEffect(() => {
    if (!open || currentIndex < 0) return
    const neighbors = [artworks[currentIndex - 1], artworks[currentIndex + 1]].filter(Boolean)
    neighbors.forEach((item) => {
      preloadImageUrl(getModalImageUrl(item.image_url))
      preloadImageUrl(getGalleryThumbnailUrl(item.image_url))
    })
  }, [open, currentIndex, artworks])

  if (!open) return null

  const title = artwork.title?.trim() ?? ''
  const description = artwork.description?.trim() ?? ''
  const visibleCreators = (artwork.creators || []).filter((creator) => creator.is_visible && creator.profile?.display_name)
  const exhibition = artwork.exhibitions
  const ownerOrg = exhibition?.organizations
  const ownerProfile = exhibition?.profiles
  const exhibitionHref = exhibition?.slug
    ? ownerProfile?.slug
      ? profileExhibitionPath(ownerProfile.slug, exhibition.slug)
      : ownerOrg?.slug
        ? `/${ownerOrg.slug}/exhibition/${exhibition.slug}`
        : ''
    : ''
  const exhibitionTitle = exhibition?.title?.trim() || '展示を見る'
  const ownerHref = ownerProfile?.slug ? profilePath(ownerProfile.slug) : ownerOrg?.slug ? `/${ownerOrg.slug}` : ''
  const ownerName = ownerOrg?.name || ownerProfile?.display_name || ''
  const ownerLabel = ownerOrg ? '団体ページ' : 'プロフィール'
  const hasTitle = Boolean(title)
  const hasDescription = Boolean(description)
  const hasCreators = visibleCreators.length > 0
  const hasExhibitionLink = Boolean(exhibitionHref)
  const hasOwnerLink = Boolean(ownerHref)
  const hasDetail = hasTitle || hasDescription || hasCreators || hasExhibitionLink || hasOwnerLink
  const positionLabel = hasMultiple && currentIndex >= 0
    ? `${currentIndex + 1} / ${artworks.length}`
    : null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={hasTitle ? 'artwork-modal-title' : undefined}
      aria-label={hasTitle ? undefined : '作品詳細'}
      className={['ui-artwork-modal', !hasDetail && 'ui-artwork-modal--media-only'].filter(Boolean).join(' ')}
    >
      <div
        className={[
          'ui-artwork-modal-bar',
          !hasMultiple && 'ui-artwork-modal-bar--solo',
        ].filter(Boolean).join(' ')}
      >
        {hasMultiple && (
          <button
            type="button"
            className="ui-artwork-modal-nav ui-artwork-modal-nav--prev"
            onClick={goPrev}
            disabled={!canGoPrev}
            aria-label="前の作品"
          >
            <ModalNavIcon direction="prev" />
          </button>
        )}

        <div className="ui-artwork-modal-bar-center">
          <div className="ui-artwork-modal-eyebrow">作品</div>
          {positionLabel && (
            <div className="ui-artwork-modal-position" aria-live="polite">
              {positionLabel}
            </div>
          )}
        </div>

        {hasMultiple && (
          <button
            type="button"
            className="ui-artwork-modal-nav ui-artwork-modal-nav--next"
            onClick={goNext}
            disabled={!canGoNext}
            aria-label="次の作品"
          >
            <ModalNavIcon direction="next" />
          </button>
        )}

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
        <div ref={viewerRef} className="ui-artwork-modal-viewer">
          <ArtworkMedia
            key={artwork.id}
            src={getModalImageUrl(artwork.image_url)}
            finalSrc={getArtworkHighResolutionUrl(artwork.image_url)}
            placeholderSrc={getGalleryThumbnailUrl(artwork.image_url)}
            alt={artwork.title}
            label={artwork.title}
            loading="eager"
            fit="contain"
            fillHeight
            className="ui-artwork-modal-media"
            wrapperStyle={{ borderRadius: 8 }}
            imageStyle={{ borderRadius: 8 }}
          />
        </div>

        {hasDetail && (
          <aside className="ui-artwork-modal-detail">
            {hasTitle && (
              <h2 id="artwork-modal-title" className="ui-artwork-modal-title">
                {title}
              </h2>
            )}

            {hasCreators && (
              <div className="ui-artwork-modal-creators">
                {visibleCreators.map((creator) => {
                  const creatorSlug = creator.profile?.slug
                  const creatorName = creator.profile.display_name
                  if (!creatorSlug) {
                    return <span key={creator.profile_id || creator.profile.id}>@{creatorName}</span>
                  }
                  const creatorHref = profilePath(creatorSlug)
                  return (
                    <Link key={creator.profile_id || creator.profile.id} to={creatorHref} onClick={() => closeIfCurrentPath(creatorHref)}>
                      @{creatorName}
                    </Link>
                  )
                })}
              </div>
            )}

            {(hasExhibitionLink || hasOwnerLink) && (
              <div className="ui-artwork-modal-link-stack">
                {hasExhibitionLink && (
                  <Link to={exhibitionHref} onClick={() => closeIfCurrentPath(exhibitionHref)} className="ui-artwork-modal-exhibition-link">
                    <span>{exhibitionTitle}</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                )}
                {hasOwnerLink && (
                  <Link to={ownerHref} onClick={() => closeIfCurrentPath(ownerHref)} className="ui-artwork-modal-owner-link">
                    <span>{ownerName || ownerLabel}</span>
                    <span>{ownerLabel}</span>
                  </Link>
                )}
              </div>
            )}

            {hasDescription && (
              <div className={hasTitle ? 'ui-artwork-modal-description-wrap' : undefined}>
                <div className="ui-artwork-modal-description">{description}</div>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  )
}
