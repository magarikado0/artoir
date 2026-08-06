import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Header from '../components/Header'
import BottomNav from '../components/BottomNav'
import ShareLinkButton from '../components/ShareLinkButton'
import ExhibitionListCard from '../components/ExhibitionListCard'
import { mapExhibitionListRow } from '../lib/exhibition'
import {
  attachDiscoveryMetadata,
  getConnection,
  getPrimaryDiscipline,
  loadDiscoveryMetadata,
} from '../lib/discoveryData'
import { profileExhibitionPath, profilePath } from '../lib/profileRoutes'

const RELATED_CANDIDATE_LIMIT = 48

function isSchemaUnavailable(error) {
  if (!error) return false
  return ['42P01', '42703', 'PGRST204', 'PGRST205'].includes(error.code)
}

function numericValue(value) {
  if (value === '' || value == null) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function editionYear(exhibition) {
  const storedYear = numericValue(exhibition?.edition_year)
  if (storedYear) return storedYear
  const dateYear = exhibition?.start_date ? new Date(exhibition.start_date).getFullYear() : null
  return Number.isFinite(dateYear) ? dateYear : null
}

function editionNumberText(exhibition) {
  const number = numericValue(exhibition?.edition_number)
  return number ? `第${number}回` : ''
}

function editionIdentity(exhibition) {
  return [editionYear(exhibition), editionNumberText(exhibition)].filter(Boolean).join('・')
}

function editionSortValue(exhibition) {
  const date = exhibition?.start_date ? new Date(exhibition.start_date).getTime() : Number.NaN
  if (Number.isFinite(date)) return date
  const year = editionYear(exhibition) || 0
  const number = numericValue(exhibition?.edition_number) || 0
  return (year * 1000) + number
}

function countCreators(artworks) {
  const creatorIds = new Set()
  for (const artwork of artworks || []) {
    for (const creator of artwork?.artwork_creators || []) {
      if (creator?.profile_id) creatorIds.add(creator.profile_id)
    }
  }
  return creatorIds.size
}

function mapSeriesExhibition(row) {
  const inferredParticipantCount = countCreators(row?.artworks)
  const exhibition = mapExhibitionListRow(row)
  return {
    ...exhibition,
    participantCount: numericValue(row?.participant_count) ?? inferredParticipantCount,
  }
}

function discoveryTerms(exhibitions) {
  const terms = new Map()
  for (const exhibition of exhibitions) {
    const values = [
      ...(exhibition.discovery?.disciplines || []),
      ...(exhibition.discovery?.tags || []),
    ]
    for (const value of values) {
      const key = value.slug || value.name
      if (key && value.name && !terms.has(key)) terms.set(key, value.name)
    }
  }
  return [...terms.values()]
}

function exhibitionPath(exhibition, owner) {
  if (!exhibition?.slug) return '#'
  if (owner?.type === 'profile') return profileExhibitionPath(owner.slug, exhibition.slug)
  return `/${owner?.slug || ''}/exhibition/${exhibition.slug}`
}

function relationOwner(row) {
  if (row?.organizations?.slug) {
    return {
      type: 'organization',
      id: row.organizations.id,
      name: row.organizations.name,
      slug: row.organizations.slug,
      record: row.organizations,
    }
  }
  if (row?.profiles?.slug) {
    return {
      type: 'profile',
      id: row.profiles.id,
      name: row.profiles.display_name,
      slug: row.profiles.slug,
      record: row.profiles,
    }
  }
  return null
}

function buildRelatedCandidates(rows, currentExhibitions, metadata) {
  if (!currentExhibitions.length) return []
  const currentIds = new Set(currentExhibitions.map((item) => item.id))
  const currentDisciplines = new Set(
    currentExhibitions
      .map(getPrimaryDiscipline)
      .filter(Boolean)
      .map((item) => item.slug),
  )

  return rows
    .filter((row) => !currentIds.has(row.id))
    .map((row) => {
      const owner = relationOwner(row)
      const exhibition = attachDiscoveryMetadata(mapSeriesExhibition(row), metadata)
      const connections = currentExhibitions
        .map((seed) => getConnection(seed, exhibition))
        .filter((connection) => connection && connection.kind !== 'wide')
        .sort((a, b) => b.score - a.score)
      const connection = connections[0]
      const primaryDiscipline = getPrimaryDiscipline(exhibition)
      return {
        exhibition,
        owner,
        connectionReason: connection?.reason || '',
        connectionKind: connection?.kind || '',
        score: connection?.score || 0,
        crossesDiscipline: Boolean(
          currentDisciplines.size > 0
          && primaryDiscipline?.slug
          && !currentDisciplines.has(primaryDiscipline.slug),
        ),
      }
    })
    .filter((item) => item.owner && item.connectionReason)
    .sort((a, b) => Number(b.crossesDiscipline) - Number(a.crossesDiscipline)
      || b.score - a.score
      || editionSortValue(b.exhibition) - editionSortValue(a.exhibition))
    .slice(0, 4)
}

function featuredEditions(exhibitions) {
  if (exhibitions.length <= 6) return exhibitions
  const featuredIds = new Set()
  exhibitions.slice(0, 3).forEach((item) => featuredIds.add(item.id))
  exhibitions.filter((item) => item.is_series_milestone).forEach((item) => featuredIds.add(item.id))
  featuredIds.add(exhibitions.at(-1).id)
  return exhibitions.filter((item) => featuredIds.has(item.id))
}

function EditionFacts({ exhibition }) {
  const workCount = exhibition.artworkCount || 0
  const participantCount = exhibition.participantCount || 0
  if (!workCount && !participantCount) return null

  return (
    <dl className="ui-series-edition-facts">
      {workCount > 0 && (
        <div className="ui-series-edition-fact">
          <dt>作品</dt>
          <dd>{workCount}点</dd>
        </div>
      )}
      {participantCount > 0 && (
        <div className="ui-series-edition-fact">
          <dt>参加作家</dt>
          <dd>{participantCount}人</dd>
        </div>
      )}
    </dl>
  )
}

function EditionNeighbours({ exhibition, previous, next, owner }) {
  if (!previous && !next) return null

  return (
    <nav className="ui-series-edition-neighbours" aria-label={`${editionIdentity(exhibition) || exhibition.title}の前後の開催`}>
      {previous ? (
        <Link className="ui-series-edition-neighbour is-previous" to={exhibitionPath(previous, owner)}>
          <span aria-hidden="true">←</span>
          <span>
            <small>前回</small>
            <strong>{editionIdentity(previous) || previous.title}</strong>
          </span>
        </Link>
      ) : <span />}
      {next && (
        <Link className="ui-series-edition-neighbour is-next" to={exhibitionPath(next, owner)}>
          <span>
            <small>次回</small>
            <strong>{editionIdentity(next) || next.title}</strong>
          </span>
          <span aria-hidden="true">→</span>
        </Link>
      )}
    </nav>
  )
}

function SeriesEditionCard({ exhibition, owner, previous, next, latest = false }) {
  const year = editionYear(exhibition)
  const numberText = editionNumberText(exhibition)

  return (
    <article
      id={`series-edition-${exhibition.id}`}
      className={`ui-series-edition${latest ? ' is-latest' : ''}${exhibition.is_series_milestone ? ' is-milestone' : ''}`}
    >
      <header className="ui-series-edition-heading">
        <div className="ui-series-edition-index">
          {year && <time dateTime={String(year)} className="ui-series-edition-year">{year}</time>}
          {numberText && <span className="ui-series-edition-number">{numberText}</span>}
        </div>
        <div className="ui-series-edition-labels">
          {latest && <span className="ui-series-edition-marker">最新回</span>}
          {exhibition.is_series_milestone && <span className="ui-series-edition-marker is-milestone">節目の開催</span>}
          {exhibition.edition_label && <span className="ui-series-edition-special">{exhibition.edition_label}</span>}
        </div>
      </header>

      <div className="ui-series-edition-card">
        <ExhibitionListCard
          exhibition={exhibition}
          org={owner.type === 'organization' ? owner.record : undefined}
          profile={owner.type === 'profile' ? owner.record : undefined}
          showOrgName={false}
          artworkCount={exhibition.artworkCount}
        />
        <EditionFacts exhibition={exhibition} />
      </div>

      <EditionNeighbours exhibition={exhibition} previous={previous} next={next} owner={owner} />
    </article>
  )
}

function PageMessage({ owner, title, children }) {
  return (
    <div className="ui-series-empty ui-panel" role="status">
      <p className="ui-series-empty-eyebrow">EXHIBITION SERIES</p>
      <h1 className="ui-series-empty-title">{title}</h1>
      {children && <p className="ui-series-empty-copy">{children}</p>}
      {owner && <Link className="ui-series-empty-link" to={owner.path}>{owner.name}へ戻る</Link>}
    </div>
  )
}

export default function ExhibitionSeriesPage() {
  const { orgSlug, profileSlug, seriesSlug } = useParams()
  const isProfile = Boolean(profileSlug)
  const requestKey = `${isProfile ? 'profile' : 'organization'}:${profileSlug || orgSlug || ''}:${seriesSlug || ''}`
  const [page, setPage] = useState({ requestKey: '', status: 'loading', owner: null, series: null, exhibitions: [], related: [] })
  const [expandedRoute, setExpandedRoute] = useState(null)
  const [compareSelection, setCompareSelection] = useState({ left: '', right: '' })
  const showAll = expandedRoute === requestKey

  useEffect(() => {
    let active = true

    async function load() {
      if (!supabase) {
        if (active) setPage((current) => ({ ...current, requestKey, status: 'unavailable' }))
        return
      }

      const ownerTable = isProfile ? 'profiles' : 'organizations'
      const ownerSlug = isProfile ? profileSlug : orgSlug
      const ownerNameField = isProfile ? 'display_name' : 'name'
      const ownerIdField = isProfile ? 'profile_id' : 'organization_id'
      const ownerResult = await supabase
        .from(ownerTable)
        .select('*')
        .eq('slug', ownerSlug)
        .maybeSingle()

      if (!active) return
      if (ownerResult.error || !ownerResult.data) {
        setPage({ requestKey, status: 'owner-not-found', owner: null, series: null, exhibitions: [], related: [] })
        return
      }

      const ownerRecord = ownerResult.data
      const owner = {
        type: isProfile ? 'profile' : 'organization',
        id: ownerRecord.id,
        slug: ownerRecord.slug,
        name: ownerRecord[ownerNameField],
        path: isProfile ? profilePath(ownerRecord.slug) : `/${ownerRecord.slug}`,
        record: ownerRecord,
      }

      const seriesResult = await supabase
        .from('exhibition_series')
        .select('*')
        .eq('slug', seriesSlug)
        .eq(ownerIdField, owner.id)
        .maybeSingle()

      if (!active) return
      if (seriesResult.error) {
        setPage((current) => ({
          ...current,
          requestKey,
          owner,
          status: isSchemaUnavailable(seriesResult.error) ? 'unavailable' : 'error',
        }))
        return
      }
      if (!seriesResult.data) {
        setPage({ requestKey, status: 'series-not-found', owner, series: null, exhibitions: [], related: [] })
        return
      }

      const series = seriesResult.data
      const exhibitionsResult = await supabase
        .from('exhibitions')
        .select('*, artworks!artworks_exhibition_id_fkey(image_url, order, artwork_creators(profile_id))')
        .eq('series_id', series.id)
        .eq('visibility', 'public')
        .order('start_date', { ascending: false })

      if (!active) return
      if (exhibitionsResult.error) {
        setPage({
          requestKey,
          status: isSchemaUnavailable(exhibitionsResult.error) ? 'unavailable' : 'error',
          owner,
          series,
          exhibitions: [],
          related: [],
        })
        return
      }

      const exhibitionRows = exhibitionsResult.data || []
      const exhibitionMetadata = await loadDiscoveryMetadata(supabase, exhibitionRows.map((item) => item.id))
      if (!active) return
      const exhibitions = exhibitionRows
        .map((row) => attachDiscoveryMetadata(mapSeriesExhibition(row), exhibitionMetadata))
        .sort((a, b) => editionSortValue(b) - editionSortValue(a))
      let related = []

      if (exhibitions.length > 0) {
        const relatedResult = await supabase
          .from('exhibitions')
          .select('*, organizations(id, name, slug), profiles!exhibitions_profile_id_fkey(id, display_name, slug), artworks!artworks_exhibition_id_fkey(image_url, order)')
          .eq('visibility', 'public')
          .order('start_date', { ascending: false })
          .limit(RELATED_CANDIDATE_LIMIT)

        if (active && !relatedResult.error) {
          const relatedRows = relatedResult.data || []
          const relatedMetadata = await loadDiscoveryMetadata(supabase, relatedRows.map((item) => item.id))
          if (!active) return
          related = buildRelatedCandidates(relatedRows, exhibitions, relatedMetadata)
        }
      }

      if (active) setPage({ requestKey, status: 'ready', owner, series, exhibitions, related })
    }

    load().catch(() => {
      if (active) setPage((current) => ({ ...current, requestKey, status: 'error' }))
    })

    return () => { active = false }
  }, [isProfile, orgSlug, profileSlug, requestKey, seriesSlug])

  const pageStatus = page.requestKey === requestKey ? page.status : 'loading'

  useEffect(() => {
    if (pageStatus !== 'ready') return undefined
    document.title = `${page.series.name} | Artoir`
    return () => { document.title = 'Artoir' }
  }, [page.series, pageStatus])

  const chronological = useMemo(
    () => [...page.exhibitions].sort((a, b) => editionSortValue(a) - editionSortValue(b)),
    [page.exhibitions],
  )
  const featured = useMemo(() => featuredEditions(page.exhibitions), [page.exhibitions])
  const expressionTerms = useMemo(
    () => discoveryTerms(page.exhibitions),
    [page.exhibitions],
  )
  const latest = page.exhibitions[0]
  const visibleHistory = (showAll ? page.exhibitions : featured).filter((item) => item.id !== latest?.id)
  const firstYear = numericValue(page.series?.start_year) || editionYear(chronological[0])
  const latestYear = editionYear(latest)
  const seriesSpan = firstYear && latestYear && firstYear !== latestYear
    ? `${firstYear} — ${latestYear}`
    : String(firstYear || latestYear || '')
  const activeTab = isProfile ? 'creators' : 'orgs'
  const compareLeft = page.exhibitions.find((item) => item.id === compareSelection.left) || page.exhibitions[0]
  const compareRight = page.exhibitions.find((item) => item.id === compareSelection.right)
    || page.exhibitions.at(-1)

  function revealTimelineEdition(event, exhibitionId) {
    const targetId = `series-edition-${exhibitionId}`
    if (document.getElementById(targetId)) return
    event.preventDefault()
    setExpandedRoute(requestKey)
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const target = document.getElementById(targetId)
        target?.scrollIntoView({ block: 'start' })
        window.history.replaceState(null, '', `#${targetId}`)
      })
    })
  }

  if (pageStatus === 'loading') return <div className="ui-page-shell" />

  if (pageStatus !== 'ready') {
    const messages = {
      unavailable: ['展覧会シリーズは準備中です', 'シリーズ機能の公開準備が整うまで、団体・作家ページから各展覧会をご覧ください。'],
      'owner-not-found': ['公開ページが見つかりません', 'URLが正しいか確認してください。'],
      'series-not-found': ['シリーズが見つかりません', 'このシリーズはまだ公開されていないか、URLが変更された可能性があります。'],
      error: ['シリーズを読み込めませんでした', '時間をおいて、もう一度お試しください。'],
    }
    const [title, copy] = messages[pageStatus] || messages.error
    return (
      <div className="ui-page-shell">
        <Header activeTab={activeTab} />
        <main className="ui-app-main ui-series-page">
          <PageMessage owner={page.owner} title={title}>{copy}</PageMessage>
        </main>
        <BottomNav active={activeTab} />
      </div>
    )
  }

  return (
    <div className="ui-page-shell">
      <Header activeTab={activeTab} />
      <main className="ui-app-main ui-series-page">
        <section className="ui-series-hero">
          <Link className="ui-series-owner-link" to={page.owner.path}>
            <span aria-hidden="true">←</span>
            <span>{page.owner.name}</span>
          </Link>
          <p className="ui-series-eyebrow">EXHIBITION SERIES</p>
          <div className="ui-series-title-row">
            <h1 className="ui-screen-title ui-series-title">{page.series.name}</h1>
            <ShareLinkButton />
          </div>
          {page.series.description && <p className="ui-screen-subtitle ui-series-description">{page.series.description}</p>}
          <dl className="ui-series-overview">
            {seriesSpan && (
              <div className="ui-series-overview-item">
                <dt>活動期間</dt>
                <dd>{seriesSpan}</dd>
              </div>
            )}
            <div className="ui-series-overview-item">
              <dt>公開回</dt>
              <dd>{page.exhibitions.length}回</dd>
            </div>
            {page.series.recurrence_label && (
              <div className="ui-series-overview-item">
                <dt>開催周期</dt>
                <dd>{page.series.recurrence_label}</dd>
              </div>
            )}
          </dl>
        </section>

        {latest ? (
          <section className="ui-series-latest" aria-labelledby="series-latest-title">
            <div className="ui-series-section-heading">
              <p className="ui-section-label">現在地</p>
              <h2 id="series-latest-title" className="ui-series-section-title">最新の開催</h2>
            </div>
            <SeriesEditionCard
              exhibition={latest}
              owner={page.owner}
              previous={page.exhibitions[1]}
              latest
            />
          </section>
        ) : (
          <PageMessage owner={page.owner} title="公開中の開催回はまだありません">
            このシリーズの展覧会が公開されると、ここから歴代の開催を辿れます。
          </PageMessage>
        )}

        {chronological.length > 0 && (
          <nav className="ui-series-timeline" aria-labelledby="series-timeline-title">
            <div className="ui-series-section-heading">
              <p className="ui-section-label">TIME RAIL</p>
              <h2 id="series-timeline-title" className="ui-series-section-title">時間のレール</h2>
              <p className="ui-series-section-copy">年または回次を選んで、その開催へ移動できます。</p>
            </div>
            <ol className="ui-series-timeline-list">
              {chronological.map((exhibition) => {
                const isLatest = exhibition.id === latest?.id
                return (
                  <li key={exhibition.id} className={`ui-series-timeline-item${isLatest ? ' is-current' : ''}`}>
                    <a
                      href={`#series-edition-${exhibition.id}`}
                      className="ui-series-timeline-link"
                      aria-current={isLatest ? 'true' : undefined}
                      aria-label={`${editionIdentity(exhibition) || exhibition.title}へ移動`}
                      onClick={(event) => revealTimelineEdition(event, exhibition.id)}
                    >
                      <span className="ui-series-timeline-dot" aria-hidden="true" />
                      <span className="ui-series-timeline-year">{editionYear(exhibition) || '年未設定'}</span>
                      {editionNumberText(exhibition) && (
                        <span className="ui-series-timeline-edition">{editionNumberText(exhibition)}</span>
                      )}
                    </a>
                  </li>
                )
              })}
            </ol>
          </nav>
        )}

        {visibleHistory.length > 0 && (
          <section className="ui-series-archive" aria-labelledby="series-archive-title">
            <div className="ui-series-section-heading ui-series-section-heading--with-action">
              <div>
                <p className="ui-section-label">ARCHIVE</p>
                <h2 id="series-archive-title" className="ui-series-section-title">歴代の開催</h2>
                {!showAll && page.exhibitions.length > featured.length && (
                  <p className="ui-series-section-copy">最近の3回、節目の回、最初の回を表示しています。</p>
                )}
              </div>
              {page.exhibitions.length > featured.length && (
                <button
                  type="button"
                  className="ui-series-archive-toggle"
                  aria-expanded={showAll}
                  onClick={() => setExpandedRoute((value) => value === requestKey ? null : requestKey)}
                >
                  {showAll ? '主な開催だけ見る' : `全${page.exhibitions.length}回を見る`}
                </button>
              )}
            </div>
            <div className="ui-series-archive-list">
              {visibleHistory.map((exhibition) => {
                const chronologicalIndex = chronological.findIndex((item) => item.id === exhibition.id)
                return (
                  <SeriesEditionCard
                    key={exhibition.id}
                    exhibition={exhibition}
                    owner={page.owner}
                    previous={chronological[chronologicalIndex - 1]}
                    next={chronological[chronologicalIndex + 1]}
                  />
                )
              })}
            </div>
          </section>
        )}

        {page.exhibitions.length > 1 && compareLeft && compareRight && compareLeft.id !== compareRight.id && (
          <section className="ui-series-compare" aria-labelledby="series-compare-title">
            <div className="ui-series-section-heading">
              <p className="ui-section-label">COMPARE EDITIONS</p>
              <h2 id="series-compare-title" className="ui-series-section-title">開催回を見比べる</h2>
              <p className="ui-series-section-copy">二つの開催回を選び、代表作品や規模の変化を並べて見られます。</p>
            </div>
            <div className="ui-series-compare-controls">
              <label>
                <span>一つ目の開催</span>
                <select value={compareLeft.id} onChange={(event) => setCompareSelection((current) => ({ ...current, left: event.target.value }))}>
                  {page.exhibitions.filter((item) => item.id !== compareRight.id).map((item) => (
                    <option key={item.id} value={item.id}>{editionIdentity(item) || item.title}</option>
                  ))}
                </select>
              </label>
              <span aria-hidden="true">と</span>
              <label>
                <span>二つ目の開催</span>
                <select value={compareRight.id} onChange={(event) => setCompareSelection((current) => ({ ...current, right: event.target.value }))}>
                  {page.exhibitions.filter((item) => item.id !== compareLeft.id).map((item) => (
                    <option key={item.id} value={item.id}>{editionIdentity(item) || item.title}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="ui-series-compare-grid">
              {[compareLeft, compareRight].map((item) => (
                <article key={item.id}>
                  <div className="ui-series-compare-identity">
                    <strong>{editionIdentity(item) || item.title}</strong>
                    {item.edition_label && <span>{item.edition_label}</span>}
                  </div>
                  <ExhibitionListCard
                    exhibition={item}
                    org={page.owner.type === 'organization' ? page.owner.record : undefined}
                    profile={page.owner.type === 'profile' ? page.owner.record : undefined}
                    showOrgName={false}
                    artworkCount={item.artworkCount}
                  />
                  <EditionFacts exhibition={item} />
                </article>
              ))}
            </div>
          </section>
        )}

        {page.related.length > 0 && (
          <section className="ui-series-related" aria-labelledby="series-related-title">
            <div className="ui-series-section-heading">
              <p className="ui-section-label">ACROSS FIELDS</p>
              <h2 id="series-related-title" className="ui-series-section-title">表現から辿る</h2>
              <p className="ui-series-section-copy">時間を横に渡り、このシリーズと表現がつながる展覧会へ。</p>
              {expressionTerms.length > 0 && (
                <ul className="ui-series-related-terms" aria-label="このシリーズに多い表現">
                  {expressionTerms.slice(0, 6).map((term) => <li key={term}>{term}</li>)}
                </ul>
              )}
            </div>
            <div className="ui-series-related-grid">
              {page.related.map(({ exhibition, owner, connectionReason, connectionKind, crossesDiscipline }) => (
                <article key={exhibition.id} className={`ui-series-related-item${crossesDiscipline ? ' is-cross-discipline' : ''}`}>
                  {crossesDiscipline && <p className="ui-series-related-kind">別分野へひらく</p>}
                  <ExhibitionListCard
                    exhibition={exhibition}
                    org={owner.type === 'organization' ? owner.record : undefined}
                    profile={owner.type === 'profile' ? owner.record : undefined}
                    artworkCount={exhibition.artworkCount}
                    connectionReason={connectionReason}
                    connectionKind={connectionKind}
                  />
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
      <BottomNav active={activeTab} />
    </div>
  )
}
