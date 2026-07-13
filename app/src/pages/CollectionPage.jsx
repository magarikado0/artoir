import { useEffect, useMemo, useState } from 'react'
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
  { key: 'organization', label: '団体' },
  { key: 'profile', label: '作家' },
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
    const to = exh ? exhibitionLink(exh) : (a.owner_profile?.slug ? profilePath(a.owner_profile.slug) : null)
    const creators = normalizeArtworkCreators(a.artwork_creators)
    return {
      targetType: 'artwork',
      targetId: a.id,
      kind: 'bookmark',
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

function buildOrganizationItems(ids, rows) {
  const byId = new Map(rows.map((r) => [r.id, r]))
  return ids.map((id) => byId.get(id)).filter(Boolean).map((o) => ({
    targetType: 'organization',
    targetId: o.id,
    kind: 'bookmark',
    to: `/${o.slug}`,
    imageUrl: null,
    title: o.name,
    subtitle: '団体',
  }))
}

function buildProfileItems(ids, rows) {
  const byId = new Map(rows.map((r) => [r.id, r]))
  return ids.map((id) => byId.get(id)).filter(Boolean).map((p) => ({
    targetType: 'profile',
    targetId: p.id,
    kind: 'bookmark',
    to: profilePath(p.slug),
    imageUrl: null,
    title: p.display_name,
    subtitle: '作家',
  }))
}

export default function CollectionPage() {
  const fav = useFavorites()
  const favLoaded = Boolean(fav?.loaded)
  const [items, setItems] = useState({ artwork: [], exhibition: [], organization: [], profile: [] })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('artwork')

  // お気に入りの id 一覧。favorites の中身が変わったときだけ作り直す（pending 変化では作り直さない）。
  const idsByType = useMemo(() => ({
    artwork: [...(fav?.favorites?.artwork || [])],
    exhibition: [...(fav?.favorites?.exhibition || [])],
    organization: [...(fav?.favorites?.organization || [])],
    profile: [...(fav?.favorites?.profile || [])],
  }), [fav?.favorites])

  // お気に入り集合が変わるたびに詳細を取り直す（新規に追加した作品・作家もここで反映される）。
  useEffect(() => {
    if (!favLoaded) return undefined
    let active = true

    async function load() {
      if (!supabase) { setLoading(false); return }
      const q = (table, select, idList) => idList.length
        ? supabase.from(table).select(select).in('id', idList)
        : Promise.resolve({ data: [] })

      const [aw, exh, orgs, profs] = await Promise.all([
        q('artworks',
          // artworks→profiles は直接(profile_id)と artwork_creators 経由の 2 経路があり曖昧になるため、FK を明示する。
          'id, title, image_url, cover_image_id, gallery_image_id, artwork_images:artwork_images!artwork_images_artwork_id_fkey(*), exhibition_id, profile_id, exhibitions!artworks_exhibition_id_fkey(slug, organizations(slug), profiles!exhibitions_profile_id_fkey(slug)), owner_profile:profiles!artworks_profile_id_fkey(slug), artwork_creators(profile_id, display_order, profiles(id, slug, display_name))',
          idsByType.artwork),
        q('exhibitions',
          // exhibitions→profiles は直接(profile_id)と artworks 経由の 2 経路があり曖昧になるため、FK を明示する。
          'id, title, slug, thumbnail_url, organization_id, profile_id, organizations(slug, name), profiles!exhibitions_profile_id_fkey(slug, display_name), artworks!artworks_exhibition_id_fkey(image_url, order)',
          idsByType.exhibition),
        q('organizations', 'id, name, slug', idsByType.organization),
        q('profiles', 'id, display_name, slug', idsByType.profile),
      ])
      if (!active) return

      setItems({
        artwork: buildArtworkItems(idsByType.artwork, aw.data || []),
        exhibition: buildExhibitionItems(idsByType.exhibition, exh.data || []),
        organization: buildOrganizationItems(idsByType.organization, orgs.data || []),
        profile: buildProfileItems(idsByType.profile, profs.data || []),
      })
      setLoading(false)
    }
    load().catch(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [favLoaded, idsByType])

  // 一覧から「お気に入り解除」したら即座に消えるよう、最新の favorites で絞り込む。
  const favorites = fav?.favorites
  const visible = useMemo(() => {
    const keep = (it) => favorites?.[it.targetType]?.has(it.targetId)
    return {
      artwork: items.artwork.filter(keep),
      exhibition: items.exhibition.filter(keep),
      organization: items.organization.filter(keep),
      profile: items.profile.filter(keep),
    }
  }, [items, favorites])

  const current = visible[activeTab] || []

  return (
    <div className="ui-page-shell">
      <Header activeTab="collection" />
      <main className="ui-app-main">

        <section style={{ marginBottom: 32 }}>
          <h1 className="ui-screen-title" style={{ marginTop: 8 }}>コレクション</h1>

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
      <BottomNav active="collection" />
    </div>
  )
}
