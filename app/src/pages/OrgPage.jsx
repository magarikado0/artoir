import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Header from '../components/Header'
import BottomNav from '../components/BottomNav'
import ShareLinkButton from '../components/ShareLinkButton'
import PublicManageLink from '../components/PublicManageLink'
import ExhibitionListCard, { ExhibitionCardMedia } from '../components/ExhibitionListCard'
import { T, externalHost } from '../lib/tokens'
import { exhStatus, getExhibitionThumbnailUrl, mapExhibitionListRow } from '../lib/exhibition'
import {
  attachDiscoveryMetadata,
  buildSeriesPath,
  DISCIPLINE_FALLBACKS,
  editionDisplay,
  groupExhibitionsByYear,
  loadDiscoveryMetadata,
} from '../lib/discoveryData'
import { legacyProfileSlugFromOwnerSlug, profilePath } from '../lib/profileRoutes'

function SeriesCard({ series, org }) {
  const exhibitions = series.exhibitions || []
  const latest = exhibitions[0]
  const seriesHref = buildSeriesPath({ series, org })

  return (
    <article className="ui-series-card">
      <Link to={seriesHref} className="ui-series-card-media" aria-label={`${series.name}の歴代開催を見る`}>
        <ExhibitionCardMedia thumbnailUrl={getExhibitionThumbnailUrl(latest)} title={series.name} />
      </Link>
      <div className="ui-series-card-body">
        <Link to={seriesHref} className="ui-series-card-title">{series.name}</Link>
        <div className="ui-series-card-years" aria-label="直近の開催回">
          {exhibitions.slice(0, 4).map((exhibition) => (
            <Link key={exhibition.id} to={`/${org.slug}/exhibition/${exhibition.slug}`} aria-label={editionDisplay(exhibition) || exhibition.title}>
              <strong>{exhibition.edition_year || String(exhibition.start_date || '').slice(0, 4) || '—'}</strong>
            </Link>
          ))}
          <Link to={seriesHref} className="ui-series-card-all">すべて見る <span aria-hidden="true">→</span></Link>
        </div>
      </div>
    </article>
  )
}

