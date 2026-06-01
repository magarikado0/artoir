import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import DashShell, { StatusBadge } from '../../components/DashShell'
import LoadingFrames from '../../components/LoadingFrames'
import { useDelayedLoading } from '../../lib/useDelayedLoading'
import { exhStatus, getExhibitionThumbnailUrl, mapExhibitionListRow } from '../../lib/exhibition'
import { ExhibitionCardMedia } from '../../components/ExhibitionListCard'
import { T, fmtDateRangeShort } from '../../lib/tokens'
import { Icon } from '../../components/Header'
import { deleteExhibition } from '../../lib/deleteExhibition'

function DashExhibitionCard({ exh, orgSlug, navigate, onDelete, artworkCount }) {
  const status = exhStatus(exh)
  const thumbnailUrl = getExhibitionThumbnailUrl(exh)
  return (
    <div
      onClick={() => navigate(`/${orgSlug}/dashboard/exhibitions/${exh.id}/artworks`)}
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
  const { orgSlug } = useParams()
  const navigate = useNavigate()
  const [org, setOrg] = useState(null)
  const [exhibitions, setExhibitions] = useState([])
  const [loading, setLoading] = useState(true)
  const showLoader = useDelayedLoading(loading)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!supabase) return setLoading(false)
    async function load() {
      try {
        const { data: orgData } = await supabase.from('organizations').select('*').eq('slug', orgSlug).single()
        if (!orgData) return
        setOrg(orgData)
        const { data: exhData } = await supabase
          .from('exhibitions')
          .select('*, artworks(image_url, order)')
          .eq('org_id', orgData.id)
          .order('start_date', { ascending: false })
        setExhibitions((exhData || []).map(mapExhibitionListRow))
      } catch {
        /* unavailable */
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [orgSlug])

  if (showLoader) return (
    <div className="ui-page-shell" style={{ display: 'grid', placeItems: 'center' }}>
      <LoadingFrames />
    </div>
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

  return (
    <DashShell orgSlug={orgSlug} >
      <div className="ui-dashboard-list-head">
        <div className="ui-dashboard-list-head-copy">
          <div className="ui-dashboard-list-count">{exhibitions.length}件の展覧会</div>
          {org?.description && (
            <p className="ui-screen-subtitle">{org.description.split('。')[0]}</p>
          )}
        </div>
        <button onClick={() => navigate(`/${orgSlug}/dashboard/exhibitions/new`)} className="ui-pill-action ui-pill-action--accent">
          <Icon name="plus" size={18} />
          <span>展覧会を作成</span>
        </button>
      </div>

      {deleteTarget && (
        <div className="ui-app-card" style={{ padding: 14, marginBottom: 14, borderColor: T.accent }}>
          <div className="ui-kicker">CONFIRM DELETE</div>
          <div style={{ marginTop: 8, fontSize: 13 }}>「{deleteTarget.title || '（タイトルなし）'}」と登録済みの作品をすべて削除します。</div>
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
            orgSlug={orgSlug}
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
