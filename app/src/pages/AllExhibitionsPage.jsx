import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Header, { Icon } from '../components/Header'
import BottomNav from '../components/BottomNav'
import { T } from '../lib/tokens'
import { useAuth } from '../lib/auth'
import ExhibitionListCard from '../components/ExhibitionListCard'

const FILTERS = [
  { label: '全て', value: 'ALL' },
  { label: '開催中', value: 'OPEN NOW' },
  { label: '予定', value: 'UPCOMING' },
]

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

export default function AllExhibitionsPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const { session } = useAuth()

  useEffect(() => {
    document.title = '展覧会一覧 | Artoir'
    return () => { document.title = 'Artoir' }
  }, [])

  useEffect(() => {
    async function load() {
      if (!supabase) return setLoading(false)
      try {
        const { data } = await supabase
          .from('exhibitions')
          .select('*, organizations(id, name, slug), artworks(count)')
          .order('start_date', { ascending: false })
        setRows((data || []).map((exh) => {
          const { organizations: org, artworks, ...exhibition } = exh
          const artworkCount = artworks?.[0]?.count ?? 0
          return { exhibition, org, artworkCount }
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
        <h1 className="ui-sr-only">展覧会一覧</h1>

        <div className="ui-toolbar-grid">
          <input className="ui-search-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="展覧会を検索" />
          <button
            type="button"
            onClick={() => navigate(session ? '/account' : '/login')}
            className="ui-floating-action ui-create-action"
          >
            <Icon name="plus" size={18} />
            <span>展覧会を作成</span>
          </button>
        </div>

        <div className="ui-segment" style={{ marginBottom: 14 }}>
          {FILTERS.map((f) => (
            <button key={f.value} type="button" onClick={() => setFilter(f.value)} className={filter === f.value ? 'is-active' : ''}>
              {f.label}
            </button>
          ))}
        </div>

        <div className="ui-exhibition-list-grid">
          {filteredRows.map((row) => (
            <ExhibitionListCard
              key={row.exhibition.id}
              exhibition={row.exhibition}
              org={row.org}
              artworkCount={row.artworkCount}
            />
          ))}
        </div>

        {filteredRows.length === 0 && (
          <div className="ui-panel" style={{ padding: 28, textAlign: 'center', fontFamily: T.mono, fontSize: 11, color: T.inkMuted }}>NO EXHIBITIONS</div>
        )}
      </main>
      <BottomNav active="top" />
    </div>
  )
}
