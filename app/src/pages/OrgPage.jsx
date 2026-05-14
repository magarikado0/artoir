import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { IS_DEV, demoOrgs, demoExhibitions } from '../lib/demoData'
import Header from '../components/Header'
import BottomNav from '../components/BottomNav'
import { T, fmtDateDot, pad2, externalHost } from '../lib/tokens'

export default function OrgPage() {
  const { orgSlug } = useParams()
  const [org, setOrg] = useState(null)
  const [exhibitions, setExhibitions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (IS_DEV) {
        const orgData = demoOrgs.find((o) => o.slug === orgSlug) ?? demoOrgs[0]
        setOrg(orgData)
        setExhibitions(demoExhibitions.filter((e) => e.org_id === orgData.id))
        setLoading(false)
        return
      }
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
          <div className="ui-kicker">ORGANIZATION</div>
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
          <span className="ui-mini-badge">{pad2(exhibitions.length)}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          {exhibitions.map((exh, i) => (
            <Link key={exh.id} to={`/${orgSlug}/exhibition/${exh.slug}`} className="ui-list-card" style={{ padding: 10, display: 'grid', gridTemplateColumns: '82px 1fr', gap: 12 }}>
              <div style={{ width: 82, aspectRatio: '1 / 1', borderRadius: 7, background: T.surfaceMuted, display: 'grid', placeItems: 'center', fontFamily: T.mono, fontSize: 11, color: T.inkMuted }}>{pad2(i + 1)}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: T.serif, fontSize: 17, color: T.ink, lineHeight: 1.35 }}>{exh.title}</div>
                <div style={{ marginTop: 7, fontFamily: T.mono, fontSize: 10, color: T.inkMuted }}>{fmtDateDot(exh.start_date)} — {fmtDateDot(exh.end_date)}</div>
                {exh.location && <div style={{ marginTop: 5, fontSize: 11, color: T.inkSoft, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exh.location}</div>}
              </div>
            </Link>
          ))}
        </div>
      </main>
      <BottomNav active="orgs" />
    </div>
  )
}
