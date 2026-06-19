import { useEffect, useMemo, useState } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Header, { Icon } from '../components/Header'
import BottomNav from '../components/BottomNav'
import ArtworkModal from '../components/ArtworkModal'
import ExhibitionArtworkGallery from '../components/ExhibitionArtworkGallery'
import ExhibitionRibbonView from '../components/ExhibitionRibbonView'
import LoadingFrames from '../components/LoadingFrames'
import { useDelayedLoading } from '../lib/useDelayedLoading'
import { T, fmtDateDot, fmtTime } from '../lib/tokens'
import { attachNormalizedCreators } from '../lib/profile'
import { legacyProfileSlugFromOwnerSlug, profilePath } from '../lib/profileRoutes'

function SummaryItem({ label, value }) {
  if (!value) return null
  return (
    <div className="ui-exhibition-summary-item">
      <div className="ui-exhibition-summary-label">{label}</div>
      <div className="ui-exhibition-summary-value">{value}</div>
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
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const isExhibitionListNavigation = Boolean(location.state?.showExhibitionPageLoading)
  const showLoader = useDelayedLoading(isExhibitionListNavigation && loading)

  useEffect(() => {
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
          .select('*, artwork_creators(profile_id, display_order, is_visible, profiles(id, slug, display_name))')
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

  async function copyLink() {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      const el = document.createElement('textarea')
      el.value = url
      el.style.cssText = 'position:fixed;opacity:0;top:0;left:0'
      document.body.appendChild(el)
      el.focus()
      el.select()
      try {
        document.execCommand('copy')
        setCopied(true)
        setTimeout(() => setCopied(false), 1800)
      } finally {
        document.body.removeChild(el)
      }
    }
  }

  const viewableArtworks = useMemo(
    () => artworks.filter((item) => item.image_url),
    [artworks],
  )

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
  const ownerPageLabel = profileSlug ? 'プロフィール' : '団体ページ'
  const hostLabel = profileSlug ? '作家' : '主催団体'
  const dateText = exhibition.start_date
    ? `${fmtDateDot(exhibition.start_date)}${exhibition.start_time ? ` ${fmtTime(exhibition.start_time)}` : ''} - ${fmtDateDot(exhibition.end_date)}${exhibition.end_time ? ` ${fmtTime(exhibition.end_time)}` : ''}`
    : ''

  return (
    <div className="ui-page-shell">
      <Header activeTab="top" />
      <main className="ui-app-main">
        <div className="ui-app-topline">
          <Link to={ownerBase} className="ui-back-link">← {ownerPageLabel}</Link>
          <button
            onClick={copyLink}
            type="button"
            className={`ui-pill-action ${copied ? 'ui-pill-action--accent' : ''}`}
          >
            <Icon name={copied ? 'check' : 'share'} size={16} />
            <span>{copied ? 'コピー済み' : 'リンクを共有'}</span>
          </button>
        </div>

        <section>
          <div className="ui-exhibition-summary-card">
            <h1 className="ui-screen-title">{exhibition.title}</h1>
            {exhibition.description && <p className="ui-screen-subtitle">{exhibition.description}</p>}
            <div className="ui-exhibition-summary-grid">
              <SummaryItem label="会期" value={dateText} />
              <SummaryItem label="会場" value={exhibition.location} />
              <SummaryItem label={hostLabel} value={owner?.display_name || owner?.name || ''} />
            </div>
          </div>
        </section>

        <section style={{ marginTop: 64 }}>
          <div className="ui-exhibition-artworks-head">
            <div className="ui-section-label">作品</div>
            {artworks.length > 0 && (
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
            )}
          </div>
          {artworks.length > 0 ? (
            <ExhibitionArtworkGallery artworks={artworks} onOpenArtwork={openArtwork} />
          ) : (
            <div className="ui-panel" style={{ textAlign: 'center', color: T.inkMuted, fontSize: 13 }}>
              作品がまだありません
            </div>
          )}
        </section>
        {viewMode === 'ribbon' && artworks.length > 0 && (
          <ExhibitionRibbonView artworks={artworks} onClose={() => setViewMode('grid')} />
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

