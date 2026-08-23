import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Header from '../components/Header'
import BottomNav from '../components/BottomNav'
import FavoriteButton from '../components/FavoriteButton'
import ArtworkMedia from '../components/ArtworkMedia'
import ArchiveLoading from '../components/ArchiveLoading'
import { useAuth } from '../lib/auth'
import { getThumbnailUrl } from '../lib/imageUrl'
import { normalizeArchiveText, sortByStartDateDesc, updateArchiveParams } from '../lib/archive'
import { profilePath } from '../lib/profileRoutes'

const SORT_OPTIONS = [
  { value: 'recent', label: '最近の活動' },
  { value: 'name', label: '名前順' },
  { value: 'works', label: '作品数' },
]

function CreatorRow({ creator, isOwnProfile }) {
  const latest = creator.exhibitions[0]
  const latestOwner = latest?.organizations || latest?.profiles

  return (
    <article className="ui-archive-index-row ui-archive-creator-row">
      <Link to={profilePath(creator.slug)} className="ui-archive-index-media" tabIndex={-1} aria-hidden="true">
        {creator.thumbnail ? (
          <ArtworkMedia src={getThumbnailUrl(creator.thumbnail, 360)} alt="" decorative loading="lazy" fit="cover" fillHeight />
        ) : creator.avatar_url ? (
          <ArtworkMedia src={getThumbnailUrl(creator.avatar_url, 360)} alt="" decorative loading="lazy" fit="cover" fillHeight />
        ) : (
          <span className="ui-archive-media-placeholder">{String(creator.display_name || creator.slug || '・').charAt(0)}</span>
        )}
      </Link>
      <div className="ui-archive-index-copy">
        <span className="ui-archive-index-kicker">@{creator.slug}</span>
        <h2><Link to={profilePath(creator.slug)}>{creator.display_name || creator.slug}</Link></h2>
        {creator.bio && <p>{creator.bio}</p>}
        <div className="ui-archive-index-meta">
          <span>{creator.workCount}作品</span>
          <span>{creator.exhibitions.length}件の展覧会</span>
          {latest && (
            <Link to={latest.profiles?.slug ? `${profilePath(latest.profiles.slug)}/exhibition/${latest.slug}` : `/${latest.organizations?.slug || ''}/exhibition/${latest.slug}`}>
              最新：{latest.title}{latestOwner?.name || latestOwner?.display_name ? ` — ${latestOwner.name || latestOwner.display_name}` : ''}
            </Link>
          )}
        </div>
      </div>
      {!isOwnProfile && <FavoriteButton targetType="profile" targetId={creator.id} kind="bookmark" appearance="icon" className="ui-archive-row-favorite" />}
    </article>
  )
}