export default function OrgPage() {
  const { orgSlug } = useParams()
  const navigate = useNavigate()
  const legacyProfileSlug = legacyProfileSlugFromOwnerSlug(orgSlug)
  const [org, setOrg] = useState(null)
  const [exhibitions, setExhibitions] = useState([])
  const [series, setSeries] = useState([])
  const [selectedYear, setSelectedYear] = useState(null)
  const [selectedDiscipline, setSelectedDiscipline] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (legacyProfileSlug) {
        navigate(profilePath(legacyProfileSlug), { replace: true })
        return
      }
      if (!supabase) return setLoading(false)
      try {
        const { data: orgData } = await supabase.from('organizations').select('*').eq('slug', orgSlug).single()
        if (!orgData) return setLoading(false)
        setOrg(orgData)
        const [{ data: exhibitionRows }, { data: seriesRows }] = await Promise.all([
          supabase
            .from('exhibitions')
            .select('*, artworks!artworks_exhibition_id_fkey(image_url, order)')
            .eq('organization_id', orgData.id)
            .eq('visibility', 'public')
            .order('start_date', { ascending: false }),
          supabase
            .from('exhibition_series')
            .select('*')
            .eq('organization_id', orgData.id)
            .order('start_year', { ascending: false }),
        ])
        const metadata = await loadDiscoveryMetadata(supabase, (exhibitionRows || []).map((item) => item.id))
        const mapped = (exhibitionRows || []).map((item) => attachDiscoveryMetadata(mapExhibitionListRow(item), metadata))
        setExhibitions(mapped)
        setSeries((seriesRows || []).map((item) => ({
          ...item,
          exhibitions: mapped.filter((exhibition) => exhibition.series_id === item.id),
        })).filter((item) => item.exhibitions.length > 0))
      } catch {
        /* unavailable */
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [legacyProfileSlug, navigate, orgSlug])

  const filteredExhibitions = useMemo(() => exhibitions.filter((exhibition) => {
    if (statusFilter !== 'all' && exhStatus(exhibition) !== statusFilter) return false
    if (selectedDiscipline !== 'all' && !exhibition.discovery?.disciplines?.some((item) => item.slug === selectedDiscipline)) return false
    return true
  }), [exhibitions, selectedDiscipline, statusFilter])

  const yearGroups = useMemo(() => groupExhibitionsByYear(filteredExhibitions), [filteredExhibitions])
  const visibleYearGroups = selectedYear
    ? yearGroups.filter(([year]) => String(year) === String(selectedYear))
    : yearGroups
  const availableDisciplines = DISCIPLINE_FALLBACKS.filter((discipline) => (
    exhibitions.some((exhibition) => exhibition.discovery?.disciplines?.some((item) => item.slug === discipline.slug))
  ))

  if (loading) return <div className="ui-page-shell" />
  if (!org) return (
    <div className="ui-page-shell" style={{ display: 'grid', placeItems: 'center' }}>
      <p style={{ color: T.inkMuted, fontSize: 14 }}>公開ページが見つかりません</p>
    </div>
  )

  const sns = org.sns_links || {}

  return (
    <div className="ui-page-shell">
      <Header activeTab="orgs" />
      <main className="ui-app-main ui-org-archive-page">
        <section className="ui-org-archive-hero">
          <h1 className="ui-screen-title">{org.name}</h1>
          <div className="ui-public-action-row">
            <ShareLinkButton />
            <PublicManageLink ownerType="organization" ownerId={org.id} to={`/${org.slug}/dashboard`} label="団体を管理" />
          </div>
          {(sns.instagram || sns.x || org.homepage_url) && (
            <div className="ui-public-link-row">
              {sns.instagram && (
                <a href={sns.instagram} target="_blank" rel="noreferrer" className="ui-public-icon-link" aria-label="Instagram">
                  <span className="ui-public-icon-link__instagram" aria-hidden="true" />
                </a>
              )}
              {sns.x && (
                <a href={sns.x} target="_blank" rel="noreferrer" className="ui-public-icon-link" aria-label="X"><span aria-hidden="true">X</span></a>
              )}
              {org.homepage_url && (
                <a href={org.homepage_url} target="_blank" rel="noreferrer" className="ui-public-text-link">
                  <span>Web</span><span>{externalHost(org.homepage_url)}</span>
                </a>
              )}
            </div>
          )}
        </section>

        {series.length > 0 && (
          <section className="ui-org-series-section">
            <div className="ui-org-archive-heading">
              <h2>継続している展覧会</h2>
            </div>
            <div className="ui-org-series-list">
              {series.map((item) => <SeriesCard key={item.id} series={item} org={org} />)}
            </div>
          </section>
        )}

        <section className="ui-org-timeline-section">
          <div className="ui-org-archive-heading">
            <h2>展覧会の記録</h2>
          </div>

          <div className="ui-org-archive-filters">
            <div role="group" aria-label="開催状態">
              {[
                ['all', 'すべて'],
                ['live', '開催中'],
                ['upcoming', 'これから'],
                ['ended', '終了'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={statusFilter === value ? 'is-active' : ''}
                  aria-pressed={statusFilter === value}
                  onClick={() => { setStatusFilter(value); setSelectedYear(null) }}
                >
                  {label}
                </button>
              ))}
            </div>
            {availableDisciplines.length > 0 && (
              <label>
                <span className="ui-sr-only">分野</span>
                <select value={selectedDiscipline} onChange={(event) => { setSelectedDiscipline(event.target.value); setSelectedYear(null) }}>
                  <option value="all">すべての分野</option>
                  {availableDisciplines.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
                </select>
              </label>
            )}
          </div>

          {yearGroups.length > 0 ? (
            <div className="ui-org-timeline-layout">
              <nav className="ui-org-year-rail" aria-label="開催年">
                <button type="button" className={selectedYear == null ? 'is-active' : ''} aria-pressed={selectedYear == null} onClick={() => setSelectedYear(null)}>すべて</button>
                {yearGroups.map(([year]) => (
                  <button key={year} type="button" className={String(selectedYear) === String(year) ? 'is-active' : ''} aria-pressed={String(selectedYear) === String(year)} onClick={() => setSelectedYear(year)}>
                    <strong>{year}</strong>
                  </button>
                ))}
              </nav>
              <div className="ui-org-timeline-content">
                {visibleYearGroups.map(([year, items]) => (
                  <section key={year} className="ui-org-year-group">
                    <header>
                      <strong>{year}</strong>
                    </header>
                    <div className="ui-exhibition-list-grid">
                      {items.map((exhibition) => (
                        <ExhibitionListCard
                          key={exhibition.id}
                          exhibition={exhibition}
                          org={org}
                          showOrgName={false}
                          artworkCount={exhibition.artworkCount}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          ) : (
            <div className="ui-panel ui-discovery-empty">条件に合う展覧会はありません。</div>
          )}
        </section>
      </main>
      <BottomNav active="orgs" />
    </div>
  )
}
