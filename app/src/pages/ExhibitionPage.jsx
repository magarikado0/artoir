import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Header from '../components/Header'
import BottomNav from '../components/BottomNav'
import ShareLinkButton from '../components/ShareLinkButton'
import PublicManageLink from '../components/PublicManageLink'
import FavoriteButton from '../components/FavoriteButton'
import ArtworkViewer from '../components/ArtworkViewer'
import ExhibitionArtworkGallery from '../components/ExhibitionArtworkGallery'
import GalleryLayoutToggle from '../components/GalleryLayoutToggle'
import ExhibitionStatusBadge from '../components/ExhibitionStatusBadge'
import ExhibitionListCard from '../components/ExhibitionListCard'
import { useGalleryLayout } from '../lib/useGalleryLayout'
import { useArtworkViewerHistory } from '../lib/useArtworkViewerHistory'
import LoadingFrames from '../components/LoadingFrames'
import ArchiveLoading from '../components/ArchiveLoading'
import { useDelayedLoading } from '../lib/useDelayedLoading'
import { T, fmtDateDot, fmtTime } from '../lib/tokens'
import { attachNormalizedCreators } from '../lib/profile'
import { legacyProfileSlugFromOwnerSlug, profilePath } from '../lib/profileRoutes'
import { getAvailableGalleryViews, normalizeGalleryViewSettings } from '../lib/galleryViewSettings'
import { mapExhibitionListRow } from '../lib/exhibition'
import {
  attachDiscoveryMetadata,
  buildSeriesPath,
  editionDisplay,
  getExhibitionYear,
  loadDiscoveryMetadata,
} from '../lib/discoveryData'
import { uniqueProfilesFromArtworks } from '../lib/archive'

const Exhibition3DGalleryView = lazy(() => import('../components/Exhibition3DGalleryView'))

