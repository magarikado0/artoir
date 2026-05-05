import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import DashShell, { StatusBadge } from '../../components/DashShell'
import { exhStatus } from '../../lib/exhibitionStatus'
import { T, fmtDateDot, pad2 } from '../../lib/tokens'
import { useIsDesktop } from '../../lib/useIsDesktop'

export default function DashHome() {
  const { orgSlug } = useParams()
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
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
      } catch { /* unavailable */ } finally { setLoading(false) }
    }
    load()
  }, [orgSlug])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.paper }}>
      <span style={{ fontFamily: T.mono, color: T.inkMuted, fontSize: 11 }}>...</span>
    </div>
  )

  const liveCount = exhibitions.filter((e) => exhStatus(e) === 'live').length

  if (isDesktop) return (
    <DashShell orgSlug={orgSlug} active="dash" crumbs={['DASHBOARD']}>
      <div className="ui-strong-panel" style={{ marginTop: 30, padding: '32px 34px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', background: T.card, border: `2px solid ${T.ink}`, boxShadow: `8px 8px 0 ${T.moss}` }}>
        <div>
          <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.accent, marginBottom: 8 }}>SIGNED IN AS · DASHBOARD</div>
          <div style={{ fontFamily: T.serif, fontSize: 44, lineHeight: 1.05, letterSpacing: '0.01em', color: T.ink }}>{org?.name || orgSlug}</div>
        </div>
        <button onClick={() => navigate(`/${orgSlug}/dashboard/exhibitions/new`)} className="ui-action" style={{ background: T.accent, color: T.paper, border: `2px solid ${T.ink}`, padding: '14px 20px', fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em', cursor: 'pointer' }}>
          ＋ 新しい展覧会を作成
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 48, padding: '32px 0 60px' }}>
        {/* exhibitions list */}
        <div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: T.serif, fontSize: 22, letterSpacing: '0.02em', color: T.ink }}>展覧会</div>
          </div>
          <div style={{ borderTop: `1px solid ${T.ink}` }}>
            <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr 140px 120px 100px', gap: 14, padding: '10px 0', borderBottom: `0.5px solid ${T.ink}`, fontFamily: T.mono, fontSize: 9, letterSpacing: '0.14em', color: T.inkMuted }}>
              <span></span><span>タイトル</span><span>会期</span><span>STATUS</span><span>EDIT</span>
            </div>
            {exhibitions.map((exh) => {
              const worksHref = `/${orgSlug}/dashboard/exhibitions/${exh.id}/artworks`
              const editHref = `/${orgSlug}/dashboard/exhibitions/${exh.id}/edit`
              return (
                <div key={exh.id} style={{ display: 'grid', gridTemplateColumns: '56px 1fr 140px 120px 100px', gap: 14, padding: '16px 0', borderBottom: `0.5px solid ${T.line}`, alignItems: 'center' }}>
                  <Link to={worksHref} aria-label={`${exh.title}の作品一覧へ`} style={{ display: 'block', width: 48, height: 48, background: '#D9D6CE' }} />
                  <Link to={worksHref} style={{ textDecoration: 'none' }}>
                    <div style={{ fontFamily: T.serif, fontSize: 15, letterSpacing: '0.02em', color: T.ink }}>{exh.title}</div>
                  </Link>
                  <div style={{ fontFamily: T.mono, fontSize: 10, color: T.inkMuted, lineHeight: 1.5 }}>
                    {fmtDateDot(exh.start_date)}<br/>— {fmtDateDot(exh.end_date)}
                  </div>
                  <div><StatusBadge kind={exhStatus(exh)} /></div>
                  <Link to={editHref} style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.1em', color: T.ink, textDecoration: 'none' }}>編集 →</Link>
                </div>
              )
            })}
            {exhibitions.length === 0 && <div style={{ padding: '24px 0', fontFamily: T.mono, fontSize: 11, color: T.inkMuted }}>展覧会がまだありません</div>}
          </div>
        </div>

        {/* sidebar */}
        <div>
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.inkMuted, marginBottom: 12 }}>OVERVIEW</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, background: T.line, border: `2px solid ${T.ink}` }}>
              {[['EXHIBITS', pad2(exhibitions.length), T.ink], ['LIVE', pad2(liveCount), T.slate]].map(([k, v, bg]) => (
                <div key={k} style={{ background: bg, color: T.paper, padding: '14px 12px' }}>
                  <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.58)' }}>{k}</div>
                  <div style={{ marginTop: 4, fontFamily: T.serif, fontSize: 22, color: T.paper }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          {[
            [`/${orgSlug}/dashboard/settings`, '団体設定'],
            [`/${orgSlug}`, '公開ページを確認'],
          ].map(([to, label, en]) => (
          <Link key={to} to={to} className="ui-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 12px', border: `2px solid ${T.ink}`, marginBottom: 8, textDecoration: 'none', background: T.card, color: T.ink }}>
              <span style={{ fontFamily: T.serif, fontSize: 14 }}>{label}</span>
              <span style={{ fontFamily: T.mono, fontSize: 10, color: T.inkMuted }}>{en}</span>
            </Link>
          ))}
        </div>
      </div>
    </DashShell>
  )

  // mobile
  return (
    <DashShell orgSlug={orgSlug} active="dash" crumbs={['DASHBOARD']}>
      <div style={{ margin: '18px 16px 16px', padding: '20px 16px', background: T.card, border: `2px solid ${T.ink}`, boxShadow: `8px 8px 0 ${T.moss}` }}>
        <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.accent, marginBottom: 10 }}>SIGNED IN AS</div>
        <div style={{ fontFamily: T.serif, fontSize: 28, lineHeight: 1.2, letterSpacing: '0.02em', color: T.ink }}>{org?.name || orgSlug}</div>
        {org?.description && <div style={{ marginTop: 6, fontSize: 12, color: T.inkSoft, lineHeight: 1.7 }}>{org.description.split('。')[0]}。</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, background: T.line, margin: '4px 16px 24px', border: `2px solid ${T.ink}` }}>
        {[['EXHIBITS', pad2(exhibitions.length), T.ink], ['LIVE', pad2(liveCount), T.slate]].map(([k, v, bg]) => (
          <div key={k} style={{ background: bg, color: T.paper, padding: '14px 10px' }}>
            <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '0.16em', color: 'rgba(255,249,233,0.68)' }}>{k}</div>
            <div style={{ marginTop: 4, fontFamily: T.serif, fontSize: 24, letterSpacing: '0.02em', color: T.paper }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: '0 16px 20px' }}>
        <button onClick={() => navigate(`/${orgSlug}/dashboard/exhibitions/new`)} className="ui-action" style={{ width: '100%', background: T.accent, color: T.paper, border: `2px solid ${T.ink}`, padding: '16px', fontFamily: T.sans, fontWeight: 500, fontSize: 13, letterSpacing: '0.14em', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>＋  新しい展覧会を作成</span>
          <span style={{ fontFamily: T.mono, fontSize: 12 }}>→</span>
        </button>
      </div>

      <div style={{ borderTop: `2px solid ${T.ink}` }}>
        <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', fontFamily: T.mono, fontSize: 9, letterSpacing: '0.14em', color: T.paper, background: T.ink, borderBottom: `2px solid ${T.ink}` }}>
          <span>YOUR EXHIBITIONS</span>
        </div>
        {exhibitions.slice(0, 4).map((exh, i) => (
          <Link key={exh.id} to={`/${orgSlug}/dashboard/exhibitions/${exh.id}/edit`} className="ui-row" style={{ padding: '14px 16px', borderBottom: `2px solid ${T.ink}`, display: 'flex', gap: 12, cursor: 'pointer', textDecoration: 'none', color: T.ink, background: i % 2 === 0 ? T.card : T.paperAlt }}>
            <div style={{ width: 32, fontFamily: T.mono, fontSize: 11, color: T.inkMuted, paddingTop: 2 }}>{pad2(i + 1)}</div>
            <div style={{ width: 52, height: 52, background: '#D9D6CE', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: T.serif, fontSize: 15, letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{exh.title}</div>
              <div style={{ marginTop: 3, fontFamily: T.mono, fontSize: 10, letterSpacing: '0.08em', color: T.inkMuted }}>{fmtDateDot(exh.start_date)} — {fmtDateDot(exh.end_date)}</div>
              <div style={{ marginTop: 4 }}><StatusBadge kind={exhStatus(exh)} /></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', fontFamily: T.mono, fontSize: 10, color: T.inkSoft }}>WORKS →</div>
          </Link>
        ))}
        {exhibitions.length === 0 && <div style={{ padding: '24px 16px', fontFamily: T.mono, fontSize: 11, color: T.inkMuted }}>展覧会がまだありません</div>}
      </div>
      <div style={{ height: 24 }} />
    </DashShell>
  )
}
