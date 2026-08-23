import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Header from '../components/Header'
import BottomNav from '../components/BottomNav'
import ShareLinkButton from '../components/ShareLinkButton'
import PublicManageLink from '../components/PublicManageLink'
import { ExhibitionCardMedia } from '../components/ExhibitionListCard'
import ArchiveExhibitionRow from '../components/ArchiveExhibitionRow'
import ArchiveLoading from '../components/ArchiveLoading'
import { T, externalHost } from '../lib/tokens'
import { exhStatus, getExhibitionThumbnailUrl, mapExhibitionListRow } from '../lib/exhibition'
import {
  attachDiscoveryMetadata,
  buildSeriesPath,
  editionDisplay,
  groupExhibitionsByYear,
  loadDiscoveryMetadata,
} from '../lib/discoveryData'
import { legacyProfileSlugFromOwnerSlug, profilePath } from '../lib/profileRoutes'
import { formatActiveYears, uniqueProfilesFromArtworks, updateArchiveParams } from '../lib/archive'

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
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedYear = Number(searchParams.get('year'))
  const selectedYear = Number.isInteger(requestedYear) && requestedYear > 0 ? requestedYear : null
  const statusFilter = ['live', 'upcoming', 'ended'].includes(searchParams.get('status')) ? searchParams.get('status') : 'all'

  function updateParams(updates) {
    setSearchParams((current) => updateArchiveParams(current, updates), { replace: true })
  }

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
            .select('*, artworks!artworks_exhibition_id_fkey(id, image_url, order, artwork_creators(profile_id, is_visible, profiles(id, slug, display_name)))')
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
        const mapped = (exhibitionRows || []).map((item) => {
          const exhibition = attachDiscoveryMetadata(mapExhibitionListRow(item), metadata)
          return { ...exhibition, creators: uniqueProfilesFromArtworks(exhibition.artworks) }
        })
        setExhibitions(mapped)
        setSeries((seriesRows || []).map((item) => ({
          ...item,
          exhibitions: mapped.filter((exhibition) => exhibition.series_id === item.id),
        })).filter((item) => item.exhibitions.length > 0))
      } catch {
        setLoadError(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [legacyProfileSlug, navigate, orgSlug])

  const filteredExhibitions = useMemo(() => exhibitions.filter((exhibition) => {
    if (statusFilter !== 'all' && exhStatus(exhibition) !== statusFilter) return false
    return true
  }), [exhibitions, statusFilter])

  const yearGroups = useMemo(() => groupExhibitionsByYear(filteredExhibitions), [filteredExhibitions])
  const visibleYearGroups = selectedYear
    ? yearGroups.filter(([year]) => String(year) === String(selectedYear))
    : yearGroups
  const associatedCreators = useMemo(() => {
    const byId = new Map()
    for (const exhibition of exhibitions) {
      for (const creator of exhibition.creators || []) byId.set(creator.id, creator)
    }
    return [...byId.values()].sort((a, b) => String(a.display_name || '').localeCompare(String(b.display_name || ''), 'ja'))
  }, [exhibitions])

  if (loading) return <ArchiveLoading rows={3} />
  if (loadError) return (
    <div className="ui-page-shell"><Header activeTab="orgs" /><main className="ui-app-main"><div className="ui-archive-empty" role="alert"><strong>団体の記録を読み込めませんでした</strong><span>接続を確認して、ページを再読み込みしてください。</span></div></main></div>
  )
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
          <span className="ui-archive-eyebrow">Organization archive</span>
          <h1 className="ui-screen-title">{org.name}</h1>
          <div className="ui-archive-profile-stats" aria-label="団体の活動概要">
            <span>{formatActiveYears(exhibitions)}</span>
            <span>{exhibitions.length}件の展覧会</span>
          </div>
          {org.description && <p className="ui-archive-profile-description">{org.description}</p>}
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

        {associatedCreators.length > 0 && (
          <section className="ui-archive-related-people">
            <div className="ui-org-archive-heading"><h2>参加した作家</h2></div>
            <div>
              {associatedCreators.map((creator) => <Link key={creator.id} to={profilePath(creator.slug)}>{creator.display_name || creator.slug}</Link>)}
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
                  onClick={() => updateParams({ status: value, year: null })}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {yearGroups.length > 0 ? (
            <div className="ui-org-timeline-layout">
              <nav className="ui-org-year-rail" aria-label="開催年">
                <button type="button" className={selectedYear == null ? 'is-active' : ''} aria-pressed={selectedYear == null} onClick={() => updateParams({ year: null })}>すべて</button>
                {yearGroups.map(([year]) => (
                  <button key={year} type="button" className={String(selectedYear) === String(year) ? 'is-active' : ''} aria-pressed={String(selectedYear) === String(year)} onClick={() => updateParams({ year })}>
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
                        <ArchiveExhibitionRow
                          key={exhibition.id}
                          exhibition={exhibition}
                          org={org}
                          showOrgName={false}
                          creators={exhibition.creators}
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
