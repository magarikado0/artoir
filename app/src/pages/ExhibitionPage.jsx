import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useParams, Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Header from '../components/Header'
import BottomNav from '../components/BottomNav'
import ShareLinkButton from '../components/ShareLinkButton'
import PublicManageLink from '../components/PublicManageLink'
import FavoriteButton from '../components/FavoriteButton'
import ArtworkModal from '../components/ArtworkModal'
import ExhibitionArtworkGallery from '../components/ExhibitionArtworkGallery'
import ExhibitionRibbonView from '../components/ExhibitionRibbonView'
import GalleryLayoutToggle from '../components/GalleryLayoutToggle'
import ExhibitionStatusBadge from '../components/ExhibitionStatusBadge'
import { useGalleryLayout } from '../lib/useGalleryLayout'
import LoadingFrames from '../components/LoadingFrames'
import { useDelayedLoading } from '../lib/useDelayedLoading'
import { T, fmtDateDot, fmtTime } from '../lib/tokens'
import { attachNormalizedCreators } from '../lib/profile'
import { legacyProfileSlugFromOwnerSlug, profilePath } from '../lib/profileRoutes'

const Exhibition3DGalleryView = lazy(() => import('../components/Exhibition3DGalleryView'))

function SummaryItem({ label, value, to }) {
  if (!value) return null
  return (
    <div className="ui-exhibition-summary-item">
      <div className="ui-exhibition-summary-label">{label}</div>
      <div className="ui-exhibition-summary-value">
        {to ? <Link to={to} className="ui-exhibition-summary-link">{value}</Link> : value}
      </div>
    </div>
  )
}

