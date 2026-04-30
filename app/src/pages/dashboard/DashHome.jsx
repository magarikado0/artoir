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
      <div style={{ padding: '36px 0 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `1px solid ${T.ink}` }}>
        <div>
          <div style={{ fontFamily: T.serif, fontSize: 32, letterSpacing: '0.01em', color: T.ink }}>{org?.name || orgSlug}</div>
        </div>
        <button onClick={() => navigate(`/${orgSlug}/dashboard/exhibitions/new`)} style={{ background: T.ink, color: T.paper, border: 'none', padding: '12px 20px', fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em', cursor: 'pointer' }}>
          ＋ 新しい展覧会を作成
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 48, padding: '32px 0 60px' }}>
        {/* exhibitions list */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
            <div style={{ fontFamily: T.serif, fontSize: 22, letterSpacing: '0.02em', color: T.ink }}>展覧会</div>
            <Link to={`/${orgSlug}/dashboard/exhibitions`} style={{ fontFamily: T.mono, fontSize: 10, color: T.inkMuted, letterSpacing: '0.14em', textDecoration: 'none' }}>MANAGE ALL →</Link>
          </div>
          <div style={{ borderTop: `1px solid ${T.ink}` }}>
            <div style={{ display: 'grid', gridTemplateColumns: '32px 56px 1fr 140px 120px 100px', gap: 14, padding: '10px 0', borderBottom: `0.5px solid ${T.ink}`, fontFamily: T.mono, fontSize: 9, letterSpacing: '0.14em', color: T.inkMuted }}>
              <span></span><span></span><span>タイトル</span><span>会期</span><span>STATUS</span><span style={{ textAlign: 'right' }}>操作</span>
            </div>
            {exhibitions.slice(0, 5).map((exh, i) => (
              <div key={exh.id} style={{ display: 'grid', gridTemplateColumns: '32px 56px 1fr 140px 120px 100px', gap: 14, padding: '16px 0', borderBottom: `0.5px solid ${T.line}`, alignItems: 'center' }}>
                <div style={{ fontFamily: T.mono, fontSize: 10, color: T.inkMuted }}>{pad2(i + 1)}</div>
                <div style={{ width: 48, height: 48, background: '#D9D6CE' }} />
                <div>
                  <div style={{ fontFamily: T.serif, fontSize: 15, letterSpacing: '0.02em', color: T.ink }}>{exh.title}</div>
                </div>
                <div style={{ fontFamily: T.mono, fontSize: 10, color: T.inkMuted, lineHeight: 1.5 }}>
                  {fmtDateDot(exh.start_date)}<br/>— {fmtDateDot(exh.end_date)}
                </div>
                <div><StatusBadge kind={exhStatus(exh)} /></div>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <Link to={`/${orgSlug}/dashboard/exhibitions/${exh.id}/artworks`} style={{ fontFamily: T.mono, fontSize: 10, padding: '4px 8px', border: `0.5px solid ${T.line}`, textDecoration: 'none', color: T.inkSoft }}>WORKS</Link>
                </div>
              </div>
            ))}
            {exhibitions.length === 0 && <div style={{ padding: '24px 0', fontFamily: T.mono, fontSize: 11, color: T.inkMuted }}>展覧会がまだありません</div>}
          </div>
        </div>

        {/* sidebar */}
        <div>
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: T.line }}>
              {[['EXHIBITS', pad2(exhibitions.length)], ['LIVE', pad2(liveCount)]].map(([k, v]) => (
                <div key={k} style={{ background: T.paper, padding: '14px 12px' }}>
                  <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '0.14em', color: T.inkMuted }}>{k}</div>
                  <div style={{ marginTop: 4, fontFamily: T.serif, fontSize: 22, color: T.ink }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          {[
            [`/${orgSlug}/dashboard/settings`, '団体設定'],
            [`/${orgSlug}`, '公開ページを確認'],
          ].map(([to, label, en]) => (
            <Link key={to} to={to} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 12px', border: `0.5px solid ${T.line}`, marginBottom: 6, textDecoration: 'none', background: T.card, color: T.ink }}>
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
      <div style={{ padding: '24px 16px 16px' }}>
        <div style={{ fontFamily: T.serif, fontSize: 22, lineHeight: 1.35, letterSpacing: '0.02em', color: T.ink }}>{org?.name || orgSlug}</div>
        {org?.description && <div style={{ marginTop: 6, fontSize: 12, color: T.inkSoft, lineHeight: 1.7 }}>{org.description.split('。')[0]}。</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: T.line, margin: '4px 16px 24px' }}>
        {[['EXHIBITS', pad2(exhibitions.length)], ['LIVE', pad2(liveCount)]].map(([k, v]) => (
          <div key={k} style={{ background: T.paper, padding: '14px 10px' }}>
            <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '0.16em', color: T.inkMuted }}>{k}</div>
            <div style={{ marginTop: 4, fontFamily: T.serif, fontSize: 22, letterSpacing: '0.02em', color: T.ink }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: '0 16px 20px' }}>
        <button onClick={() => navigate(`/${orgSlug}/dashboard/exhibitions/new`)} style={{ width: '100%', background: T.ink, color: T.paper, border: 'none', padding: '16px', fontFamily: T.sans, fontWeight: 500, fontSize: 13, letterSpacing: '0.14em', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>＋  新しい展覧会を作成</span>
          <span style={{ fontFamily: T.mono, fontSize: 12 }}>→</span>
        </button>
      </div>

      <div style={{ borderTop: `1px solid ${T.ink}` }}>
        <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', fontFamily: T.mono, fontSize: 9, letterSpacing: '0.14em', color: T.inkMuted, borderBottom: `0.5px solid ${T.ink}` }}>
          <span>YOUR EXHIBITIONS</span>
          <Link to={`/${orgSlug}/dashboard/exhibitions`} style={{ cursor: 'pointer', color: T.ink, textDecoration: 'none' }}>VIEW ALL →</Link>
        </div>
        {exhibitions.slice(0, 4).map((exh, i) => (
          <Link key={exh.id} to={`/${orgSlug}/dashboard/exhibitions/${exh.id}/edit`} style={{ padding: '14px 16px', borderBottom: `0.5px solid ${T.line}`, display: 'flex', gap: 12, cursor: 'pointer', textDecoration: 'none', color: T.ink }}>
            <div style={{ width: 32, fontFamily: T.mono, fontSize: 11, color: T.inkMuted, paddingTop: 2 }}>{pad2(i + 1)}</div>
            <div style={{ width: 52, height: 52, background: '#D9D6CE', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: T.serif, fontSize: 15, letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{exh.title}</div>
              <div style={{ marginTop: 3, fontFamily: T.mono, fontSize: 10, letterSpacing: '0.08em', color: T.inkMuted }}>{fmtDateDot(exh.start_date)} — {fmtDateDot(exh.end_date)}</div>
              <div style={{ marginTop: 4 }}><StatusBadge kind={exhStatus(exh)} /></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', fontFamily: T.mono, fontSize: 10, color: T.inkSoft }}>EDIT →</div>
          </Link>
        ))}
        {exhibitions.length === 0 && <div style={{ padding: '24px 16px', fontFamily: T.mono, fontSize: 11, color: T.inkMuted }}>展覧会がまだありません</div>}
      </div>
      <div style={{ height: 24 }} />
    </DashShell>
  )
}
