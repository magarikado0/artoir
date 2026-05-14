import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { IS_DEV, demoOrgs, demoExhibitions } from '../lib/demoData'
import Header, { Icon } from '../components/Header'
import BottomNav from '../components/BottomNav'
import { T, pad2 } from '../lib/tokens'

const loginForSetupState = { from: '/account/setup' }

export default function OrgsPage() {
  const { session } = useAuth()
  const [orgs, setOrgs] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    async function load() {
      if (IS_DEV) {
        setOrgs(demoOrgs.map((o) => ({ ...o, exh_count: demoExhibitions.filter((e) => e.org_id === o.id).length })))
        setLoading(false)
        return
      }
      if (!supabase) return setLoading(false)
      try {
        const { data } = await supabase.from('organizations').select('*, exhibitions(count)').order('name')
        setOrgs((data || []).map((o) => ({ ...o, exh_count: o.exhibitions?.[0]?.count ?? 0 })))
      } catch {
        /* unavailable */
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return orgs
    return orgs.filter((o) => [o.name, o.description].filter(Boolean).join(' ').toLowerCase().includes(q))
  }, [orgs, query])

  if (loading) return (
    <div className="ui-page-shell" style={{ display: 'grid', placeItems: 'center' }}>
      <span style={{ fontFamily: T.mono, color: T.inkMuted, letterSpacing: '0.2em', fontSize: 11 }}>...</span>
    </div>
  )

  return (
    <div className="ui-page-shell">
      <Header activeTab="orgs" />
      <main className="ui-app-main">
        <div className="ui-app-topline">
          <div>
            <div className="ui-kicker">ORGANIZATIONS</div>
            <h1 className="ui-screen-title">団体</h1>
            <p className="ui-screen-subtitle">展覧会を公開している団体を、アプリの連絡先リストのように探せます。</p>
          </div>
          <span className="ui-mini-badge">{pad2(filtered.length)} ORGS</span>
        </div>

        <div className="ui-toolbar-grid">
          <input className="ui-search-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="団体名を検索" />
          <Link to={session ? '/account/setup' : '/login'} state={session ? undefined : loginForSetupState} className="ui-pill-action">
            <Icon name="plus" size={17} />
            <span>団体作成</span>
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          {filtered.map((o, i) => (
            <Link key={o.id} to={`/${o.slug}`} className="ui-list-card" style={{ padding: 14, display: 'grid', gridTemplateColumns: '48px 1fr auto', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: 8, display: 'grid', placeItems: 'center', background: i === 0 ? T.ink : T.paperAlt, color: i === 0 ? T.paper : T.inkMuted, fontFamily: T.mono, fontSize: 11 }}>{pad2(i + 1)}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: T.serif, fontSize: 17, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.name}</div>
                {o.description && <div style={{ marginTop: 4, fontSize: 12, lineHeight: 1.5, color: T.inkMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.description}</div>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: T.serif, fontSize: 22 }}>{pad2(o.exh_count ?? 0)}</div>
                <div style={{ fontFamily: T.mono, fontSize: 9, color: T.inkMuted }}>EXH.</div>
              </div>
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="ui-panel" style={{ padding: 28, textAlign: 'center', fontFamily: T.mono, fontSize: 11, color: T.inkMuted }}>NO ORGANIZATIONS</div>
        )}
      </main>
      <BottomNav active="orgs" />
    </div>
  )
}
