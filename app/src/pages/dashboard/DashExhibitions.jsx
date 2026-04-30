import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import DashShell, { StatusBadge } from '../../components/DashShell'
import { T, fmtDateDot, pad2 } from '../../lib/tokens'
import { exhStatus } from '../../lib/exhibitionStatus'
import { useIsDesktop } from '../../lib/useIsDesktop'

const FILTERS = ['ALL', 'LIVE', 'UPCOMING', 'ENDED']

export default function DashExhibitions() {
  const { orgSlug } = useParams()
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const [exhibitions, setExhibitions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')

  useEffect(() => {
    if (!supabase) return setLoading(false)
    async function load() {
      try {
        const { data: orgData } = await supabase.from('organizations').select('*').eq('slug', orgSlug).single()
        if (!orgData) return
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

  const filtered = filter === 'ALL' ? exhibitions : exhibitions.filter((e) => exhStatus(e).toUpperCase() === filter)

  const filterChips = (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {FILTERS.map((f) => (
        <span key={f} onClick={() => setFilter(f)} style={{
          padding: '6px 10px',
          background: filter === f ? T.ink : 'transparent',
          color: filter === f ? T.paper : T.inkSoft,
          border: filter === f ? 'none' : `0.5px solid ${T.line}`,
          fontFamily: T.mono, fontSize: 10, letterSpacing: '0.14em', cursor: 'pointer',
        }}>{f}</span>
      ))}
    </div>
  )

  if (isDesktop) return (
    <DashShell orgSlug={orgSlug} active="exs" crumbs={['DASHBOARD', 'EXHIBITIONS']}>
      <div style={{ padding: '36px 0 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `1px solid ${T.ink}` }}>
        <div>
          <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.inkMuted, marginBottom: 8 }}>ALL / {pad2(exhibitions.length)}</div>
          <div style={{ fontFamily: T.serif, fontSize: 32, letterSpacing: '0.01em', color: T.ink }}>展覧会</div>
        </div>
        <button onClick={() => navigate(`/${orgSlug}/dashboard/exhibitions/new`)} style={{ background: T.ink, color: T.paper, border: 'none', padding: '12px 20px', fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em', cursor: 'pointer' }}>
          ＋ 新規展覧会
        </button>
      </div>

      <div style={{ padding: '16px 0', borderBottom: `0.5px solid ${T.line}` }}>{filterChips}</div>

      <div style={{ borderTop: 'none' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '32px 56px 1fr 140px 120px 140px', gap: 14, padding: '10px 0', borderBottom: `0.5px solid ${T.ink}`, fontFamily: T.mono, fontSize: 9, letterSpacing: '0.14em', color: T.inkMuted }}>
          <span></span><span></span><span>タイトル</span><span>会期</span><span>STATUS</span><span style={{ textAlign: 'right' }}>操作</span>
        </div>
        {filtered.map((exh, i) => (
          <div key={exh.id} style={{ display: 'grid', gridTemplateColumns: '32px 56px 1fr 140px 120px 140px', gap: 14, padding: '18px 0', borderBottom: `0.5px solid ${T.line}`, alignItems: 'center' }}>
            <div style={{ fontFamily: T.mono, fontSize: 10, color: T.inkMuted }}>{pad2(i + 1)}</div>
            <div style={{ width: 48, height: 48, background: '#D9D6CE' }} />
            <div>
              <div style={{ fontFamily: T.serif, fontSize: 15, letterSpacing: '0.02em', color: T.ink }}>{exh.title}</div>
              {exh.location && <div style={{ marginTop: 2, fontSize: 11, color: T.inkSoft }}>{exh.location}</div>}
            </div>
            <div style={{ fontFamily: T.mono, fontSize: 10, color: T.inkMuted, lineHeight: 1.5 }}>
              {fmtDateDot(exh.start_date)}<br/>— {fmtDateDot(exh.end_date)}
            </div>
            <div><StatusBadge kind={exhStatus(exh)} /></div>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
              <Link to={`/${orgSlug}/dashboard/exhibitions/${exh.id}/artworks`} style={{ fontFamily: T.mono, fontSize: 10, padding: '4px 8px', border: `0.5px solid ${T.line}`, textDecoration: 'none', color: T.inkSoft }}>WORKS</Link>
              <a href={`/${orgSlug}/exhibition/${exh.slug}`} target="_blank" rel="noreferrer" style={{ fontFamily: T.mono, fontSize: 10, padding: '4px 8px', border: `0.5px solid ${T.line}`, textDecoration: 'none', color: T.inkSoft }}>↗</a>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div style={{ padding: '32px 0', fontFamily: T.mono, fontSize: 11, color: T.inkMuted }}>展覧会がありません</div>}
      </div>
      <div style={{ height: 60 }} />
    </DashShell>
  )

  // mobile
  return (
    <DashShell orgSlug={orgSlug} active="exs" crumbs={['DASHBOARD', 'EXHIBITIONS']}>
      <div style={{ padding: '20px 16px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.inkMuted }}>ALL / {pad2(exhibitions.length)}</div>
          <div style={{ marginTop: 6, fontFamily: T.serif, fontSize: 24, letterSpacing: '0.02em', color: T.ink }}>展覧会</div>
        </div>
        <button onClick={() => navigate(`/${orgSlug}/dashboard/exhibitions/new`)} style={{ background: T.ink, color: T.paper, border: 'none', padding: '10px 14px', fontFamily: T.mono, fontSize: 11, letterSpacing: '0.12em', cursor: 'pointer' }}>＋ 新規</button>
      </div>

      <div style={{ padding: '0 16px 12px', borderBottom: `1px solid ${T.ink}` }}>{filterChips}</div>

      {filtered.map((exh, i) => (
        <div key={exh.id} style={{ padding: '16px 16px', borderBottom: `0.5px solid ${T.line}` }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ width: 32, fontFamily: T.mono, fontSize: 11, color: T.inkMuted, paddingTop: 2 }}>{pad2(i + 1)}</div>
            <div style={{ width: 64, height: 64, background: '#D9D6CE', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: T.serif, fontSize: 16, letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: T.ink }}>{exh.title}</div>
              <div style={{ marginTop: 3, fontFamily: T.mono, fontSize: 10, letterSpacing: '0.08em', color: T.inkMuted }}>{fmtDateDot(exh.start_date)} — {fmtDateDot(exh.end_date)}</div>
              <div style={{ marginTop: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
                <StatusBadge kind={exhStatus(exh)} />
              </div>
            </div>
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 6, fontFamily: T.mono, fontSize: 10, letterSpacing: '0.12em' }}>
            <Link to={`/${orgSlug}/dashboard/exhibitions/${exh.id}/edit`} style={{ padding: '5px 10px', border: `0.5px solid ${T.ink}`, color: T.ink, textDecoration: 'none' }}>EDIT</Link>
            <Link to={`/${orgSlug}/dashboard/exhibitions/${exh.id}/artworks`} style={{ padding: '5px 10px', border: `0.5px solid ${T.line}`, color: T.inkSoft, textDecoration: 'none' }}>WORKS</Link>
            <a href={`/${orgSlug}/exhibition/${exh.slug}`} target="_blank" rel="noreferrer" style={{ padding: '5px 10px', border: `0.5px solid ${T.line}`, color: T.inkSoft, textDecoration: 'none', marginLeft: 'auto' }}>PREVIEW ↗</a>
          </div>
        </div>
      ))}
      {filtered.length === 0 && <div style={{ padding: '32px 16px', fontFamily: T.mono, fontSize: 11, color: T.inkMuted }}>展覧会がありません</div>}
      <div style={{ height: 40 }} />
    </DashShell>
  )
}
