import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Header from '../components/Header'
import BottomNav from '../components/BottomNav'
import ExhibitionListCard from '../components/ExhibitionListCard'
import { T, externalHost } from '../lib/tokens'

export default function OrgPage() {
  const { orgSlug } = useParams()
  const [org, setOrg] = useState(null)
  const [exhibitions, setExhibitions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!supabase) return setLoading(false)
      try {
        const { data: orgData } = await supabase.from('organizations').select('*').eq('slug', orgSlug).single()
        if (!orgData) return setLoading(false)
        setOrg(orgData)
        const { data: exhData } = await supabase.from('exhibitions').select('*').eq('org_id', orgData.id).order('start_date', { ascending: false })
        setExhibitions(exhData || [])
      } catch {
        /* unavailable */
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [orgSlug])

  if (loading) return (
    <div className="ui-page-shell" style={{ display: 'grid', placeItems: 'center' }}>
      <span style={{ fontFamily: T.mono, color: T.inkMuted, letterSpacing: '0.2em', fontSize: 11 }}>...</span>
    </div>
  )
  if (!org) return (
    <div className="ui-page-shell" style={{ display: 'grid', placeItems: 'center' }}>
      <p style={{ color: T.inkMuted, fontSize: 13 }}>団体が見つかりません</p>
    </div>
  )

  const sns = org.sns_links || {}
  const links = [
    sns.instagram && ['Instagram', sns.instagram],
    sns.x && ['X', sns.x],
    org.homepage_url && ['Web', org.homepage_url],
  ].filter(Boolean)

  return (
    <div className="ui-page-shell">
      <Header activeTab="orgs" />
      <main className="ui-app-main">
        <Link to="/orgs" style={{ display: 'inline-flex', marginBottom: 14, color: T.inkMuted, textDecoration: 'none', fontFamily: T.mono, fontSize: 11 }}>← 団体一覧</Link>
        <section className="ui-app-card" style={{ padding: 18, marginBottom: 14 }}>
          <h1 className="ui-screen-title" style={{ marginTop: 7 }}>{org.name}</h1>
          {org.description && <p className="ui-screen-subtitle" style={{ maxWidth: 720 }}>{org.description}</p>}
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
            <div className="ui-kicker">EXHIBITIONS</div>
            <div className="ui-screen-title" style={{ fontSize: 22 }}>展覧会</div>
          </div>
        </div>

        <div className="ui-exhibition-list-grid">
          {exhibitions.map((exh) => (
            <ExhibitionListCard key={exh.id} exhibition={exh} org={org} showOrgName={false} />
          ))}
        </div>
      </main>
      <BottomNav active="orgs" />
    </div>
  )
}
