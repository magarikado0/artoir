import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Header, { Icon } from '../components/Header'
import BottomNav from '../components/BottomNav'
import { T } from '../lib/tokens'
import { useAuth } from '../lib/auth'
import ExhibitionListCard from '../components/ExhibitionListCard'
import { exhStatus, mapExhibitionListRow } from '../lib/exhibition'
import { isProfileWorksExhibition } from '../lib/profileWorks'
import {
  attachDiscoveryMetadata,
  DISCIPLINE_FALLBACKS,
  getExhibitionYear,
  getPrimaryDiscipline,
  loadDiscoveryMetadata,
  rankConnectedExhibitions,
} from '../lib/discoveryData'

const STATUS_OPTIONS = [
  { value: 'all', label: 'すべて' },
  { value: 'live', label: '開催中' },
  { value: 'upcoming', label: 'これから' },
  { value: 'ended', label: '過去の展示' },
]

async function fetchExhibitionRows() {
  const { data, error } = await supabase
    .from('exhibitions')
    .select('*, organizations(id, name, slug), profiles(id, display_name, slug), artworks!artworks_exhibition_id_fkey(image_url, order)')
    .eq('visibility', 'public')
    .order('start_date', { ascending: false })
  if (error) throw error
  return data || []
}

function SectionHeading({ title, action }) {
  return (
    <div className="ui-discovery-section-head">
      <h2>{title}</h2>
      {action}
    </div>
  )
}

