import { useEffect, useMemo, useState } from 'react'
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
import GalleryLayoutToggle from '../components/GalleryLayoutToggle'
import { useGalleryLayout } from '../lib/useGalleryLayout'
import { useArtworkViewerHistory } from '../lib/useArtworkViewerHistory'
import { T, externalHost } from '../lib/tokens'
import { attachNormalizedCreators } from '../lib/profile'

export default function ProfilePage() {
  const { profileSlug } = useParams()
  const { session } = useAuth()
  const [profile, setProfile] = useState(null)
  const [organizations, setOrganizations] = useState([])
  const [artworks, setArtworks] = useState([])
  const [galleryLayout, setGalleryLayout] = useGalleryLayout()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!supabase) return setLoading(false)
      try {
        const { data: profileData } = await supabase.from('profiles').select('*').eq('slug', profileSlug).maybeSingle()
        if (!profileData) return setLoading(false)
        setProfile(profileData)
        const [{ data: works }, { data: membershipRows }] = await Promise.all([
          supabase
            .from('artworks')
            .select('id, title, description, image_url, profile_id, artwork_creators(profile_id, display_order, profiles(id, slug, display_name))')
            .eq('profile_id', profileData.id)
            .order('order'),
          supabase
            .from('organization_members')
            .select('role, organizations(id, name, slug)')
            .eq('profile_id', profileData.id),
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
        setOrganizations((membershipRows || []).map((row) => row.organizations).filter((org) => org?.slug))
      } catch {
        /* unavailable */
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

  if (loading) return (
    <div className="ui-page-shell" />
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

  return (
    <div className="ui-page-shell">
      <Header activeTab={navTab} />
      <main className="ui-app-main">
        <section style={{ marginBottom: 48 }}>
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
          {profile.bio && <p className="ui-screen-subtitle" style={{ marginTop: 16 }}>{profile.bio}</p>}
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
              <div className="ui-profile-org-label">所属団体</div>
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

        {artworks.length > 0 ? (
          <>
            <div className="ui-exhibition-artworks-head">
              <div className="ui-section-label">作品</div>
              <div className="ui-exhibition-artworks-actions">
                <GalleryLayoutToggle value={galleryLayout} onChange={setGalleryLayout} />
                {viewableArtworks.length > 0 && (
                  <button
                    type="button"
                    className="ui-immersive-launch"
                    onClick={() => openArtwork(viewableArtworks[0])}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4" />
                    </svg>
                    <span>作品を巡る</span>
                  </button>
                )}
              </div>
            </div>
            <ExhibitionArtworkGallery artworks={artworks} onOpenArtwork={openArtwork} layout={galleryLayout} />
          </>
        ) : (
          <div className="ui-panel" style={{ textAlign: 'center', color: T.inkMuted, fontSize: 13 }}>公開中の作品はまだありません</div>
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
      <BottomNav active={navTab} />
    </div>
  )
}
