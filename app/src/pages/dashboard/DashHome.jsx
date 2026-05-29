import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import DashShell, { StatusBadge } from '../../components/DashShell'
import ArtworkMedia from '../../components/ArtworkMedia'
import { exhStatus, getExhibitionThumbnailUrl } from '../../lib/exhibition'
import { getThumbnailUrl } from '../../lib/imageUrl'
import ExhibitionFeeBadge from '../../components/ExhibitionFeeBadge'
import { T, fmtDateDot, pad2 } from '../../lib/tokens'
import { Icon } from '../../components/Header'
import { deleteExhibition } from '../../lib/deleteExhibition'

function DashExhibitionCard({ exh, orgSlug, navigate, onDelete }) {
  const status = exhStatus(exh)
  const placeholderBg = `linear-gradient(135deg, ${T.surfaceMuted}, ${T.mint} 58%, ${T.blush})`
  const thumbnailUrl = getExhibitionThumbnailUrl(exh)
  return (
    <div
      onClick={() => navigate(`/${orgSlug}/dashboard/exhibitions/${exh.id}/artworks`)}
      className="ui-list-card ui-exhibition-list-card"
      style={{ display: 'grid', gridTemplateColumns: '96px 1fr', gap: 12, padding: 10, cursor: 'pointer' }}
    >
      {thumbnailUrl ? (
        <ArtworkMedia
          src={getThumbnailUrl(thumbnailUrl, 96)}
          alt=""
          decorative
          loading="lazy"
          aspectRatio="1 / 1"
          fit="contain"
          wrapperStyle={{ width: 96, borderRadius: 7 }}
        />
      ) : (
        <div style={{ width: 96, aspectRatio: '1 / 1', borderRadius: 7, background: placeholderBg, boxShadow: `inset 0 -3px 0 ${T.gold}`, display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
          <span style={{ fontFamily: T.mono, fontSize: 11, color: T.inkMuted }}>{pad2((exh.title || '').length || 1)}</span>
        </div>
      )}
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '2px 0' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, flexWrap: 'wrap' }}>
            <StatusBadge kind={status} />
            <ExhibitionFeeBadge exhibition={exh} />
            <span style={{ fontFamily: T.mono, fontSize: 10, color: T.inkMuted }}>{fmtDateDot(exh.start_date)}</span>
          </div>
          <div style={{ fontFamily: T.serif, fontSize: 18, lineHeight: 1.35, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis' }}>{exh.title}</div>
        </div>
        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 11, color: T.inkSoft, alignItems: 'center' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exh.location || '会場未設定'}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(exh) }}
              style={{ border: 0, background: 'transparent', color: T.inkMuted, cursor: 'pointer', padding: '4px 6px', fontFamily: T.mono, fontSize: 10, letterSpacing: '0.08em' }}
            >
              削除
            </button>
            <span style={{ fontFamily: T.mono }}>→</span>
          </div>
        </div>
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
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!supabase) return setLoading(false)
    async function load() {
      try {
        const { data: orgData } = await supabase.from('organizations').select('*').eq('slug', orgSlug).single()
        if (!orgData) return
        setOrg(orgData)
        const { data: exhData } = await supabase.from('exhibitions').select('*').eq('org_id', orgData.id).order('start_date', { ascending: false })
        setExhibitions(exhData || [])
      } catch {
        /* unavailable */
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [orgSlug])

  if (loading) return (
    <div className="ui-page-shell" style={{ display: 'grid', placeItems: 'center' }}>
      <span style={{ fontFamily: T.mono, color: T.inkMuted, fontSize: 11 }}>...</span>
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
          <DashExhibitionCard key={exh.id} exh={exh} orgSlug={orgSlug} navigate={navigate} onDelete={setDeleteTarget} />
        ))}
        {exhibitions.length === 0 && <div className="ui-panel" style={{ gridColumn: '1 / -1', padding: 24, color: T.inkMuted, fontFamily: T.mono, fontSize: 11 }}>展覧会がまだありません</div>}
      </div>
    </DashShell>
  )
}
