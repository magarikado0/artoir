import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import Header, { Icon } from '../components/Header'
import BottomNav from '../components/BottomNav'
import { T, pad2 } from '../lib/tokens'

const loginForSetupState = { from: '/account/organizations/new' }

export default function OrgsPage() {
  const { session } = useAuth()
  const [orgs, setOrgs] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    document.title = '公開ページ一覧 | Artoir'
    return () => { document.title = 'Artoir' }
  }, [])

  useEffect(() => {
    async function load() {
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
        <h1 className="ui-sr-only">公開ページ一覧</h1>

        <div className="ui-toolbar-grid">
          <input className="ui-search-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="名前を検索" />
          <Link to={session ? '/account/organizations/new' : '/login'} state={session ? undefined : loginForSetupState} className="ui-floating-action ui-create-action">
            <Icon name="plus" size={17} />
            <span>団体を作成</span>
          </Link>
        </div>

        <div className="ui-org-table">
          <div className="ui-org-table-head" aria-hidden="true">
            <span>No.</span>
            <span>団体</span>
            <span>展示</span>
          </div>
          <div className="ui-org-list">
            {filtered.map((o, i) => (
              <Link key={o.id} to={`/${o.slug}`} className="ui-org-row">
                <div className="ui-org-index">{pad2(i + 1)}</div>
                <div style={{ minWidth: 0 }}>
                  <div className="ui-org-name-row">
                    <span className="ui-org-name">{o.name}</span>
                  </div>
                  {o.description && <div className="ui-org-description">{o.description}</div>}
                </div>
                <div className="ui-org-count">
                  <span>{pad2(o.exh_count ?? 0)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {filtered.length === 0 && (
          <div className="ui-panel" style={{ padding: 28, textAlign: 'center', fontFamily: T.mono, fontSize: 11, color: T.inkMuted }}>団体が見つかりません</div>
        )}
      </main>
      <BottomNav active="orgs" />
    </div>
  )
}
