import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Header from '../components/Header'
import BottomNav from '../components/BottomNav'
import ArchiveExhibitionRow from '../components/ArchiveExhibitionRow'
import ArchiveLoading from '../components/ArchiveLoading'
import { useAuth } from '../lib/auth'
import { exhStatus, mapExhibitionListRow } from '../lib/exhibition'
import { isProfileWorksExhibition } from '../lib/profileWorks'
import {
  attachDiscoveryMetadata,
  DISCIPLINE_FALLBACKS,
  getExhibitionYear,
  getPrimaryDiscipline,
  groupExhibitionsByYear,
  loadDiscoveryMetadata,
} from '../lib/discoveryData'
import {
  exhibitionSearchText,
  normalizeArchiveText,
  uniqueProfilesFromArtworks,
  updateArchiveParams,
} from '../lib/archive'

const STATUS_OPTIONS = [
  { value: 'all', label: 'すべて' },
  { value: 'live', label: '開催中' },
  { value: 'upcoming', label: 'これから' },
  { value: 'ended', label: '終了' },
]

async function fetchExhibitionRows() {
  const { data, error } = await supabase
    .from('exhibitions')
    .select('*, organizations(id, name, slug), profiles(id, display_name, slug), artworks!artworks_exhibition_id_fkey(id, image_url, order, artwork_creators(profile_id, is_visible, profiles(id, display_name, slug)))')
    .eq('visibility', 'public')
    .order('start_date', { ascending: false })
  if (error) throw error
  return data || []
}

