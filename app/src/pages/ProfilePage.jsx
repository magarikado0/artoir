import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Header from '../components/Header'
import BottomNav from '../components/BottomNav'
import ArtworkModal from '../components/ArtworkModal'
import ExhibitionArtworkGallery from '../components/ExhibitionArtworkGallery'
import { T, externalHost } from '../lib/tokens'
import { attachNormalizedCreators } from '../lib/profile'

export default function ProfilePage() {
  const { profileSlug } = useParams()
  const [profile, setProfile] = useState(null)
  const [organizations, setOrganizations] = useState([])
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
        const [{ data: rows }, { data: membershipRows }] = await Promise.all([
          supabase
            .from('artwork_creators')
            .select('display_order, artworks(id, title, description, image_url, artwork_creators(profile_id, display_order, is_visible, profiles(id, slug, display_name)), exhibitions(id, title, slug, start_date, end_date, organization_id, profile_id, organizations(id, name, slug), profiles(id, display_name, slug)))')
            .eq('profile_id', profileData.id)
            .eq('is_visible', true),
          supabase
            .from('organization_members')
            .select('role, organizations(id, name, slug)')
            .eq('profile_id', profileData.id),
        ])
        setArtworks((rows || []).map((row) => attachNormalizedCreators(row.artworks)).filter((artwork) => artwork?.image_url))
        setOrganizations((membershipRows || []).map((row) => row.organizations).filter((org) => org?.slug))
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

  return (
    <div className="ui-page-shell">
      <Header />
      <main className="ui-app-main">
        <Link to="/" style={{ display: 'inline-flex', marginBottom: 14, color: T.inkMuted, textDecoration: 'none', fontFamily: T.mono, fontSize: 11 }}>← 展覧会</Link>
        <section className="ui-app-card" style={{ padding: 18, marginBottom: 14 }}>
          <div className="ui-kicker">プロフィール</div>
          <h1 className="ui-screen-title" style={{ marginTop: 7 }}>{profile.display_name}</h1>
          <div style={{ marginTop: 4, fontFamily: T.mono, fontSize: 11, color: T.inkMuted }}>@{profile.slug}</div>
          {profile.bio && <p className="ui-screen-subtitle" style={{ maxWidth: 720, marginTop: 12 }}>{profile.bio}</p>}
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
          <ExhibitionArtworkGallery artworks={artworks} onOpenArtwork={setSelectedArtwork} />
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