export default function ExhibitionPage() {
  const { orgSlug: routeOrgSlug, profileSlug: routeProfileSlug, exhibitionSlug } = useParams()
  const location = useLocation()
  const profileSlug = routeProfileSlug || legacyProfileSlugFromOwnerSlug(routeOrgSlug)
  const orgSlug = profileSlug ? undefined : routeOrgSlug
  const [owner, setOwner] = useState(null)
  const [exhibition, setExhibition] = useState(null)
  const [artworks, setArtworks] = useState([])
  const [selectedArtwork, setSelectedArtwork] = useState(null)
  const [viewMode, setViewMode] = useState('grid')
  const [galleryLayout, setGalleryLayout] = useGalleryLayout()
  const [loading, setLoading] = useState(true)
  const gallery3dButtonRef = useRef(null)
  const isExhibitionListNavigation = Boolean(location.state?.showExhibitionPageLoading)
  const showLoader = useDelayedLoading(isExhibitionListNavigation && loading)

  useEffect(() => {
    if (profileSlug) {
      setLoading(false)
      return undefined
    }

    async function load() {
      if (!supabase) return setLoading(false)
      try {
        const ownerQuery = profileSlug
          ? supabase.from('profiles').select('*').eq('slug', profileSlug).maybeSingle()
          : supabase.from('organizations').select('*').eq('slug', orgSlug).maybeSingle()
        const { data: ownerData } = await ownerQuery
        if (!ownerData) return setLoading(false)
        setOwner(ownerData)
        const { data: exhData } = await supabase
          .from('exhibitions')
          .select('*')
          .eq('slug', exhibitionSlug)
          .eq(profileSlug ? 'profile_id' : 'organization_id', ownerData.id)
          .maybeSingle()
        if (!exhData) return setLoading(false)
        setExhibition(exhData)
        const { data: awData } = await supabase
          .from('artworks')
          .select('*, artwork_creators(profile_id, display_order, profiles(id, slug, display_name))')
          .eq('exhibition_id', exhData.id)
          .order('order')
        const exhibitionForArtwork = {
          ...exhData,
          organizations: profileSlug ? null : ownerData,
          profiles: profileSlug ? ownerData : null,
        }
        setArtworks((awData || []).map((artwork) => attachNormalizedCreators({
          ...artwork,
          exhibitions: exhibitionForArtwork,
        })))
      } catch {
        /* unavailable */
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [orgSlug, profileSlug, exhibitionSlug])

  useEffect(() => {
    const handlePopState = (event) => {
      const artworkId = event.state?.artworkModalArtworkId
      if (!artworkId) {
        setSelectedArtwork(null)
        return
      }
      const nextArtwork = artworks.find((artwork) => String(artwork.id) === String(artworkId)) || null
      setSelectedArtwork(nextArtwork)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [artworks])

  const viewableArtworks = useMemo(
    () => artworks.filter((item) => item.image_url),
    [artworks],
  )

  if (profileSlug) return <Navigate to={profilePath(profileSlug)} replace />

  function openArtwork(artwork) {
    window.history.pushState({ artworkModalArtworkId: artwork.id }, '', window.location.href)
    setSelectedArtwork(artwork)
  }

  function selectArtworkInModal(artwork) {
    if (window.history.state?.artworkModalArtworkId) {
      window.history.replaceState({ artworkModalArtworkId: artwork.id }, '', window.location.href)
    } else {
      window.history.pushState({ artworkModalArtworkId: artwork.id }, '', window.location.href)
    }
    setSelectedArtwork(artwork)
  }

  function closeArtwork() {
    if (window.history.state?.artworkModalArtworkId) {
      window.history.back()
      return
    }
    setSelectedArtwork(null)
  }

  function close3DGallery() {
    setViewMode('grid')
    window.requestAnimationFrame(() => gallery3dButtonRef.current?.focus())
  }

  if (showLoader) return (
    <div className="ui-page-shell" style={{ display: 'grid', placeItems: 'center' }}>
      <LoadingFrames />
    </div>
  )
  if (loading) return <div className="ui-page-shell" />
  if (!exhibition) return (
    <div className="ui-page-shell" style={{ display: 'grid', placeItems: 'center' }}>
      <p style={{ color: T.inkMuted, fontSize: 13 }}>展覧会が見つかりません</p>
    </div>
  )

  const ownerBase = profileSlug ? profilePath(profileSlug) : `/${orgSlug}`
  const dashboardBase = ownerBase
  const exhibitionManagePath = exhibition?.id
    ? `${dashboardBase}/dashboard/exhibitions/${exhibition.id}/artworks`
    : `${dashboardBase}/dashboard`
  const hostLabel = profileSlug ? '作家' : '主催団体'
  const dateText = exhibition.start_date
    ? `${fmtDateDot(exhibition.start_date)}${exhibition.start_time ? ` ${fmtTime(exhibition.start_time)}` : ''} - ${fmtDateDot(exhibition.end_date)}${exhibition.end_time ? ` ${fmtTime(exhibition.end_time)}` : ''}`
    : ''

  return (
    <div className="ui-page-shell">
      <Header activeTab="top" />
      <main className="ui-app-main">
        <section>
          <div className="ui-exhibition-summary-card">
            <ExhibitionStatusBadge exhibition={exhibition} className="ui-exhibition-status-eyebrow" />
            <div className="ui-exhibition-title-row">
              <h1 className="ui-screen-title">{exhibition.title}</h1>
              <FavoriteButton
                targetType="exhibition"
                targetId={exhibition.id}
                kind="bookmark"
                appearance="icon"
                className="ui-exhibition-title-fav"
              />
            </div>
            {exhibition.description && <p className="ui-screen-subtitle">{exhibition.description}</p>}
            <div className="ui-public-action-row">
              <ShareLinkButton />
              <PublicManageLink
                ownerType={profileSlug ? 'profile' : 'organization'}
                ownerId={owner?.id}
                to={exhibitionManagePath}
                label="展覧会を管理"
              />
            </div>
            <div className="ui-exhibition-summary-grid">
              <SummaryItem label="会期" value={dateText} />
              <SummaryItem label="会場" value={exhibition.location} />
              <SummaryItem label={hostLabel} value={owner?.display_name || owner?.name || ''} to={ownerBase} />
            </div>
          </div>
        </section>

        <section style={{ marginTop: 64 }}>
          <div className="ui-exhibition-artworks-head">
            {!profileSlug && <div className="ui-section-label">作品</div>}
            {artworks.length > 0 && (
              <div className="ui-exhibition-artworks-actions">
                <GalleryLayoutToggle value={galleryLayout} onChange={setGalleryLayout} />
                {viewableArtworks.length > 0 && (
                  <button
                    ref={gallery3dButtonRef}
                    type="button"
                    className="ui-immersive-launch"
                    onClick={() => setViewMode('3d')}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 11.5 12 4l9 7.5" />
                      <path d="M5.5 10v9h13v-9" />
                      <path d="M9 19v-5.5h6V19" />
                    </svg>
                    <span>3D空間で巡る</span>
                  </button>
                )}
                <button
                  type="button"
                  className="ui-immersive-launch"
                  onClick={() => setViewMode('ribbon')}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4" />
                  </svg>
                  <span>作品を巡る</span>
                </button>
              </div>
            )}
          </div>
          {artworks.length > 0 ? (
            <ExhibitionArtworkGallery artworks={artworks} onOpenArtwork={openArtwork} layout={galleryLayout} />
          ) : (
            <div className="ui-panel" style={{ textAlign: 'center', color: T.inkMuted, fontSize: 13 }}>
              作品がまだありません
            </div>
          )}
        </section>
        {viewMode === 'ribbon' && artworks.length > 0 && (
          <ExhibitionRibbonView artworks={artworks} onClose={() => setViewMode('grid')} />
        )}
        {viewMode === '3d' && viewableArtworks.length > 0 && (
          <Suspense fallback={null}>
            <Exhibition3DGalleryView
              artworks={viewableArtworks}
              onClose={close3DGallery}
              onOpenArtwork={openArtwork}
              hasOpenArtwork={Boolean(selectedArtwork)}
            />
          </Suspense>
        )}
      </main>
      <ArtworkModal
        artwork={selectedArtwork}
        artworks={viewableArtworks}
        onSelectArtwork={selectArtworkInModal}
        onClose={closeArtwork}
      />
      <BottomNav active="top" />
    </div>
  )
}
