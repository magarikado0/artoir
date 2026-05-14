import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import DashShell, { StatusBadge } from '../../components/DashShell'
import { exhStatus } from '../../lib/exhibitionStatus'
import { T, fmtDateDot, pad2 } from '../../lib/tokens'
import { Icon } from '../../components/Header'

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
    <DashShell orgSlug={orgSlug} crumbs={['HOME']}>
      <section className="ui-app-card" style={{ padding: 18, marginBottom: 14 }}>
        <div className="ui-kicker">SIGNED IN</div>
        <div className="ui-app-topline" style={{ marginTop: 8, marginBottom: 0 }}>
          <div>
            <h1 className="ui-screen-title">{org?.name || orgSlug}</h1>
            {org?.description && <p className="ui-screen-subtitle">{org.description.split('。')[0]}。</p>}
          </div>
          <button onClick={() => navigate(`/${orgSlug}/dashboard/exhibitions/new`)} className="ui-pill-action">
            <Icon name="plus" size={18} />
            <span>作成</span>
          </button>
        </div>
      </section>

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

      <div style={{ display: 'grid', gap: 10 }}>
        {exhibitions.map((exh, i) => {
          const status = exhStatus(exh)
          return (
            <div key={exh.id} onClick={() => navigate(`/${orgSlug}/dashboard/exhibitions/${exh.id}/edit`)} className="ui-list-card" style={{ padding: 12, display: 'grid', gridTemplateColumns: '58px 1fr auto', gap: 12, alignItems: 'center', cursor: 'pointer' }}>
              <div style={{ width: 58, height: 58, borderRadius: 8, background: T.surfaceMuted, display: 'grid', placeItems: 'center', fontFamily: T.mono, fontSize: 11, color: T.inkMuted }}>{pad2(i + 1)}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: T.serif, fontSize: 16, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exh.title}</div>
                <div style={{ marginTop: 4, fontFamily: T.mono, fontSize: 10, color: T.inkMuted }}>{fmtDateDot(exh.start_date)} — {fmtDateDot(exh.end_date)}</div>
                <div style={{ marginTop: 6 }}><StatusBadge kind={status} /></div>
              </div>
              <div style={{ display: 'grid', gap: 7, justifyItems: 'end', fontFamily: T.mono, fontSize: 10 }}>
                <Link to={`/${orgSlug}/dashboard/exhibitions/${exh.id}/artworks`} onClick={(e) => e.stopPropagation()} style={{ color: T.accent, textDecoration: 'none' }}>WORKS</Link>
                <span style={{ color: T.inkMuted }}>EDIT →</span>
              </div>
            </div>
          )
        })}
        {exhibitions.length === 0 && <div className="ui-panel" style={{ padding: 24, color: T.inkMuted, fontFamily: T.mono, fontSize: 11 }}>展覧会がまだありません</div>}
      </div>
    </DashShell>
  )
}
