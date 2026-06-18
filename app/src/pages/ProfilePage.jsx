import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import Header from '../components/Header'
import BottomNav from '../components/BottomNav'
import ArtworkMedia from '../components/ArtworkMedia'
import ArtworkModal from '../components/ArtworkModal'
import { T, externalHost, fmtDateRangeShort } from '../lib/tokens'
import { getGalleryThumbnailUrl } from '../lib/imageUrl'
import { attachNormalizedCreators } from '../lib/profile'

function ProfileArtworkCard({ artwork, onOpen }) {
  const exhibition = artwork?.exhibitions
  const org = exhibition?.organizations
  const profile = exhibition?.profiles
  const ownerSlug = org?.slug || (profile?.slug ? `@${profile.slug}` : null)
  const ownerName = org?.name || profile?.display_name
  const hasTitle = Boolean(artwork.title?.trim())
  if (!artwork?.image_url || !exhibition || !ownerSlug) return null

  return (
    <button type="button" onClick={() => onOpen(artwork)} className="ui-list-card ui-profile-artwork-card ui-profile-artwork-button">
      <ArtworkMedia
        src={getGalleryThumbnailUrl(artwork.image_url)}
        alt=""
        decorative
        loading="lazy"
        fillHeight
        aspectRatio="1 / 1"
        fit="contain"
        wrapperStyle={{ borderRadius: 7, background: 'rgba(228, 211, 184, 0.12)' }}
        imageStyle={{ borderRadius: 7 }}
      />
      <div className="ui-profile-artwork-card-body">
        {hasTitle && <div className="ui-profile-artwork-title">{artwork.title}</div>}
        {org ? (
          <>
            <div className="ui-profile-artwork-meta">{exhibition.title}</div>
            <div className="ui-profile-artwork-meta">{ownerName} / {fmtDateRangeShort(exhibition.start_date, exhibition.end_date)}</div>
          </>
        ) : exhibition.title !== '作品' ? (
          <div className="ui-profile-artwork-meta">{exhibition.title}</div>
        ) : null}
      </div>
    </button>
  )
}

export default function ProfilePage() {
  const { profileSlug } = useParams()
  const { session } = useAuth()
  const [profile, setProfile] = useState(null)
  const [artworks, setArtworks] = useState([])
  const [selectedArtwork, setSelectedArtwork] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!supabase) return setLoading(false)
      try {
        const { data: profileData } = await supabase.from('profiles').select('*').eq('slug', profileSlug).maybeSingle()
        if (!profileData) return setLoading(false)
        setProfile(profileData)
        const { data: rows } = await supabase
          .from('artwork_creators')
          .select('display_order, artworks(id, title, description, image_url, artwork_creators(profile_id, display_order, is_visible, profiles(id, slug, display_name)), exhibitions(id, title, slug, start_date, end_date, organization_id, profile_id, organizations(id, name, slug), profiles(id, display_name, slug)))')
          .eq('profile_id', profileData.id)
          .eq('is_visible', true)
        setArtworks((rows || []).map((row) => attachNormalizedCreators(row.artworks)).filter((artwork) => artwork?.image_url))
      } catch {
        /* unavailable */
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [profileSlug])

  if (loading) return (
    <div className="ui-page-shell" style={{ display: 'grid', placeItems: 'center' }}>
      <span style={{ fontFamily: T.mono, color: T.inkMuted, letterSpacing: '0.2em', fontSize: 11 }}>...</span>
    </div>
  )

  if (!profile) return (
    <div className="ui-page-shell" style={{ display: 'grid', placeItems: 'center' }}>
      <p style={{ color: T.inkMuted, fontSize: 13 }}>プロフィールが見つかりません</p>
    </div>
  )

  const sns = profile.sns_links || {}
  const isOwnProfile = session?.user?.id === profile.id
  const links = [
    sns.instagram && ['Instagram', sns.instagram],
    sns.x && ['X', sns.x],
    profile.homepage_url && ['Web', profile.homepage_url],
  ].filter(Boolean)

  return (
    <div className="ui-page-shell">
      <Header activeTab="account" />
      <main className="ui-app-main">
        <Link to="/" style={{ display: 'inline-flex', marginBottom: 14, color: T.inkMuted, textDecoration: 'none', fontFamily: T.mono, fontSize: 11 }}>← 展覧会</Link>
        <section className="ui-app-card" style={{ padding: 18, marginBottom: 14 }}>
          <div className="ui-kicker">プロフィール</div>
          <h1 className="ui-screen-title" style={{ marginTop: 7 }}>{profile.display_name}</h1>
          <div style={{ marginTop: 4, fontFamily: T.mono, fontSize: 11, color: T.inkMuted }}>@{profile.slug}</div>
          {profile.bio && <p className="ui-screen-subtitle" style={{ maxWidth: 720, marginTop: 12 }}>{profile.bio}</p>}
          {links.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
              {links.map(([label, href]) => (
                <a key={label} href={href} target="_blank" rel="noreferrer" className="ui-pill-action" style={{ background: T.card, color: T.ink, border: `1px solid ${T.lineSoft}` }}>
                  <span>{label}</span>
                  <span style={{ color: T.accent, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{externalHost(href)}</span>
                </a>
              ))}
            </div>
          )}
          {isOwnProfile && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
              <Link to={`/@${profile.slug}/dashboard`} className="ui-pill-action" style={{ background: T.ink }}>
                <span>作品を追加・編集 →</span>
              </Link>
            </div>
          )}
        </section>

        {artworks.length > 0 ? (
          <div className="ui-profile-artwork-grid">
            {artworks.map((artwork) => (
              <ProfileArtworkCard key={artwork.id} artwork={artwork} onOpen={setSelectedArtwork} />
            ))}
          </div>
        ) : (
          <div className="ui-panel" style={{ padding: 28, textAlign: 'center', fontFamily: T.mono, fontSize: 11, color: T.inkMuted }}>公開中の作品はまだありません</div>
        )}
      </main>
      <ArtworkModal
        artwork={selectedArtwork}
        artworks={artworks}
        onSelectArtwork={setSelectedArtwork}
        onClose={() => setSelectedArtwork(null)}
      />
      <BottomNav active="account" />
    </div>
  )
}