export default function CreatorsPage() {
  const { session } = useAuth()
  const [creators, setCreators] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const sort = SORT_OPTIONS.some((option) => option.value === searchParams.get('sort')) ? searchParams.get('sort') : 'recent'

  function updateParams(updates, { replace = true } = {}) {
    setSearchParams((current) => updateArchiveParams(current, updates), { replace })
  }

  useEffect(() => {
    document.title = '作家アーカイブ | Artoir'
    return () => { document.title = 'Artoir' }
  }, [])

  useEffect(() => {
    async function load() {
      if (!supabase) return setLoading(false)
      try {
        const [profilesResult, artworksResult, exhibitionsResult] = await Promise.all([
          supabase.from('profiles').select('id, slug, display_name, bio, avatar_url').order('display_name'),
          supabase.from('artworks').select('id, profile_id, image_url, exhibition_id, order, artwork_creators(profile_id, is_visible)').order('order'),
          supabase
            .from('exhibitions')
            .select('id, organization_id, profile_id, title, slug, start_date, end_date, visibility, organizations(id, name, slug), profiles(id, display_name, slug)')
            .eq('visibility', 'public')
            .order('start_date', { ascending: false }),
        ])
        const error = profilesResult.error || artworksResult.error || exhibitionsResult.error
        if (error) throw error

        const exhibitions = exhibitionsResult.data || []
        const exhibitionById = new Map(exhibitions.map((exhibition) => [exhibition.id, exhibition]))
        const stats = new Map((profilesResult.data || []).map((profile) => [profile.id, {
          ...profile,
          workIds: new Set(),
          exhibitions: new Map(),
          thumbnail: '',
        }]))

        for (const artwork of artworksResult.data || []) {
          const publicExhibition = exhibitionById.get(artwork.exhibition_id)
          const isDirectProfileWork = Boolean(artwork.profile_id && !artwork.exhibition_id)
          if (!isDirectProfileWork && !publicExhibition) continue
          const profileIds = new Set([
            artwork.profile_id,
            ...(artwork.artwork_creators || []).filter((link) => link.is_visible === true).map((link) => link.profile_id),
          ].filter(Boolean))
          for (const profileId of profileIds) {
            const item = stats.get(profileId)
            if (!item) continue
            item.workIds.add(artwork.id)
            if (!item.thumbnail && artwork.image_url) item.thumbnail = artwork.image_url
            if (publicExhibition) item.exhibitions.set(publicExhibition.id, publicExhibition)
          }
        }

        for (const exhibition of exhibitions) {
          const ownerProfile = stats.get(exhibition.profile_id)
          if (ownerProfile) ownerProfile.exhibitions.set(exhibition.id, exhibition)
        }

        setCreators([...stats.values()].map((creator) => ({
          ...creator,
          workCount: creator.workIds.size,
          exhibitions: [...creator.exhibitions.values()].sort(sortByStartDateDesc),
        })).filter((creator) => creator.slug && (creator.workCount > 0 || creator.exhibitions.length > 0)))
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
    const result = creators.filter((creator) => !q || normalizeArchiveText([
      creator.display_name,
      creator.slug,
      creator.bio,
      ...creator.exhibitions.map((exhibition) => exhibition.title),
      ...creator.exhibitions.map((exhibition) => exhibition.organizations?.name),
    ].filter(Boolean).join(' ')).includes(q))

    return result.sort((a, b) => {
      if (sort === 'name') return String(a.display_name || a.slug).localeCompare(String(b.display_name || b.slug), 'ja')
      if (sort === 'works') return b.workCount - a.workCount || String(a.display_name || a.slug).localeCompare(String(b.display_name || b.slug), 'ja')
      return String(b.exhibitions[0]?.start_date || '').localeCompare(String(a.exhibitions[0]?.start_date || '')) || String(a.display_name || a.slug).localeCompare(String(b.display_name || b.slug), 'ja')
    })
  }, [creators, query, sort])

  if (loading) return <ArchiveLoading />

  return (
    <div className="ui-page-shell">
      <Header activeTab="creators" />
      <main className="ui-app-main ui-archive-page">
        <header className="ui-archive-masthead">
          <div>
            <span className="ui-archive-eyebrow">Artist index</span>
            <h1>作家アーカイブ</h1>
            <p>作品と参加した展覧会の関係から作家を辿れます。</p>
          </div>
        </header>

        <section className="ui-archive-search-panel" aria-label="作家を検索・並び替え">
          <label className="ui-archive-search">
            <span className="ui-sr-only">作家名、プロフィール、展覧会を検索</span>
            <span aria-hidden="true">⌕</span>
            <input value={query} onChange={(event) => updateParams({ q: event.target.value })} placeholder="作家名、プロフィール、展覧会を検索" />
          </label>
          <div className="ui-archive-filter-row" role="group" aria-label="並び順">
            {SORT_OPTIONS.map((option) => (
              <button type="button" key={option.value} className={sort === option.value ? 'is-active' : ''} aria-pressed={sort === option.value} onClick={() => updateParams({ sort: option.value === 'recent' ? null : option.value }, { replace: false })}>{option.label}</button>
            ))}
          </div>
        </section>

        <section className="ui-archive-results">
          <header className="ui-archive-results-head"><h2>作家</h2><span aria-live="polite">{filtered.length}名</span></header>
          {loadError ? (
            <div className="ui-archive-empty" role="alert"><strong>作家を読み込めませんでした</strong><span>接続を確認して、ページを再読み込みしてください。</span></div>
          ) : filtered.length > 0 ? (
            <div className="ui-archive-index-list">{filtered.map((creator) => <CreatorRow key={creator.id} creator={creator} isOwnProfile={session?.user?.id === creator.id} />)}</div>
          ) : (
            <div className="ui-archive-empty"><strong>作家が見つかりません</strong><span>名前や展覧会名を短くして検索してください。</span><button type="button" onClick={() => setSearchParams({}, { replace: true })}>検索を解除</button></div>
          )}
        </section>
      </main>
      <BottomNav active="creators" />
    </div>
  )
}
