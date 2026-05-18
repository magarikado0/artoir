import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Header, { Icon } from '../components/Header'
import BottomNav from '../components/BottomNav'
import { T, fmtDateDot, pad2 } from '../lib/tokens'
import { useAuth } from '../lib/auth'

const FILTERS = ['ALL', 'OPEN NOW', 'UPCOMING']

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function parseLocalDate(s) {
  if (!s) return null
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return new Date(s)
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

function matchesFilter(exh, filter) {
  if (filter === 'ALL') return true
  const today = startOfToday()
  const start = parseLocalDate(exh.start_date)
  const end = parseLocalDate(exh.end_date)
  if (filter === 'OPEN NOW') return Boolean(start && end && start <= today && today <= end)
  if (filter === 'UPCOMING') return Boolean(start && start > today)
  return true
}

function StatusDot({ exhibition }) {
  const live = matchesFilter(exhibition, 'OPEN NOW')
  const upcoming = matchesFilter(exhibition, 'UPCOMING')
  const text = live ? '開催中' : upcoming ? '予定' : '終了'
  const bg = live ? T.accent : upcoming ? T.gold : T.paperAlt
  const color = live ? T.paper : T.ink
  return <span className="ui-status-badge" style={{ background: bg, color }}>{text}</span>
}

function ExhibitionCard({ row }) {
  const { exhibition: exh, org } = row
  const placeholderBg = `linear-gradient(135deg, ${T.surfaceMuted}, ${T.mint} 58%, ${T.blush})`
  return (
    <Link to={`/${org?.slug}/exhibition/${exh.slug}`} className="ui-list-card ui-exhibition-list-card" style={{ display: 'grid', gridTemplateColumns: '96px 1fr', gap: 12, padding: 10 }}>
      <div style={{ width: 96, aspectRatio: '1 / 1', borderRadius: 7, background: placeholderBg, boxShadow: `inset 0 -3px 0 ${T.gold}`, display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
        <span style={{ fontFamily: T.mono, fontSize: 11, color: T.inkMuted }}>{pad2((exh.title || '').length || 1)}</span>
      </div>
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '2px 0' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
            <StatusDot exhibition={exh} />
            <span style={{ fontFamily: T.mono, fontSize: 10, color: T.inkMuted }}>{fmtDateDot(exh.start_date)}</span>
          </div>
          <div style={{ fontFamily: T.serif, fontSize: 18, lineHeight: 1.35, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis' }}>{exh.title}</div>
          <div style={{ marginTop: 4, fontSize: 12, color: T.inkMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{org?.name}</div>
        </div>
        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 11, color: T.inkSoft }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exh.location || '会場未設定'}</span>
          <span style={{ fontFamily: T.mono, flexShrink: 0 }}>→</span>
        </div>
      </div>
    </Link>
  )
}

export default function AllExhibitionsPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const { session } = useAuth()

  useEffect(() => {
    async function load() {
      if (!supabase) return setLoading(false)
      try {
        const { data } = await supabase.from('exhibitions').select('*, organizations(id, name, slug)').order('start_date', { ascending: false })
        setRows((data || []).map((exh) => {
          const { organizations: org, ...exhibition } = exh
          return { exhibition, org }
        }))
      } catch {
        /* unavailable */
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows
      .filter(({ exhibition }) => matchesFilter(exhibition, filter))
      .filter(({ exhibition, org }) => {
        if (!q) return true
        return [exhibition.title, exhibition.location, org?.name].filter(Boolean).join(' ').toLowerCase().includes(q)
      })
  }, [rows, filter, query])

  if (loading) return (
    <div className="ui-page-shell" style={{ display: 'grid', placeItems: 'center' }}>
      <span style={{ fontFamily: T.mono, color: T.inkMuted, letterSpacing: '0.2em', fontSize: 11 }}>...</span>
    </div>
  )

  return (
    <div className="ui-page-shell">
      <Header activeTab="top" />
      <main className="ui-app-main">
        <div className="ui-app-topline ui-app-topline--with-create">
          <div className="ui-hero-screen-heading">
            <div className="ui-kicker">EXHIBITIONS</div>
            <h1 className="ui-screen-title">展覧会</h1>
          </div>
          <button
            type="button"
            onClick={() => navigate(session ? '/account' : '/login')}
            className="ui-floating-action ui-exhibitions-create-btn"
          >
            <Icon name="plus" size={18} />
            <span>展覧会を作る</span>
          </button>
        </div>

        <div className="ui-toolbar-grid">
          <input className="ui-search-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="展覧会・団体・会場を検索" />
          <div className="ui-segment">
            {FILTERS.map((f) => <button key={f} type="button" onClick={() => setFilter(f)} className={filter === f ? 'is-active' : ''}>{f}</button>)}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          {filteredRows.map((row) => <ExhibitionCard key={row.exhibition.id} row={row} />)}
        </div>

        {filteredRows.length === 0 && (
          <div className="ui-panel" style={{ padding: 28, textAlign: 'center', fontFamily: T.mono, fontSize: 11, color: T.inkMuted }}>NO EXHIBITIONS</div>
        )}
      </main>
      <BottomNav active="top" />
    </div>
  )
}
