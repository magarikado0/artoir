import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Header from '../components/Header'
import BottomNav from '../components/BottomNav'
import CollectionCard from '../components/CollectionCard'
import { useFavorites } from '../lib/favoritesContext'
import { normalizeArtworkCreators } from '../lib/profile'
import { getExhibitionThumbnailUrl } from '../lib/exhibition'
import { profilePath, profileExhibitionPath } from '../lib/profileRoutes'
import { T } from '../lib/tokens'

const TABS = [
  { key: 'artwork', label: '作品' },
  { key: 'exhibition', label: '展覧会' },
  { key: 'group', label: '団体・作家' },
]

function exhibitionLink(exh) {
  if (!exh?.slug) return null
  if (exh.organizations?.slug) return `/${exh.organizations.slug}/exhibition/${exh.slug}`
  if (exh.profiles?.slug) return profileExhibitionPath(exh.profiles.slug, exh.slug)
  return null
}

// favorites の各エンティティを CollectionCard 用の記述子に変換する。
function buildArtworkItems(ids, rows) {
  const byId = new Map(rows.map((r) => [r.id, r]))
  return ids.map((id) => byId.get(id)).filter(Boolean).map((a) => {
    const exh = a.exhibitions
    const to = exh ? exhibitionLink(exh) : (a.profiles?.slug ? profilePath(a.profiles.slug) : null)
    const creators = normalizeArtworkCreators(a.artwork_creators)
    return {
      targetType: 'artwork',
      targetId: a.id,
      kind: 'like',
      to: to || '#',
      imageUrl: a.image_url,
      title: a.title,
      subtitle: creators.map((c) => c.profile.display_name).filter(Boolean).join('、'),
    }
  })
}

function buildExhibitionItems(ids, rows) {
  const byId = new Map(rows.map((r) => [r.id, r]))
  return ids.map((id) => byId.get(id)).filter(Boolean).map((e) => ({
    targetType: 'exhibition',
    targetId: e.id,
    kind: 'bookmark',
    to: exhibitionLink(e) || '#',
    imageUrl: getExhibitionThumbnailUrl(e),
    title: e.title,
    subtitle: e.organizations?.name || e.profiles?.display_name || '',
  }))
}

function buildGroupItems(orgIds, orgRows, profileIds, profileRows) {
  const orgById = new Map(orgRows.map((r) => [r.id, r]))
  const profById = new Map(profileRows.map((r) => [r.id, r]))
  const orgItems = orgIds.map((id) => orgById.get(id)).filter(Boolean).map((o) => ({
    targetType: 'organization',
    targetId: o.id,
    kind: 'bookmark',
    to: `/${o.slug}`,
    imageUrl: null,
    title: o.name,
    subtitle: o.kind === 'person' ? '作家' : '団体',
  }))
  const profItems = profileIds.map((id) => profById.get(id)).filter(Boolean).map((p) => ({
    targetType: 'profile',
    targetId: p.id,
    kind: 'bookmark',
    to: profilePath(p.slug),
    imageUrl: null,
    title: p.display_name,
    subtitle: '作家',
  }))
  return [...orgItems, ...profItems]
}

export default function CollectionPage() {
  const fav = useFavorites()
  const favLoaded = Boolean(fav?.loaded)
  const [items, setItems] = useState({ artwork: [], exhibition: [], group: [] })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('artwork')
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (!favLoaded || fetchedRef.current) return
    fetchedRef.current = true

    const ids = {
      artwork: [...(fav.favorites.artwork || [])],
      exhibition: [...(fav.favorites.exhibition || [])],
      organization: [...(fav.favorites.organization || [])],
      profile: [...(fav.favorites.profile || [])],
    }

    async function load() {
      if (!supabase) { setLoading(false); return }
      const q = (table, select, idList) => idList.length
        ? supabase.from(table).select(select).in('id', idList)
        : Promise.resolve({ data: [] })

      const [aw, exh, orgs, profs] = await Promise.all([
        q('artworks',
          'id, title, image_url, exhibition_id, profile_id, exhibitions(slug, organizations(slug), profiles(slug)), profiles(slug), artwork_creators(profile_id, display_order, profiles(id, slug, display_name))',
          ids.artwork),
        q('exhibitions',
          'id, title, slug, thumbnail_url, organization_id, profile_id, organizations(slug, name), profiles(slug, display_name), artworks(image_url, order)',
          ids.exhibition),
        q('organizations', 'id, name, slug, kind', ids.organization),
        q('profiles', 'id, display_name, slug', ids.profile),
      ])

      setItems({
        artwork: buildArtworkItems(ids.artwork, aw.data || []),
        exhibition: buildExhibitionItems(ids.exhibition, exh.data || []),
        group: buildGroupItems(ids.organization, orgs.data || [], ids.profile, profs.data || []),
      })
      setLoading(false)
    }
    load().catch(() => setLoading(false))
  }, [favLoaded, fav])

  // 一覧から「お気に入り解除」したら即座に消えるよう、最新の favorites で絞り込む。
  const visible = useMemo(() => {
    const keep = (it) => fav?.favorites?.[it.targetType]?.has(it.targetId)
    return {
      artwork: items.artwork.filter(keep),
      exhibition: items.exhibition.filter(keep),
      group: items.group.filter(keep),
    }
  }, [items, fav])

  const current = visible[activeTab] || []

  return (
    <div className="ui-page-shell">
      <Header activeTab="account" />
      <main className="ui-app-main">
        <div className="ui-app-topline">
          <Link to="/account" className="ui-back-link">← アカウント</Link>
        </div>

        <section style={{ marginBottom: 32 }}>
          <div className="ui-kicker" style={{ color: T.accent }}>MY LIST</div>
          <h1 className="ui-screen-title" style={{ marginTop: 8 }}>わたしのコレクション</h1>
          <p className="ui-screen-subtitle" style={{ marginTop: 12 }}>
            保存した作品・展覧会・公開ページがここに集まります。
          </p>

          <div className="ui-collection-tabs" role="tablist">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.key}
                className={`ui-collection-tab${activeTab === tab.key ? ' is-active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <span>{tab.label}</span>
                <span className="ui-collection-tab-count">{visible[tab.key].length}</span>
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <div style={{ minHeight: 200 }} />
        ) : current.length > 0 ? (
          <div className="ui-collection-grid">
            {current.map((it) => (
              <CollectionCard key={`${it.targetType}:${it.targetId}`} {...it} />
            ))}
          </div>
        ) : (
          <div className="ui-panel" style={{ textAlign: 'center', color: T.inkMuted, fontSize: 13 }}>
            まだ保存がありません
          </div>
        )}
      </main>
      <BottomNav active="account" />
    </div>
  )
}
