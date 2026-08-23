import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import Header from '../components/Header'
import BottomNav from '../components/BottomNav'
import ShareLinkButton from '../components/ShareLinkButton'
import PublicManageLink from '../components/PublicManageLink'
import FavoriteButton from '../components/FavoriteButton'
import ArtworkViewer from '../components/ArtworkViewer'
import ExhibitionArtworkGallery from '../components/ExhibitionArtworkGallery'
import ArchiveExhibitionRow from '../components/ArchiveExhibitionRow'
import ArchiveLoading from '../components/ArchiveLoading'
import GalleryLayoutToggle from '../components/GalleryLayoutToggle'
import { useGalleryLayout } from '../lib/useGalleryLayout'
import { useArtworkViewerHistory } from '../lib/useArtworkViewerHistory'
import { T, externalHost } from '../lib/tokens'
import { attachNormalizedCreators } from '../lib/profile'
import { mapExhibitionListRow } from '../lib/exhibition'
import { groupExhibitionsByYear } from '../lib/discoveryData'

const Exhibition3DGalleryView = lazy(() => import('../components/Exhibition3DGalleryView'))

export default function ProfilePage() {
  const { profileSlug } = useParams()
  const { session } = useAuth()
  const [profile, setProfile] = useState(null)
  const [organizations, setOrganizations] = useState([])
  const [exhibitions, setExhibitions] = useState([])
  const [participatingExhibitions, setParticipatingExhibitions] = useState([])
  const [archiveWorkCount, setArchiveWorkCount] = useState(0)
  const [artworks, setArtworks] = useState([])
  const [galleryLayout, setGalleryLayout] = useGalleryLayout()
  const [viewMode, setViewMode] = useState('grid')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const gallery3dButtonRef = useRef(null)

  useEffect(() => {
    async function load() {
      if (!supabase) return setLoading(false)
      try {
        const { data: profileData } = await supabase.from('profiles').select('*').eq('slug', profileSlug).maybeSingle()
        if (!profileData) return setLoading(false)
        setProfile(profileData)
        const [{ data: works }, { data: exhibitionRows }, { data: membershipRows }, { data: creatorLinks }] = await Promise.all([
          supabase
            .from('artworks')
            .select('id, title, description, image_url, image_width, image_height, cover_image_id, gallery_image_id, profile_id, artwork_images:artwork_images!artwork_images_artwork_id_fkey(*), artwork_creators(profile_id, display_order, profiles(id, slug, display_name))')
            .eq('profile_id', profileData.id)
            .order('order'),
          supabase
            .from('exhibitions')
            .select('*, artworks!artworks_exhibition_id_fkey(image_url, order)')
            .eq('profile_id', profileData.id)
            .eq('visibility', 'public')
            .order('start_date', { ascending: false }),
          supabase
            .from('organization_members')
            .select('role, organizations(id, name, slug)')
            .eq('profile_id', profileData.id),
          supabase
            .from('artwork_creators')
            .select('artwork_id, artworks!inner(exhibition_id)')
            .eq('profile_id', profileData.id)
            .eq('is_visible', true),
        ])
        setArtworks((works || []).map((artwork) => attachNormalizedCreators({
          ...artwork,
          exhibitions: {
            id: null,
            title: '',
            slug: '',
            profile_id: profileData.id,
            organizations: null,
            profiles: profileData,
          },
        })).filter((artwork) => artwork?.image_url))
        setExhibitions((exhibitionRows || []).map(mapExhibitionListRow))
        const participatingIds = [...new Set((creatorLinks || []).map((row) => row.artworks?.exhibition_id).filter(Boolean))]
        let participatingRows = []
        if (participatingIds.length > 0) {
          const { data } = await supabase
            .from('exhibitions')
            .select('*, organizations(id, name, slug), profiles(id, display_name, slug), artworks!artworks_exhibition_id_fkey(image_url, order)')
            .in('id', participatingIds)
            .eq('visibility', 'public')
            .order('start_date', { ascending: false })
          participatingRows = (data || []).map((row) => {
            const { organizations: org, profiles: ownerProfile, ...exhibition } = row
            return { exhibition: mapExhibitionListRow(exhibition), org, profile: ownerProfile }
          })
        }
        setParticipatingExhibitions(participatingRows)
        const publicParticipatingIds = new Set(participatingRows.map((row) => row.exhibition.id))
        setArchiveWorkCount(new Set([
          ...(works || []).map((artwork) => artwork.id),
          ...(creatorLinks || []).filter((row) => publicParticipatingIds.has(row.artworks?.exhibition_id)).map((row) => row.artwork_id),
        ]).size)
        const relatedOrganizations = participatingRows.map((row) => row.org).filter((relatedOrg) => relatedOrg?.slug)
        const organizationMap = new Map([
          ...(membershipRows || []).map((row) => row.organizations),
          ...relatedOrganizations,
        ].filter((relatedOrg) => relatedOrg?.id).map((relatedOrg) => [relatedOrg.id, relatedOrg]))
        setOrganizations([...organizationMap.values()])
      } catch {
        setLoadError(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [profileSlug])

  const viewableArtworks = useMemo(
    () => artworks.filter((item) => item.image_url),
    [artworks],
  )

  const { selectedArtwork, openArtwork, selectArtwork, closeArtwork } = useArtworkViewerHistory(viewableArtworks)

  function close3DGallery() {
    setViewMode('grid')
    window.requestAnimationFrame(() => gallery3dButtonRef.current?.focus())
  }

  if (loading) return <ArchiveLoading />

  if (loadError) return (
    <div className="ui-page-shell"><Header activeTab="creators" /><main className="ui-app-main"><div className="ui-archive-empty" role="alert"><strong>作家の記録を読み込めませんでした</strong><span>接続を確認して、ページを再読み込みしてください。</span></div></main></div>
  )

  if (!profile) return (
    <div className="ui-page-shell" style={{ display: 'grid', placeItems: 'center' }}>
      <p style={{ color: T.inkMuted, fontSize: 14 }}>プロフィールが見つかりません</p>
    </div>
  )

  const sns = profile.sns_links || {}
  // 自分のプロフィール = ログイン中ユーザー自身。ナビ表示や自己ブックマーク抑止に使う。
  const isOwnProfile = Boolean(session?.user?.id && session.user.id === profile.id)
  const navTab = isOwnProfile ? 'account' : 'creators'
  const exhibitionRows = new Map()
  for (const exhibition of exhibitions) {
    exhibitionRows.set(exhibition.id, { exhibition, profile, org: null })
  }
  for (const row of participatingExhibitions) {
    if (!exhibitionRows.has(row.exhibition.id)) exhibitionRows.set(row.exhibition.id, row)
  }
  const archiveRows = [...exhibitionRows.values()]
  const rowById = new Map(archiveRows.map((row) => [row.exhibition.id, row]))
  const exhibitionYearGroups = groupExhibitionsByYear(archiveRows.map((row) => row.exhibition))

  return (
    <div className="ui-page-shell">
      <Header activeTab={navTab} />
      <main className="ui-app-main">
        <section className="ui-archive-profile-hero">
          <span className="ui-archive-eyebrow">Artist archive</span>
          <div className="ui-profile-name-row">
            <h1 className="ui-screen-title" style={{ marginTop: 8 }}>{profile.display_name}</h1>
            {/* 自分のプロフィールは自分をブックマークできないよう非表示。 */}
            {!isOwnProfile && (
              <FavoriteButton
                targetType="profile"
                targetId={profile.id}
                kind="bookmark"
                appearance="icon"
                className="ui-profile-name-fav"
              />
            )}
          </div>
          <div style={{ marginTop: 6, fontSize: 13, color: T.inkMuted }}>@{profile.slug}</div>
          <div className="ui-archive-profile-stats">
            <span>{archiveRows.length}件の展覧会</span>
            <span>{archiveWorkCount}作品</span>
          </div>
          {profile.bio && <p className="ui-archive-profile-description">{profile.bio}</p>}
          <div className="ui-public-action-row">
            <ShareLinkButton />
            <PublicManageLink
              ownerType="profile"
              ownerId={profile.id}
              to="/account"
              label="管理"
            />
          </div>
          {(sns.instagram || sns.x || profile.homepage_url) && (
            <div className="ui-public-link-row">
              {sns.instagram && (
                <a href={sns.instagram} target="_blank" rel="noreferrer" className="ui-public-icon-link" aria-label="Instagram">
                  <span className="ui-public-icon-link__instagram" aria-hidden="true" />
                </a>
              )}
              {sns.x && (
                <a href={sns.x} target="_blank" rel="noreferrer" className="ui-public-icon-link" aria-label="X">
                  <span aria-hidden="true">X</span>
                </a>
              )}
              {profile.homepage_url && (
                <a href={profile.homepage_url} target="_blank" rel="noreferrer" className="ui-public-text-link">
                  <span>Web</span>
                  <span>{externalHost(profile.homepage_url)}</span>
                </a>
              )}
            </div>
          )}
          {organizations.length > 0 && (
            <div className="ui-profile-org-block">
              <div className="ui-profile-org-label">関わった団体</div>
              <div className="ui-profile-org-list">
                {organizations.map((org) => (
                  <Link key={org.id || org.slug} to={`/${org.slug}`} className="ui-profile-org-link">
                    {org.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>

        {exhibitionYearGroups.length > 0 && (
          <section className="ui-profile-archive-section">
            <div className="ui-org-archive-heading"><h2>展覧会の記録</h2></div>
            <div className="ui-archive-timeline">
              {exhibitionYearGroups.map(([year, yearExhibitions]) => (
                <section key={year} className="ui-archive-year-group">
                  <header><h2>{year}</h2><span>{yearExhibitions.length}件</span></header>
                  <div className="ui-archive-year-records">
                    {yearExhibitions.map((exhibition) => {
                      const row = rowById.get(exhibition.id)
                      return <ArchiveExhibitionRow key={exhibition.id} {...row} creators={[]} />
                    })}
                  </div>
                </section>
              ))}
            </div>
          </section>
        )}

        {artworks.length > 0 ? (
          <>
            <div className="ui-exhibition-artworks-head">
              <div className="ui-section-label">作品</div>
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
              </div>
            </div>
            <ExhibitionArtworkGallery artworks={artworks} onOpenArtwork={openArtwork} layout={galleryLayout} />
          </>
        ) : (
          <div className="ui-panel" style={{ textAlign: 'center', color: T.inkMuted, fontSize: 13 }}>公開中の作品はまだありません</div>
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
          showCreators={false}
        />
      )}
      <BottomNav active={navTab} />
    </div>
  )
}
