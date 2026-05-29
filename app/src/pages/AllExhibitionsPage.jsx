import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Header, { Icon } from '../components/Header'
import BottomNav from '../components/BottomNav'
import { T } from '../lib/tokens'
import { useAuth } from '../lib/auth'
import ExhibitionListCard from '../components/ExhibitionListCard'
import { mapExhibitionListRow } from '../lib/exhibition'
import { isPersonPublisher, PUBLISHER_KIND } from '../lib/publisher'

const FILTERS = [
  { label: 'すべて', value: 'ALL' },
  { label: '団体', value: PUBLISHER_KIND.ORGANIZATION },
  { label: '個人', value: PUBLISHER_KIND.PERSON },
]

function matchesPublisherFilter(org, filter) {
  if (filter === 'ALL') return true
  if (filter === PUBLISHER_KIND.PERSON) return isPersonPublisher(org)
  if (filter === PUBLISHER_KIND.ORGANIZATION) return !isPersonPublisher(org)
  return true
}

async function fetchExhibitionRows() {
  const runQuery = (select) => supabase
    .from('exhibitions')
    .select(select)
    .order('start_date', { ascending: false })

  const withKind = await runQuery('*, organizations(id, name, slug, kind), artworks(image_url, order)')

  if (!withKind.error) return withKind.data || []

  const withoutKind = await runQuery('*, organizations(id, name, slug), artworks(image_url, order)')

  if (withoutKind.error) throw withoutKind.error
  return withoutKind.data || []
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
        const data = await fetchExhibitionRows()
        setRows((data || []).map((exh) => {
          const { organizations: org, ...rest } = exh
          const exhibition = mapExhibitionListRow(rest)
          return { exhibition, org, artworkCount: exhibition.artworkCount }
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
      .filter(({ org }) => matchesPublisherFilter(org, filter))
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
