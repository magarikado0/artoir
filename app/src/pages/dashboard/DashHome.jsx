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
import { legacyProfileSlugFromOwnerSlug, profilePath } from '../../lib/profileRoutes'

function DashExhibitionCard({ exh, dashboardBase, navigate, onDelete, artworkCount }) {
  const status = exhStatus(exh)
  const thumbnailUrl = getExhibitionThumbnailUrl(exh)
  return (
    <div
      onClick={() => navigate(`${dashboardBase}/dashboard/exhibitions/${exh.id}/artworks`, { state: { showExhibitionPageLoading: true } })}
      className="ui-list-card ui-exhibition-list-card"
      style={{ cursor: 'pointer' }}
    >
      <div className="ui-exhibition-list-card-media">
        <ExhibitionCardMedia thumbnailUrl={thumbnailUrl} title={exh.title} />
      </div>
      <div className="ui-exhibition-list-card-body">
        <div className="ui-exhibition-list-card-meta">
          <StatusBadge kind={status} className="ui-exhibition-list-card-badge" />
        </div>
        <div className="ui-exhibition-list-card-content">
          <div className="ui-exhibition-list-card-title">{exh.title}</div>
          {exh.location?.trim() && (
            <div className="ui-exhibition-list-card-location">
              <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true" className="ui-exhibition-list-card-pin">
                <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <circle cx="12" cy="10" r="2.4" fill="currentColor" />
              </svg>
              <span>{exh.location}</span>
            </div>
          )}
        </div>
        <div className="ui-exhibition-list-card-footer">
          <span className="ui-exhibition-list-card-date">{fmtDateRangeShort(exh.start_date, exh.end_date)}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {artworkCount != null && (
              <span className="ui-exhibition-list-card-count">{artworkCount} 作品</span>
            )}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(exh) }}
              style={{ border: 0, background: 'transparent', color: T.inkMuted, cursor: 'pointer', padding: '2px 4px', fontSize: 12 }}
            >
              削除
            </button>
          </div>
        </div>
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
          navigate('/account', { replace: true })
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

  if (forbidden) return (
    <div className="ui-page-shell" style={{ display: 'grid', placeItems: 'center' }}>
      <p style={{ color: T.inkMuted, fontSize: 13 }}>このプロフィールの展示は管理できません</p>
    </div>
  )

  if (loadError) return (
    <DashShell orgSlug={orgSlug} profileSlug={profileSlug}>
      <div className="ui-alert ui-alert--error">
        <div className="ui-kicker">読み込みエラー</div>
        <div className="ui-confirm-msg">{loadError}</div>
      </div>
    </DashShell>
  )

  if (loading) return (
    <DashShell orgSlug={orgSlug} profileSlug={profileSlug} />
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
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button onClick={() => navigate(`${dashboardBase}/dashboard/exhibitions/new`)} className="ui-pill-action ui-pill-action--accent">
            <Icon name="plus" size={18} />
            <span>展覧会を作成</span>
          </button>
        </div>
      </div>

      {deleteTarget && (
        <div className="ui-confirm" style={{ marginBottom: 16 }}>
          <div className="ui-kicker">削除の確認</div>
          <div className="ui-confirm-msg">{deleteTarget.title?.trim() ? `「${deleteTarget.title}」と登録済みの作品をすべて削除します。` : 'この展覧会と登録済みの作品をすべて削除します。'}</div>
          <div className="ui-btn-row" style={{ marginTop: 16 }}>
            <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleting} className="ui-btn ui-btn--ghost">キャンセル</button>
            <button type="button" onClick={handleDeleteExhibition} disabled={deleting} className="ui-btn ui-btn--danger">{deleting ? '削除中…' : '削除する'}</button>
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
        {exhibitions.length === 0 && <div className="ui-panel" style={{ color: T.inkMuted, fontSize: 13 }}>展覧会がまだありません</div>}
      </div>
    </DashShell>
  )
}