export default function AllExhibitionsPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [yearFilter, setYearFilter] = useState(null)
  const [selectedDiscipline, setSelectedDiscipline] = useState('calligraphy')
  const [breadth, setBreadth] = useState('near')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const requestedDiscipline = searchParams.get('discipline')
  const { session } = useAuth()

  useEffect(() => {
    document.title = '展覧会を辿る | Artoir'
    return () => { document.title = 'Artoir' }
  }, [])

  useEffect(() => {
    async function load() {
      if (!supabase) return setLoading(false)
      try {
        const data = await fetchExhibitionRows()
        const visible = (data || []).filter((exh) => !isProfileWorksExhibition(exh))
        const metadata = await loadDiscoveryMetadata(supabase, visible.map((exh) => exh.id))
        const mapped = visible.map((exh) => {
          const { organizations: org, profiles: profile, ...rest } = exh
          const exhibition = attachDiscoveryMetadata(mapExhibitionListRow(rest), metadata)
          return { exhibition, org, profile, artworkCount: exhibition.artworkCount }
        })
        setRows(mapped)
        const available = DISCIPLINE_FALLBACKS.find((discipline) => (
          mapped.some(({ exhibition }) => getPrimaryDiscipline(exhibition)?.slug === discipline.slug)
        ))
        const requested = DISCIPLINE_FALLBACKS.find((discipline) => discipline.slug === requestedDiscipline)
        if (requested || available) setSelectedDiscipline((requested || available).slug)
      } catch {
        /* 公開一覧は接続不良時も空状態として表示する。 */
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [requestedDiscipline])

  const disciplineCounts = useMemo(() => {
    const counts = new Map(DISCIPLINE_FALLBACKS.map((item) => [item.slug, 0]))
    for (const { exhibition } of rows) {
      for (const discipline of exhibition.discovery?.disciplines || []) {
        counts.set(discipline.slug, (counts.get(discipline.slug) || 0) + 1)
      }
    }
    return counts
  }, [rows])

  const disciplines = useMemo(() => DISCIPLINE_FALLBACKS.map((item) => ({
    ...item,
    count: disciplineCounts.get(item.slug) || 0,
  })), [disciplineCounts])

  const years = useMemo(() => [...new Set(rows.map(({ exhibition }) => getExhibitionYear(exhibition)).filter(Boolean))]
    .sort((a, b) => b - a), [rows])

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return rows.filter(({ exhibition, org, profile }) => {
      if (statusFilter !== 'all' && exhStatus(exhibition) !== statusFilter) return false
      if (yearFilter && getExhibitionYear(exhibition) !== yearFilter) return false
      if (!normalizedQuery) return true
      const searchable = [
        exhibition.title,
        exhibition.description,
        exhibition.location,
        org?.name,
        profile?.display_name,
        ...(exhibition.discovery?.disciplines || []).map((item) => item.name),
        ...(exhibition.discovery?.tags || []).map((item) => item.name),
      ].filter(Boolean).join(' ').toLowerCase()
      return searchable.includes(normalizedQuery)
    })
  }, [rows, query, statusFilter, yearFilter])

  const currentRows = useMemo(() => rows
    .filter(({ exhibition }) => ['live', 'upcoming'].includes(exhStatus(exhibition)))
    .sort((a, b) => {
      const statusDiff = ['live', 'upcoming'].indexOf(exhStatus(a.exhibition)) - ['live', 'upcoming'].indexOf(exhStatus(b.exhibition))
      return statusDiff || String(a.exhibition.start_date || '').localeCompare(String(b.exhibition.start_date || ''))
    })
    .slice(0, 6), [rows])

  const recentRows = useMemo(() => {
    const currentIds = new Set(currentRows.map(({ exhibition }) => exhibition.id))
    return [...rows]
      .filter(({ exhibition }) => !currentIds.has(exhibition.id))
      .sort((a, b) => String(b.exhibition.created_at || b.exhibition.start_date || '')
        .localeCompare(String(a.exhibition.created_at || a.exhibition.start_date || '')))
      .slice(0, 6)
  }, [currentRows, rows])

  const selectedDisciplineInfo = disciplines.find((item) => item.slug === selectedDiscipline) || disciplines[0]
  const connectedRows = useMemo(() => {
    const sameField = rows.filter(({ exhibition }) => getPrimaryDiscipline(exhibition)?.slug === selectedDiscipline)
    const seedRow = sameField[0] || rows[0]
    if (!seedRow) return []
    const same = sameField.slice(0, 2).map((row) => ({ row, reason: `${selectedDisciplineInfo?.name || '同じ分野'}をさらに辿る`, kind: 'near' }))
    const ranked = rankConnectedExhibitions(
      seedRow.exhibition,
      rows.filter((row) => !same.some((entry) => entry.row.exhibition.id === row.exhibition.id)).map((row) => row.exhibition),
      { breadth: breadth === 'wide' ? 'wide' : 'balanced', limit: 8 },
    )
    const byId = new Map(rows.map((row) => [row.exhibition.id, row]))
    const cross = ranked
      .filter(({ item }) => breadth === 'wide' || getPrimaryDiscipline(item)?.slug !== selectedDiscipline)
      .slice(0, Math.max(2, 4 - same.length))
      .map(({ item, connection }) => ({ row: byId.get(item.id), reason: connection?.reason, kind: connection?.kind }))
      .filter(({ row }) => row)
    return [...same, ...cross].slice(0, 4)
  }, [breadth, rows, selectedDiscipline, selectedDisciplineInfo?.name])

  const hasSearchContext = Boolean(query.trim() || yearFilter || statusFilter !== 'all')

  if (loading) return <div className="ui-page-shell" />

  return (
    <div className="ui-page-shell">
      <Header activeTab="top" />
      <main className="ui-app-main ui-discovery-page">
        <section className="ui-discovery-intro">
          <h1 className="ui-screen-title">展覧会を辿る</h1>
        </section>

        <div className="ui-toolbar-grid ui-discovery-toolbar">
          <label className="ui-discovery-search">
            <span className="ui-sr-only">展覧会を検索</span>
            <Icon name="list" size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="展覧会、団体、作家、場所を検索"
            />
          </label>
          <button
            type="button"
            onClick={() => navigate(session ? '/account' : '/login', session ? undefined : { state: { from: '/account' } })}
            className="ui-pill-action ui-pill-action--accent"
          >
            <Icon name="plus" size={16} />
            <span>展覧会を作成</span>
          </button>
        </div>

        <div className="ui-discovery-statuses" role="group" aria-label="開催状態で絞り込む">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={statusFilter === option.value ? 'is-active' : ''}
              aria-pressed={statusFilter === option.value}
              onClick={() => setStatusFilter(option.value)}
            >
              <span>{option.label}</span>
            </button>
          ))}
        </div>

        {hasSearchContext ? (
          <section className="ui-discovery-section" aria-live="polite">
            <SectionHeading
              title={yearFilter ? `${yearFilter}年の展覧会` : '検索結果'}
              action={hasSearchContext ? (
                <button type="button" className="ui-text-action" onClick={() => { setQuery(''); setYearFilter(null); setStatusFilter('all') }}>
                  条件をクリア
                </button>
              ) : null}
            />
            <div className="ui-exhibition-list-grid">
              {filteredRows.map((row) => (
                <ExhibitionListCard key={row.exhibition.id} {...row} />
              ))}
            </div>
            {filteredRows.length === 0 && (
              <div className="ui-panel ui-discovery-empty">展覧会はありません</div>
            )}
          </section>
        ) : (
          <>
            {currentRows.length > 0 && (
              <section className="ui-discovery-section">
                <SectionHeading title="開催中・これから" />
                <div className="ui-exhibition-list-grid">
                  {currentRows.map((row) => <ExhibitionListCard key={row.exhibition.id} {...row} />)}
                </div>
              </section>
            )}

            {recentRows.length > 0 && (
              <section className="ui-discovery-section">
                <SectionHeading title="新しく追加された記録" />
                <div className="ui-exhibition-list-grid">
                  {recentRows.map((row) => <ExhibitionListCard key={row.exhibition.id} {...row} />)}
                </div>
              </section>
            )}

            <section className="ui-discovery-section">
              <SectionHeading title="分野から辿る" />
              <div className="ui-discipline-index" role="list" aria-label="芸術分野">
                {disciplines.map((discipline) => (
                  <button
                    type="button"
                    role="listitem"
                    key={discipline.slug}
                    className={selectedDiscipline === discipline.slug ? 'is-active' : ''}
                    aria-pressed={selectedDiscipline === discipline.slug}
                    onClick={() => setSelectedDiscipline(discipline.slug)}
                  >
                    <span>{discipline.name}</span>
                  </button>
                ))}
              </div>

              <div className="ui-discovery-connected-head">
                <h3>{selectedDisciplineInfo?.name}</h3>
                <div className="ui-discovery-breadth" role="group" aria-label="関連性の幅">
                  <button type="button" className={breadth === 'near' ? 'is-active' : ''} aria-pressed={breadth === 'near'} onClick={() => setBreadth('near')}>近い表現</button>
                  <button type="button" className={breadth === 'wide' ? 'is-active' : ''} aria-pressed={breadth === 'wide'} onClick={() => setBreadth('wide')}>意外な表現</button>
                </div>
              </div>
              <div className="ui-exhibition-list-grid">
                {connectedRows.map(({ row }) => (
                  <ExhibitionListCard key={row.exhibition.id} {...row} />
                ))}
              </div>
              {connectedRows.length === 0 && (
                <div className="ui-panel ui-discovery-empty">展覧会はありません</div>
              )}
            </section>

            {years.length > 0 && (
              <section className="ui-discovery-section">
                <SectionHeading title="時間から辿る" />
                <div className="ui-year-index">
                  {years.slice(0, 6).map((year) => (
                    <button type="button" key={year} onClick={() => setYearFilter(year)}>
                      <strong>{year}</strong>
                      <i aria-hidden="true">→</i>
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section className="ui-discovery-section">
              <SectionHeading title="すべての展覧会" />
              <div className="ui-exhibition-list-grid">
                {rows.map((row) => (
                  <ExhibitionListCard key={row.exhibition.id} {...row} />
                ))}
              </div>
              {rows.length === 0 && (
                <div className="ui-panel" style={{ textAlign: 'center', color: T.inkMuted, fontSize: 13 }}>公開中の展覧会がまだありません</div>
              )}
            </section>
          </>
        )}
      </main>
      <BottomNav active="top" />
    </div>
  )
}
