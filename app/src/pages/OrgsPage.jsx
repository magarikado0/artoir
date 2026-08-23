import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import Header from '../components/Header'
import BottomNav from '../components/BottomNav'
import FavoriteButton from '../components/FavoriteButton'
import ArtworkMedia from '../components/ArtworkMedia'
import ArchiveLoading from '../components/ArchiveLoading'
import { getExhibitionThumbnailUrl, mapExhibitionListRow } from '../lib/exhibition'
import { getThumbnailUrl } from '../lib/imageUrl'
import { formatActiveYears, normalizeArchiveText, sortByStartDateDesc, updateArchiveParams } from '../lib/archive'

const loginForSetupState = { from: '/account/organizations/new' }
const SORT_OPTIONS = [
  { value: 'recent', label: '最近の活動' },
  { value: 'name', label: '名前順' },
  { value: 'count', label: '展覧会数' },
]

function OrganizationRow({ organization }) {
  const exhibitions = organization.exhibitions || []
  const latest = exhibitions[0]
  const thumbnail = latest ? getExhibitionThumbnailUrl(latest) : ''

  return (
    <article className="ui-archive-index-row">
      <Link to={`/${organization.slug}`} className="ui-archive-index-media" tabIndex={-1} aria-hidden="true">
        {thumbnail ? (
          <ArtworkMedia src={getThumbnailUrl(thumbnail, 360)} alt="" decorative loading="lazy" fit="cover" fillHeight />
        ) : (
          <span className="ui-archive-media-placeholder">{String(organization.name || '・').charAt(0)}</span>
        )}
      </Link>
      <div className="ui-archive-index-copy">
        <span className="ui-archive-index-kicker">{formatActiveYears(exhibitions)}</span>
        <h2><Link to={`/${organization.slug}`}>{organization.name}</Link></h2>
        {organization.description && <p>{organization.description}</p>}
        <div className="ui-archive-index-meta">
          <span>{exhibitions.length}件の展覧会</span>
          {latest && <Link to={`/${organization.slug}/exhibition/${latest.slug}`}>最新：{latest.title}</Link>}
        </div>
      </div>
      <FavoriteButton targetType="organization" targetId={organization.id} kind="bookmark" appearance="icon" className="ui-archive-row-favorite" />
    </article>
  )
}

export default function OrgsPage() {
  const { session } = useAuth()
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const sort = SORT_OPTIONS.some((option) => option.value === searchParams.get('sort')) ? searchParams.get('sort') : 'recent'

  function updateParams(updates, { replace = true } = {}) {
    setSearchParams((current) => updateArchiveParams(current, updates), { replace })
  }

  useEffect(() => {
    document.title = '団体アーカイブ | Artoir'
    return () => { document.title = 'Artoir' }
  }, [])

  useEffect(() => {
    async function load() {
      if (!supabase) return setLoading(false)
      try {
        const [{ data: orgRows, error: orgError }, { data: exhibitionRows, error: exhibitionError }] = await Promise.all([
          supabase.from('organizations').select('*').order('name'),
          supabase
            .from('exhibitions')
            .select('id, organization_id, title, slug, start_date, end_date, location, description, thumbnail_url, artworks!artworks_exhibition_id_fkey(image_url, order)')
            .eq('visibility', 'public')
            .not('organization_id', 'is', null)
            .order('start_date', { ascending: false }),
        ])
        if (orgError || exhibitionError) throw orgError || exhibitionError
        const byOrganization = new Map()
        for (const row of exhibitionRows || []) {
          const mapped = mapExhibitionListRow(row)
          if (!byOrganization.has(mapped.organization_id)) byOrganization.set(mapped.organization_id, [])
          byOrganization.get(mapped.organization_id).push(mapped)
        }
        setOrganizations((orgRows || []).map((organization) => ({
          ...organization,
          exhibitions: (byOrganization.get(organization.id) || []).sort(sortByStartDateDesc),
        })))
      } catch {
        setLoadError(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    const q = normalizeArchiveText(query)
    const result = organizations.filter((organization) => !q || normalizeArchiveText([
      organization.name,
      organization.description,
      ...organization.exhibitions.map((exhibition) => exhibition.title),
      ...organization.exhibitions.map((exhibition) => exhibition.location),
    ].filter(Boolean).join(' ')).includes(q))

    return result.sort((a, b) => {
      if (sort === 'name') return String(a.name || '').localeCompare(String(b.name || ''), 'ja')
      if (sort === 'count') return b.exhibitions.length - a.exhibitions.length || String(a.name || '').localeCompare(String(b.name || ''), 'ja')
      return String(b.exhibitions[0]?.start_date || '').localeCompare(String(a.exhibitions[0]?.start_date || '')) || String(a.name || '').localeCompare(String(b.name || ''), 'ja')
    })
  }, [organizations, query, sort])

  if (loading) return <ArchiveLoading rows={3} />

  return (
    <div className="ui-page-shell">
      <Header activeTab="orgs" />
      <main className="ui-app-main ui-archive-page">
        <header className="ui-archive-masthead">
          <div>
            <span className="ui-archive-eyebrow">Organization index</span>
            <h1>団体アーカイブ</h1>
            <p>団体の活動年と展覧会の記録から辿れます。</p>
          </div>
          <Link to={session ? '/account/organizations/new' : '/login'} state={session ? undefined : loginForSetupState} className="ui-archive-publish-link">
            団体ページを作る <span aria-hidden="true">↗</span>
          </Link>
        </header>

        <section className="ui-archive-search-panel" aria-label="団体を検索・並び替え">
          <label className="ui-archive-search">
            <span className="ui-sr-only">団体名、紹介文、展覧会を検索</span>
            <span aria-hidden="true">⌕</span>
            <input value={query} onChange={(event) => updateParams({ q: event.target.value })} placeholder="団体名、紹介文、展覧会を検索" />
          </label>
          <div className="ui-archive-filter-row" role="group" aria-label="並び順">
            {SORT_OPTIONS.map((option) => (
              <button type="button" key={option.value} className={sort === option.value ? 'is-active' : ''} aria-pressed={sort === option.value} onClick={() => updateParams({ sort: option.value === 'recent' ? null : option.value }, { replace: false })}>{option.label}</button>
            ))}
          </div>
        </section>

        <section className="ui-archive-results">
          <header className="ui-archive-results-head"><h2>団体</h2><span aria-live="polite">{filtered.length}件</span></header>
          {loadError ? (
            <div className="ui-archive-empty" role="alert"><strong>団体を読み込めませんでした</strong><span>接続を確認して、ページを再読み込みしてください。</span></div>
          ) : filtered.length > 0 ? (
            <div className="ui-archive-index-list">{filtered.map((organization) => <OrganizationRow key={organization.id} organization={organization} />)}</div>
          ) : (
            <div className="ui-archive-empty"><strong>団体が見つかりません</strong><span>団体名を短くして検索してください。</span><button type="button" onClick={() => setSearchParams({}, { replace: true })}>検索を解除</button></div>
          )}
        </section>
      </main>
      <BottomNav active="orgs" />
    </div>
  )
}
