import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Header, { Icon } from '../components/Header'
import BottomNav from '../components/BottomNav'
import { T } from '../lib/tokens'
import { useAuth } from '../lib/auth'
import ExhibitionListCard from '../components/ExhibitionListCard'
import { mapExhibitionListRow } from '../lib/exhibition'
import { isProfileWorksExhibition } from '../lib/profileWorks'

async function fetchExhibitionRows() {
  const { data, error } = await supabase
    .from('exhibitions')
    .select('*, organizations(id, name, slug), profiles(id, display_name, slug), artworks(image_url, order)')
    .order('start_date', { ascending: false })
  if (error) throw error
  return data || []
}

export default function AllExhibitionsPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
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
        setRows((data || []).filter((exh) => !isProfileWorksExhibition(exh)).map((exh) => {
          const { organizations: org, profiles: profile, ...rest } = exh
          const exhibition = mapExhibitionListRow(rest)
          return { exhibition, org, profile, artworkCount: exhibition.artworkCount }
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
      .filter(({ exhibition, org, profile }) => {
        if (!q) return true
        return [exhibition.title, exhibition.location, org?.name, profile?.display_name].filter(Boolean).join(' ').toLowerCase().includes(q)
      })
  }, [rows, query])

  if (loading) return (
    <div className="ui-page-shell" />
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
            onClick={() => navigate(session ? '/account' : '/login', session ? undefined : { state: { from: '/account' } })}
            className="ui-pill-action ui-pill-action--accent"
          >
            <Icon name="plus" size={16} />
            <span>展覧会を作成</span>
          </button>
        </div>

        <div className="ui-exhibition-list-grid">
          {filteredRows.map((row) => (
            <ExhibitionListCard
              key={row.exhibition.id}
              exhibition={row.exhibition}
              org={row.org}
              profile={row.profile}
              artworkCount={row.artworkCount}
            />
          ))}
        </div>

        {filteredRows.length === 0 && (
          <div className="ui-panel" style={{ textAlign: 'center', color: T.inkMuted, fontSize: 13 }}>展覧会がまだありません</div>
        )}
      </main>
      <BottomNav active="top" />
    </div>
  )
}
