import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Header from '../components/Header'
import BottomNav from '../components/BottomNav'
import ExhibitionListCard from '../components/ExhibitionListCard'
import LoadingFrames from '../components/LoadingFrames'
import { T, externalHost } from '../lib/tokens'
import { mapExhibitionListRow } from '../lib/exhibition'
import { legacyProfileSlugFromOwnerSlug, profilePath } from '../lib/profileRoutes'

export default function OrgPage() {
  const { orgSlug } = useParams()
  const navigate = useNavigate()
  const legacyProfileSlug = legacyProfileSlugFromOwnerSlug(orgSlug)
  const [org, setOrg] = useState(null)
  const [exhibitions, setExhibitions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (legacyProfileSlug) {
        navigate(profilePath(legacyProfileSlug), { replace: true })
        return
      }
      if (!supabase) return setLoading(false)
      try {
        const { data: orgData } = await supabase.from('organizations').select('*').eq('slug', orgSlug).single()
        if (!orgData) return setLoading(false)
        setOrg(orgData)
        const { data: exhData } = await supabase
          .from('exhibitions')
          .select('*, artworks(image_url, order)')
          .eq('organization_id', orgData.id)
          .order('start_date', { ascending: false })
        setExhibitions((exhData || []).map(mapExhibitionListRow))
      } catch {
        /* unavailable */
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [legacyProfileSlug, navigate, orgSlug])

  if (loading) return (
    <div className="ui-page-shell" style={{ display: 'grid', placeItems: 'center' }}>
      <LoadingFrames />
    </div>
  )
  if (!org) return (
    <div className="ui-page-shell" style={{ display: 'grid', placeItems: 'center' }}>
      <p style={{ color: T.inkMuted, fontSize: 14 }}>公開ページが見つかりません</p>
    </div>
  )

  const sns = org.sns_links || {}

  return (
    <div className="ui-page-shell">
      <Header activeTab="orgs" />
      <main className="ui-app-main">
        <Link to="/orgs" className="ui-back-link" style={{ marginBottom: 20 }}>← 公開ページ一覧</Link>
        <section style={{ marginBottom: 48 }}>
          <div className="ui-kicker">{org.kind === 'person' ? '作家' : '団体'}</div>
          <h1 className="ui-screen-title" style={{ marginTop: 8 }}>{org.name}</h1>
          {org.description && <p className="ui-screen-subtitle">{org.description}</p>}
          {(sns.instagram || sns.x || org.homepage_url) && (
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
              {org.homepage_url && (
                <a href={org.homepage_url} target="_blank" rel="noreferrer" className="ui-public-text-link">
                  <span>Web</span>
                  <span>{externalHost(org.homepage_url)}</span>
                </a>
              )}
            </div>
          )}
        </section>

        <div className="ui-section-label">展覧会</div>

        <div className="ui-exhibition-list-grid">
          {exhibitions.map((exh) => (
            <ExhibitionListCard
              key={exh.id}
              exhibition={exh}
              org={org}
              showOrgName={false}
              artworkCount={exh.artworkCount}
            />
          ))}
        </div>
      </main>
      <BottomNav active="orgs" />
    </div>
  )
}