function useSupportsCuratedLayout() {
  const [supported, setSupported] = useState(() => window.innerWidth >= 640)

  useEffect(() => {
    const media = window.matchMedia('(min-width: 640px)')
    const update = () => setSupported(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return supported
}

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

function SummaryLinks({ label, profiles }) {
  if (!profiles?.length) return null
  return (
    <div className="ui-exhibition-summary-item">
      <div className="ui-exhibition-summary-label">{label}</div>
      <div className="ui-exhibition-summary-value ui-exhibition-creator-links">
        {profiles.map((profile) => <Link key={profile.id} to={profilePath(profile.slug)}>{profile.display_name || profile.slug}</Link>)}
      </div>
    </div>
  )
}

function publicExhibitionPath(exhibition, org, profile) {
  if (profile?.slug) return `${profilePath(profile.slug)}/exhibition/${exhibition.slug}`
  if (org?.slug) return `/${org.slug}/exhibition/${exhibition.slug}`
  return ''
}

function JourneyLink({ item, direction }) {
  if (!item) return <span className="ui-exhibition-journey-spacer" aria-hidden="true" />
  const href = publicExhibitionPath(item.exhibition, item.org, item.profile)
  return (
    <Link to={href} className={`ui-exhibition-journey-link ui-exhibition-journey-link--${direction}`}>
      <span>{direction === 'previous' ? '← 前の開催' : '次の開催 →'}</span>
      <strong>{editionDisplay(item.exhibition) || item.exhibition.title}</strong>
      {editionDisplay(item.exhibition) && <small>{item.exhibition.title}</small>}
    </Link>
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
  const [relatedExhibitions, setRelatedExhibitions] = useState([])
  const [series, setSeries] = useState(null)
  const [artworkLayout, setArtworkLayout] = useState([])
  const [exhibitionGalleryLayout, setExhibitionGalleryLayout] = useState(null)
  const [viewMode, setViewMode] = useState('grid')
  const [, setGalleryLayout] = useGalleryLayout()
  const supportsCuratedLayout = useSupportsCuratedLayout()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const gallery3dButtonRef = useRef(null)
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
          .eq('visibility', 'public')
          .maybeSingle()
        if (!exhData) return setLoading(false)
        const [{ data: awData }, { data: layoutData }, { data: relatedRows }, seriesResult] = await Promise.all([
          supabase
            .from('artworks')
            .select('*, artwork_images:artwork_images!artwork_images_artwork_id_fkey(*), artwork_creators(profile_id, display_order, is_visible, profiles(id, slug, display_name))')
            .eq('exhibition_id', exhData.id)
            .order('order'),
          supabase
            .from('exhibition_artwork_layouts')
            .select('*')
            .eq('exhibition_id', exhData.id)
            .order('z_index'),
          supabase
            .from('exhibitions')
            .select('*, organizations(id, name, slug), profiles(id, display_name, slug), artworks!artworks_exhibition_id_fkey(id, image_url, order, artwork_creators(profile_id, is_visible, profiles(id, slug, display_name)))')
            .eq('visibility', 'public')
            .order('start_date', { ascending: false })
            .limit(100),
          exhData.series_id
            ? supabase.from('exhibition_series').select('*').eq('id', exhData.series_id).maybeSingle()
            : Promise.resolve({ data: null }),
        ])
        const discoveryMetadata = await loadDiscoveryMetadata(supabase, [...(relatedRows || []).map((item) => item.id), exhData.id])
        const enrichedExhibition = attachDiscoveryMetadata(exhData, discoveryMetadata)
        setExhibition(enrichedExhibition)
        setSeries(seriesResult?.data || null)
        setExhibitionGalleryLayout(normalizeGalleryViewSettings(enrichedExhibition).defaultView)
        setRelatedExhibitions((relatedRows || []).map((row) => {
          const { organizations: relatedOrg, profiles: relatedProfile, ...rest } = row
          const relatedExhibition = attachDiscoveryMetadata(mapExhibitionListRow(rest), discoveryMetadata)
          return {
            exhibition: relatedExhibition,
            org: relatedOrg,
            profile: relatedProfile,
            creators: uniqueProfilesFromArtworks(relatedExhibition.artworks),
          }
        }))
        const exhibitionForArtwork = {
          ...enrichedExhibition,
          organizations: profileSlug ? null : ownerData,
          profiles: profileSlug ? ownerData : null,
        }
        setArtworks((awData || []).map((artwork) => attachNormalizedCreators({
          ...artwork,
          artwork_creators: (artwork.artwork_creators || []).filter((creator) => creator.is_visible === true),
          exhibitions: exhibitionForArtwork,
        })))
        const nextLayout = layoutData || []
        setArtworkLayout(nextLayout)
      } catch {
        setLoadError(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [orgSlug, profileSlug, exhibitionSlug])

  const viewableArtworks = useMemo(
    () => artworks.filter((item) => item.image_url),
    [artworks],
  )

  const { selectedArtwork, openArtwork, selectArtwork, closeArtwork } = useArtworkViewerHistory(viewableArtworks)

  function close3DGallery() {
    setViewMode('grid')
    window.requestAnimationFrame(() => gallery3dButtonRef.current?.focus())
  }

  // ?reel=1 のときは作品が揃い次第、自動で3Dビューを開く(リール撮影の自動化用)
  useEffect(() => {
    const reelMode = new URLSearchParams(window.location.search).get('reel') === '1'
    if (reelMode && viewableArtworks.length > 0) setViewMode('3d')
  }, [viewableArtworks.length])

  if (showLoader) return (
    <div className="ui-page-shell" style={{ display: 'grid', placeItems: 'center' }}>
      <LoadingFrames />
    </div>
  )
  if (loading) return <ArchiveLoading rows={2} />
  if (loadError) return (
    <div className="ui-page-shell"><Header activeTab="top" /><main className="ui-app-main"><div className="ui-archive-empty" role="alert"><strong>展覧会を読み込めませんでした</strong><span>接続を確認して、ページを再読み込みしてください。</span></div></main></div>
  )
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
  const hasCuratedLayout = artworkLayout.length > 0
  const availableGalleryViews = getAvailableGalleryViews(exhibition, {
    hasCuratedLayout,
    supportsCuratedLayout,
  })
  const activeGalleryLayout = availableGalleryViews.modes.includes(exhibitionGalleryLayout)
    ? exhibitionGalleryLayout
    : availableGalleryViews.defaultView
  const ownerRows = relatedExhibitions.filter((item) => (
    profileSlug ? item.profile?.id === owner?.id : item.org?.id === owner?.id
  ))
  const seriesRows = exhibition.series_id
    ? ownerRows.filter((item) => item.exhibition.series_id === exhibition.series_id)
    : []
  const navigationRows = (seriesRows.length > 1 ? seriesRows : ownerRows)
    .slice()
    .sort((a, b) => {
      const yearDiff = Number(a.exhibition.edition_year || String(a.exhibition.start_date || '').slice(0, 4) || 0)
        - Number(b.exhibition.edition_year || String(b.exhibition.start_date || '').slice(0, 4) || 0)
      return yearDiff || String(a.exhibition.start_date || '').localeCompare(String(b.exhibition.start_date || ''))
    })
  const navigationIndex = navigationRows.findIndex((item) => item.exhibition.id === exhibition.id)
  const previousExhibition = navigationIndex > 0 ? navigationRows[navigationIndex - 1] : null
  const nextExhibition = navigationIndex >= 0 && navigationIndex < navigationRows.length - 1 ? navigationRows[navigationIndex + 1] : null
  const visibleCreators = (() => {
    const byId = new Map()
    for (const artwork of artworks) {
      for (const creator of artwork.creators || []) {
        if (creator.profile?.id) byId.set(creator.profile.id, creator.profile)
      }
    }
    return [...byId.values()]
  })()
  const creatorIds = new Set(visibleCreators.map((creator) => creator.id))
  const sameArtistRows = relatedExhibitions
    .filter((item) => item.exhibition.id !== exhibition.id && item.creators?.some((creator) => creatorIds.has(creator.id)))
    .slice(0, 3)
  const exhibitionYear = getExhibitionYear(exhibition)
  const sameYearRows = relatedExhibitions
    .filter((item) => item.exhibition.id !== exhibition.id && getExhibitionYear(item.exhibition) === exhibitionYear && !sameArtistRows.some((row) => row.exhibition.id === item.exhibition.id))
    .slice(0, 3)
  const seriesHref = series ? buildSeriesPath({
    series,
    org: profileSlug ? null : owner,
    profile: profileSlug ? owner : null,
  }) : ''

  return (
    <div className="ui-page-shell">
      <Header activeTab="top" />
      <main className="ui-app-main">
        <section>
          <div className="ui-exhibition-summary-card">
            {series && seriesHref && (
              <Link to={seriesHref} className="ui-exhibition-series-crumb">
                <strong>{series.name}</strong>
              </Link>
            )}
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
            {(exhibition.discovery?.disciplines?.length > 0 || exhibition.discovery?.tags?.length > 0) && (
              <div className="ui-exhibition-taxonomy" aria-label="分野と表現の特徴">
                {(exhibition.discovery?.disciplines || []).map((discipline) => (
                  <Link key={discipline.slug} to={`/exhibitions?discipline=${encodeURIComponent(discipline.slug)}`} className={discipline.is_primary ? 'is-primary' : ''}>
                    {discipline.name}
                  </Link>
                ))}
                {(exhibition.discovery?.tags || []).slice(0, 6).map((tag) => <span key={tag.slug}>{tag.name}</span>)}
              </div>
            )}
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
              <SummaryLinks label="参加作家" profiles={visibleCreators} />
            </div>
          </div>
        </section>

        <nav className="ui-exhibition-archive-path" aria-label="アーカイブ内を辿る">
          <Link to={ownerBase}><span>{hostLabel}</span><strong>{owner?.display_name || owner?.name}</strong></Link>
          {visibleCreators.slice(0, 3).map((creator) => <Link key={creator.id} to={profilePath(creator.slug)}><span>作家</span><strong>{creator.display_name || creator.slug}</strong></Link>)}
          {exhibitionYear && <Link to={`/exhibitions?year=${exhibitionYear}`}><span>開催年</span><strong>{exhibitionYear}年の記録</strong></Link>}
        </nav>

        {exhibition.description && (
          <section className="ui-exhibition-about">
            <div className="ui-section-label">展覧会について</div>
            <p>{exhibition.description}</p>
          </section>
        )}

        <section style={{ marginTop: 64 }}>
          <div className="ui-exhibition-artworks-head">
            <div className="ui-section-label">作品</div>
            {artworks.length > 0 && (
              <div className="ui-exhibition-artworks-actions">
                <GalleryLayoutToggle
                  value={activeGalleryLayout}
                  modes={availableGalleryViews.modes}
                  onChange={(next) => {
                    setExhibitionGalleryLayout(next)
                    if (next !== 'curated') setGalleryLayout(next)
                  }}
                />
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
              </div>
            )}
          </div>
          {artworks.length > 0 ? (
            <ExhibitionArtworkGallery
              artworks={artworks}
              onOpenArtwork={openArtwork}
              layout={activeGalleryLayout}
              savedLayout={artworkLayout}
            />
          ) : (
            <div className="ui-panel" style={{ textAlign: 'center', color: T.inkMuted, fontSize: 13 }}>
              作品がまだありません
            </div>
          )}
        </section>
        {(previousExhibition || nextExhibition || sameArtistRows.length > 0 || sameYearRows.length > 0) && (
          <section className="ui-exhibition-journey">
            <div className="ui-exhibition-journey-heading">
              <h2>次に辿る</h2>
            </div>

            {(previousExhibition || nextExhibition) && (
              <div className="ui-exhibition-journey-timeline">
                <JourneyLink item={previousExhibition} direction="previous" />
                <div className="ui-exhibition-journey-current">
                  <span>{series ? series.name : profileSlug ? 'この作家の展覧会' : 'この団体の展覧会'}</span>
                  {series && seriesHref ? <Link to={seriesHref}>{seriesRows.length}回の記録を見る</Link> : <Link to={ownerBase}>年表を見る</Link>}
                </div>
                <JourneyLink item={nextExhibition} direction="next" />
              </div>
            )}

            {(sameArtistRows.length > 0 || sameYearRows.length > 0) && (
              <div className="ui-exhibition-journey-columns">
                {sameArtistRows.length > 0 && (
                  <div>
                    <h3>同じ作家の展覧会</h3>
                    <div className="ui-exhibition-list-grid">
                      {sameArtistRows.map((row) => (
                        <ExhibitionListCard
                          key={row.exhibition.id}
                          {...row}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {sameYearRows.length > 0 && (
                  <div>
                    <h3>{exhibitionYear}年の展覧会</h3>
                    <div className="ui-exhibition-list-grid">
                      {sameYearRows.map((row) => (
                        <ExhibitionListCard
                          key={row.exhibition.id}
                          {...row}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
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
      {selectedArtwork && (
        <ArtworkViewer
          artworks={viewableArtworks}
          initialArtwork={selectedArtwork}
          onArtworkChange={selectArtwork}
          onClose={closeArtwork}
        />
      )}
      <BottomNav active="top" />
    </div>
  )
}