export default function AllExhibitionsPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const { session } = useAuth()

  const query = searchParams.get('q') || ''
  const statusFilter = STATUS_OPTIONS.some((item) => item.value === searchParams.get('status'))
    ? searchParams.get('status')
    : 'all'
  const requestedYear = Number(searchParams.get('year'))
  const yearFilter = Number.isInteger(requestedYear) && requestedYear > 0 ? requestedYear : null
  const disciplineFilter = searchParams.get('discipline') || ''

  function updateParams(updates, { replace = true } = {}) {
    setSearchParams((current) => updateArchiveParams(current, updates), { replace })
  }

  useEffect(() => {
    document.title = '展覧会アーカイブ | Artoir'
    return () => { document.title = 'Artoir' }
  }, [])

  useEffect(() => {
    async function load() {
      if (!supabase) return setLoading(false)
      try {
        const data = await fetchExhibitionRows()
        const visible = data.filter((exhibition) => !isProfileWorksExhibition(exhibition))
        const metadata = await loadDiscoveryMetadata(supabase, visible.map((exhibition) => exhibition.id))
        setRows(visible.map((exhibition) => {
          const { organizations: org, profiles: profile, ...rest } = exhibition
          const mapped = attachDiscoveryMetadata(mapExhibitionListRow(rest), metadata)
          return {
            exhibition: mapped,
            org,
            profile,
            creators: uniqueProfilesFromArtworks(mapped.artworks),
          }
        }))
      } catch {
        setLoadError(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const years = useMemo(() => [...new Set(rows
    .map(({ exhibition }) => getExhibitionYear(exhibition))
    .filter(Boolean))].sort((a, b) => b - a), [rows])

  const filteredRows = useMemo(() => {
    const normalizedQuery = normalizeArchiveText(query)
    return rows.filter((row) => {
      if (statusFilter !== 'all' && exhStatus(row.exhibition) !== statusFilter) return false
      if (yearFilter && getExhibitionYear(row.exhibition) !== yearFilter) return false
      if (disciplineFilter && getPrimaryDiscipline(row.exhibition)?.slug !== disciplineFilter) return false
      return !normalizedQuery || exhibitionSearchText(row).includes(normalizedQuery)
    })
  }, [disciplineFilter, query, rows, statusFilter, yearFilter])

  const yearGroups = useMemo(() => {
    const rowById = new Map(filteredRows.map((row) => [row.exhibition.id, row]))
    return groupExhibitionsByYear(filteredRows.map((row) => row.exhibition))
      .map(([year, exhibitions]) => [year, exhibitions.map((exhibition) => rowById.get(exhibition.id))])
  }, [filteredRows])

  const discipline = DISCIPLINE_FALLBACKS.find((item) => item.slug === disciplineFilter)
  const hasFilters = Boolean(query.trim() || yearFilter || discipline || statusFilter !== 'all')

  if (loading) return <ArchiveLoading />

  return (
    <div className="ui-page-shell">
      <Header activeTab="top" />
      <main className="ui-app-main ui-archive-page">
        <header className="ui-archive-masthead">
          <div>
            <span className="ui-archive-eyebrow">Exhibition archive</span>
            <h1>展覧会アーカイブ</h1>
            <p>展覧会、作家、団体、年代から記録を辿れます。</p>
          </div>
          <Link
            to={session ? '/account' : '/login'}
            state={session ? undefined : { from: '/account' }}
            className="ui-archive-publish-link"
          >
            展覧会を公開する <span aria-hidden="true">↗</span>
          </Link>
        </header>

        <section className="ui-archive-search-panel" aria-label="展覧会を検索・絞り込み">
          <label className="ui-archive-search">
            <span className="ui-sr-only">展覧会、作家、団体、場所を検索</span>
            <span aria-hidden="true">⌕</span>
            <input
              value={query}
              onChange={(event) => updateParams({ q: event.target.value })}
              placeholder="展覧会、作家、団体、場所を検索"
            />
          </label>

          <div className="ui-archive-filter-row" role="group" aria-label="開催状態">
            {STATUS_OPTIONS.map((option) => (
              <button
                type="button"
                key={option.value}
                className={statusFilter === option.value ? 'is-active' : ''}
                aria-pressed={statusFilter === option.value}
                onClick={() => updateParams({ status: option.value }, { replace: false })}
              >
                {option.label}
              </button>
            ))}
          </div>

          {years.length > 0 && (
            <nav className="ui-archive-year-nav" aria-label="開催年から絞り込む">
              <button type="button" className={yearFilter == null ? 'is-active' : ''} aria-pressed={yearFilter == null} onClick={() => updateParams({ year: null }, { replace: false })}>全年</button>
              {years.map((year) => (
                <button type="button" key={year} className={yearFilter === year ? 'is-active' : ''} aria-pressed={yearFilter === year} onClick={() => updateParams({ year }, { replace: false })}>{year}</button>
              ))}
            </nav>
          )}

          {hasFilters && (
            <div className="ui-archive-active-filters" aria-label="適用中の条件">
              {query.trim() && <button type="button" onClick={() => updateParams({ q: null })}>「{query.trim()}」 ×</button>}
              {yearFilter && <button type="button" onClick={() => updateParams({ year: null })}>{yearFilter} ×</button>}
              {statusFilter !== 'all' && <button type="button" onClick={() => updateParams({ status: null })}>{STATUS_OPTIONS.find((item) => item.value === statusFilter)?.label} ×</button>}
              {discipline && <button type="button" onClick={() => updateParams({ discipline: null })}>{discipline.name} ×</button>}
              <button type="button" className="ui-archive-clear" onClick={() => setSearchParams({}, { replace: true })}>すべて解除</button>
            </div>
          )}
        </section>

        <section className="ui-archive-results">
          <header className="ui-archive-results-head">
            <h2>{hasFilters ? '検索結果' : 'すべての記録'}</h2>
            <span aria-live="polite">{filteredRows.length}件</span>
          </header>

          {loadError ? (
            <div className="ui-archive-empty" role="alert">
              <strong>記録を読み込めませんでした</strong>
              <span>接続を確認して、ページを再読み込みしてください。</span>
            </div>
          ) : yearGroups.length > 0 ? (
            <div className="ui-archive-timeline">
              {yearGroups.map(([year, items]) => (
                <section key={year} className="ui-archive-year-group">
                  <header><h2>{year}</h2><span>{items.length}件</span></header>
                  <div className="ui-archive-year-records">
                    {items.map((row) => <ArchiveExhibitionRow key={row.exhibition.id} {...row} />)}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="ui-archive-empty">
              <strong>条件に合う展覧会はありません</strong>
              <span>検索語を短くするか、年・開催状態を解除してください。</span>
              {hasFilters && <button type="button" onClick={() => setSearchParams({}, { replace: true })}>条件をすべて解除</button>}
            </div>
          )}
        </section>
      </main>
      <BottomNav active="top" />
    </div>
  )
}
