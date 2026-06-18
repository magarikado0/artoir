import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Header from '../components/Header'
import BottomNav from '../components/BottomNav'
import ArtworkMedia from '../components/ArtworkMedia'
import { T, externalHost, fmtDateRangeShort } from '../lib/tokens'
import { getGalleryThumbnailUrl } from '../lib/imageUrl'

function ProfileArtworkCard({ creatorRow }) {
  const artwork = creatorRow.artworks
  const exhibition = artwork?.exhibitions
  const org = exhibition?.organizations
  if (!artwork?.image_url || !exhibition || !org) return null

  return (
    <Link to={`/${org.slug}/exhibition/${exhibition.slug}`} className="ui-list-card ui-profile-artwork-card">
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
        <div className="ui-profile-artwork-title">{artwork.title || '（タイトルなし）'}</div>
        <div className="ui-profile-artwork-meta">{exhibition.title}</div>
        <div className="ui-profile-artwork-meta">{org.name} / {fmtDateRangeShort(exhibition.start_date, exhibition.end_date)}</div>
      </div>
    </Link>
  )
}

export default function ProfilePage() {
  const { profileSlug } = useParams()
  const [profile, setProfile] = useState(null)
  const [creatorRows, setCreatorRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!supabase) return setLoading(false)
      try {
        const { data: profileData } = await supabase.from('profiles').select('*').eq('slug', profileSlug).single()
        if (!profileData) return setLoading(false)
        setProfile(profileData)
        const { data: rows } = await supabase
          .from('artwork_creators')
          .select('display_order, artworks(id, title, image_url, exhibitions(id, title, slug, start_date, end_date, organizations(id, name, slug)))')
          .eq('profile_id', profileData.id)
          .eq('is_visible', true)
        setCreatorRows(rows || [])
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
        </section>

        <div className="ui-app-topline">
          <div>
            <div className="ui-kicker">WORKS</div>
            <div className="ui-screen-title" style={{ fontSize: 22 }}>参加作品</div>
          </div>
        </div>

        {creatorRows.length > 0 ? (
          <div className="ui-profile-artwork-grid">
            {creatorRows.map((row) => (
              <ProfileArtworkCard key={`${row.artworks?.id}-${row.display_order}`} creatorRow={row} />
            ))}
          </div>
        ) : (
          <div className="ui-panel" style={{ padding: 28, textAlign: 'center', fontFamily: T.mono, fontSize: 11, color: T.inkMuted }}>公開中の作品はまだありません</div>
        )}
      </main>
      <BottomNav active="account" />
    </div>
  )
}
