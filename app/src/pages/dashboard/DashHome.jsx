import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import DashShell, { StatusBadge } from '../../components/DashShell'
import { exhStatus, getExhibitionThumbnailUrl, mapExhibitionListRow } from '../../lib/exhibition'
import { ExhibitionCardMedia } from '../../components/ExhibitionListCard'
import { T, fmtDateRangeShort } from '../../lib/tokens'
import { Icon } from '../../components/Header'
import { deleteExhibition } from '../../lib/deleteExhibition'
import { ensureProfileWorksExhibition } from '../../lib/profileWorks'
import { legacyProfileSlugFromOwnerSlug, profilePath } from '../../lib/profileRoutes'

function DashExhibitionCard({ exh, dashboardBase, navigate, onDelete, artworkCount }) {
  const status = exhStatus(exh)
  const thumbnailUrl = getExhibitionThumbnailUrl(exh)
  return (
    <div
      onClick={() => navigate(`${dashboardBase}/dashboard/exhibitions/${exh.id}/artworks`)}
      className="ui-list-card ui-exhibition-list-card"
      style={{ cursor: 'pointer' }}
    >
      <div className="ui-exhibition-list-card-body">
        <div className="ui-exhibition-list-card-meta">
          <StatusBadge kind={status} className="ui-exhibition-list-card-badge" />
        </div>
        <div className="ui-exhibition-list-card-content">
          <div className="ui-exhibition-list-card-title">{exh.title}</div>
          {exh.location?.trim() && (
            <div className="ui-exhibition-list-card-location">
              <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" className="ui-exhibition-list-card-pin">
                <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="12" cy="10" r="2.2" fill="#FFF9ED" />
              </svg>
              <span>{exh.location}</span>
            </div>
          )}
        </div>
        <div className="ui-exhibition-list-card-footer">
          <span className="ui-exhibition-list-card-date">{fmtDateRangeShort(exh.start_date, exh.end_date)}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {artworkCount != null && (
              <span className="ui-exhibition-list-card-count">作品 {artworkCount}点</span>
            )}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(exh) }}
              style={{ border: 0, background: 'transparent', color: T.inkMuted, cursor: 'pointer', padding: '2px 4px', fontFamily: T.mono, fontSize: 10, letterSpacing: '0.08em' }}
            >
              削除
            </button>
          </div>
        </div>
      </div>
      <div className="ui-exhibition-list-card-media">
        <ExhibitionCardMedia thumbnailUrl={thumbnailUrl} title={exh.title} />
      </div>
    </div>
  )
}

