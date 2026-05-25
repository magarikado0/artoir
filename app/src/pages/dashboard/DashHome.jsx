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

function DashExhibitionCard({ exh, orgSlug, navigate }) {
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
          fit="cover"
          wrapperStyle={{ width: 96, borderRadius: 7, boxShadow: `inset 0 -3px 0 ${T.gold}` }}
          imageStyle={{ borderRadius: 7 }}
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
          <span style={{ fontFamily: T.mono, flexShrink: 0 }}>→</span>
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

  const liveCount = exhibitions.filter((e) => exhStatus(e) === 'live').length

  return (
    <DashShell orgSlug={orgSlug} >
      <div className="ui-app-topline">
        <div className="ui-hero-screen-heading">
          <h1 className="ui-screen-title">{org?.name || orgSlug}</h1>
          {org?.description && <p className="ui-screen-subtitle">{org.description.split('。')[0]}</p>}
        </div>
        <button onClick={() => navigate(`/${orgSlug}/dashboard/exhibitions/new`)} className="ui-pill-action">
          <Icon name="plus" size={18} />
          <span>展覧会作成</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 18 }}>
        {[
          ['EXHIBITS', pad2(exhibitions.length), T.ink],
          ['LIVE', pad2(liveCount), T.accent],
        ].map(([k, v, bg]) => (
          <div key={k} className="ui-app-card" style={{ padding: 16, background: bg, color: T.paper }}>
            <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.12em', opacity: 0.7 }}>{k}</div>
            <div style={{ marginTop: 6, fontFamily: T.serif, fontSize: 28 }}>{v}</div>
          </div>
        ))}
      </div>

      <div className="ui-app-topline">
        <div>
          <div className="ui-kicker">YOUR EXHIBITIONS</div>
          <div className="ui-screen-title" style={{ fontSize: 22 }}>展覧会管理</div>
        </div>
      </div>

      <div className="ui-exhibition-list-grid">
        {exhibitions.map((exh) => (
          <DashExhibitionCard key={exh.id} exh={exh} orgSlug={orgSlug} navigate={navigate} />
        ))}
        {exhibitions.length === 0 && <div className="ui-panel" style={{ gridColumn: '1 / -1', padding: 24, color: T.inkMuted, fontFamily: T.mono, fontSize: 11 }}>展覧会がまだありません</div>}
      </div>
    </DashShell>
  )
}