export default function DashHome() {
  const { orgSlug: routeOrgSlug, profileSlug: routeProfileSlug } = useParams()
  const navigate = useNavigate()
  const { session } = useAuth()
  const profileSlug = routeProfileSlug || legacyProfileSlugFromOwnerSlug(routeOrgSlug)
  const orgSlug = profileSlug ? undefined : routeOrgSlug
  const dashboardBase = profileSlug ? profilePath(profileSlug) : `/${orgSlug}`
  const [owner, setOwner] = useState(null)
  const [forbidden, setForbidden] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [exhibitions, setExhibitions] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!supabase) return setLoading(false)
    async function load() {
      try {
        const ownerQuery = profileSlug
          ? supabase.from('profiles').select('*').eq('slug', profileSlug).maybeSingle()
          : supabase.from('organizations').select('*').eq('slug', orgSlug).maybeSingle()
        const { data: ownerData } = await ownerQuery
        if (!ownerData) return
        if (profileSlug && ownerData.id !== session?.user?.id) {
          setForbidden(true)
          return
        }
        setOwner(ownerData)
        if (profileSlug) {
          const worksExhibition = await ensureProfileWorksExhibition(supabase, ownerData.id)
          navigate(`${dashboardBase}/dashboard/exhibitions/${worksExhibition.id}/artworks`, { replace: true })
          return
        }
        const { data: exhData } = await supabase
          .from('exhibitions')
          .select('*, artworks(image_url, order)')
          .eq(profileSlug ? 'profile_id' : 'organization_id', ownerData.id)
          .order('start_date', { ascending: false })
        setExhibitions((exhData || []).map(mapExhibitionListRow))
      } catch (error) {
        setLoadError(error?.message || '作品管理の準備に失敗しました。')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [dashboardBase, navigate, orgSlug, profileSlug, session])

  if (loading) return (
    <div className="ui-page-shell" style={{ display: 'grid', placeItems: 'center' }}>
      <span style={{ fontFamily: T.mono, color: T.inkMuted, fontSize: 11 }}>...</span>
    </div>
  )

  if (forbidden) return (
    <div className="ui-page-shell" style={{ display: 'grid', placeItems: 'center' }}>
      <p style={{ color: T.inkMuted, fontSize: 13 }}>このプロフィールの展示は管理できません</p>
    </div>
  )

  if (loadError) return (
    <DashShell orgSlug={orgSlug} profileSlug={profileSlug}>
      <div className="ui-app-card" style={{ padding: 18, borderColor: T.accent, color: T.accent }}>
        <div className="ui-kicker">読み込みエラー</div>
        <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.7 }}>{loadError}</div>
      </div>
    </DashShell>
  )

  async function handleDeleteExhibition() {
    if (!deleteTarget || !supabase) return
    setDeleting(true)
    try {
      const { error } = await deleteExhibition(supabase, deleteTarget.id)
      if (error) {
        window.alert(`削除に失敗しました: ${error.message}`)
        return
      }
      setExhibitions((prev) => prev.filter((e) => e.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (error) {
      window.alert(error?.message ? `削除に失敗しました: ${error.message}` : '削除に失敗しました。')
    } finally {
      setDeleting(false)
    }
  }

  const ownerDescription = owner?.description || owner?.bio

  return (
    <DashShell orgSlug={orgSlug} profileSlug={profileSlug}>
      <div className="ui-dashboard-list-head">
        <div className="ui-dashboard-list-head-copy">
          <div className="ui-dashboard-list-count">{exhibitions.length}件の展覧会</div>
          {ownerDescription && (
            <p className="ui-screen-subtitle">{ownerDescription.split('。')[0]}</p>
          )}
        </div>
        <button onClick={() => navigate(`${dashboardBase}/dashboard/exhibitions/new`)} className="ui-pill-action ui-pill-action--accent">
          <Icon name="plus" size={18} />
          <span>展覧会を作成</span>
        </button>
      </div>

      {deleteTarget && (
        <div className="ui-app-card" style={{ padding: 14, marginBottom: 14, borderColor: T.accent }}>
          <div className="ui-kicker">CONFIRM DELETE</div>
          <div style={{ marginTop: 8, fontSize: 13 }}>{deleteTarget.title?.trim() ? `「${deleteTarget.title}」と登録済みの作品をすべて削除します。` : 'この展覧会と登録済みの作品をすべて削除します。'}</div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleting} className="ui-pill-action" style={{ flex: 1, background: T.paperAlt, color: T.ink }}>CANCEL</button>
            <button type="button" onClick={handleDeleteExhibition} disabled={deleting} className="ui-pill-action" style={{ flex: 1, background: T.accent, opacity: deleting ? 0.6 : 1 }}>{deleting ? 'DELETING...' : 'DELETE'}</button>
          </div>
        </div>
      )}

      <div className="ui-exhibition-list-grid">
        {exhibitions.map((exh) => (
          <DashExhibitionCard
            key={exh.id}
            exh={exh}
            dashboardBase={dashboardBase}
            navigate={navigate}
            onDelete={setDeleteTarget}
            artworkCount={exh.artworkCount}
          />
        ))}
        {exhibitions.length === 0 && <div className="ui-panel" style={{ padding: 24, color: T.inkMuted, fontFamily: T.mono, fontSize: 11 }}>展覧会がまだありません</div>}
      </div>
    </DashShell>
  )
}
