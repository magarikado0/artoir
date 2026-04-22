import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { IS_DEV, demoOrgs, demoExhibitions } from '../lib/demoData'
import Header from '../components/Header'
import BottomNav from '../components/BottomNav'
import { T, fmtDateDot, pad2 } from '../lib/tokens'
import { useIsDesktop } from '../lib/useIsDesktop'
import { useAuth } from '../lib/auth'

export default function AllExhibitionsPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const { session } = useAuth()

  function handleCreate() {
    navigate(session ? '/account' : '/login')
  }

  useEffect(() => {
    async function load() {
      if (IS_DEV) {
        const orgMap = Object.fromEntries(demoOrgs.map((o) => [o.id, o]))
        setRows(demoExhibitions.map((exh) => ({ exhibition: exh, org: orgMap[exh.org_id] })))
        setLoading(false)
        return
      }
      if (!supabase) return setLoading(false)
      try {
        const { data } = await supabase
          .from('exhibitions')
          .select('*, organizations(id, name, slug)')
          .order('start_date', { ascending: false })
        setRows((data || []).map((exh) => {
          const { organizations: org, ...exhibition } = exh
          return { exhibition, org }
        }))
      } catch { /* unavailable */ } finally { setLoading(false) }
    }
    load()
  }, [])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.paper }}>
      <span style={{ fontFamily: T.mono, color: T.inkMuted, letterSpacing: '0.2em', fontSize: 11 }}>...</span>
    </div>
  )

  if (isDesktop) return <DesktopView rows={rows} handleCreate={handleCreate} />
  return <MobileView rows={rows} handleCreate={handleCreate} />
}

function DesktopView({ rows, handleCreate }) {
  return (
    <div style={{ background: T.paper, minHeight: '100vh' }}>
      <Header activeTab="top" />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px' }}>
        {/* page header */}
        <div style={{
          padding: '56px 0 32px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
          borderBottom: `1px solid ${T.ink}`,
        }}>
          <div>
            <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.inkMuted, marginBottom: 12 }}>
              CURRENT / UPCOMING · {new Date().getFullYear()}
            </div>
            <div style={{ fontFamily: T.serif, fontSize: 52, letterSpacing: '0.01em', lineHeight: 1.15, color: T.ink }}>
              展覧会一覧
            </div>
          </div>
          <div style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: '0.18em', color: T.inkMuted, paddingBottom: 6 }}>
            {pad2(rows.length)} EXHIBITIONS
          </div>
        </div>

        {/* filter row */}
        <div style={{ padding: '14px 0', display: 'flex', gap: 6, borderBottom: `0.5px solid ${T.line}` }}>
          {['ALL', 'OPEN NOW', 'UPCOMING'].map((f, i) => (
            <span key={f} style={{
              padding: '7px 14px',
              background: i === 0 ? T.ink : 'transparent',
              color: i === 0 ? T.paper : T.inkMuted,
              border: i === 0 ? `1px solid ${T.ink}` : `0.5px solid ${T.line}`,
              fontFamily: T.mono, fontSize: 10, letterSpacing: '0.14em',
              cursor: 'pointer', userSelect: 'none',
            }}>{f}</span>
          ))}
        </div>

        {/* table header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '44px 68px 1fr 220px 180px',
          padding: '10px 0', gap: 20, borderBottom: `0.5px solid ${T.ink}`,
          fontFamily: T.mono, fontSize: 9, letterSpacing: '0.16em', color: T.inkMuted,
        }}>
          <span>NO.</span>
          <span />
          <span>展覧会 · 団体</span>
          <span>会場</span>
          <span>会期</span>
        </div>

        {rows.map(({ exhibition: exh, org }, i) => (
          <Link
            key={exh.id}
            to={`/${org?.slug}/exhibition/${exh.slug}`}
            className="list-row"
            style={{
              display: 'grid', gridTemplateColumns: '44px 68px 1fr 220px 180px',
              padding: '16px 0', gap: 20, alignItems: 'center',
              borderBottom: `0.5px solid ${T.line}`,
              textDecoration: 'none', color: T.ink,
            }}
          >
            <div style={{ fontFamily: T.mono, fontSize: 11, color: T.inkMuted }}>{pad2(i + 1)}</div>
            <div style={{ width: 68, height: 51, background: '#D9D6CE', flexShrink: 0 }} />
            <div>
              <div style={{ fontFamily: T.serif, fontSize: 18, letterSpacing: '0.02em' }}>{exh.title}</div>
              <div style={{ marginTop: 3, fontSize: 12, color: T.inkSoft }}>{org?.name}</div>
            </div>
            <div style={{ fontSize: 12, color: T.inkSoft, lineHeight: 1.5 }}>{exh.location}</div>
            <div style={{ fontFamily: T.mono, fontSize: 11, color: T.ink, lineHeight: 1.6 }}>
              {fmtDateDot(exh.start_date)}<br />
              <span style={{ color: T.inkMuted }}>— {fmtDateDot(exh.end_date)}</span>
            </div>
          </Link>
        ))}

        {rows.length === 0 && (
          <div style={{ padding: '80px 0', fontFamily: T.mono, fontSize: 11, color: T.inkMuted, letterSpacing: '0.1em' }}>
            NO EXHIBITIONS YET
          </div>
        )}
      </div>

      {/* CTA */}
      <div style={{ maxWidth: 1200, margin: '80px auto 0', padding: '0 32px' }}>
        <div style={{
          padding: '52px 56px', background: T.ink, color: T.paper,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 48,
        }}>
          <div>
            <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)' }}>
              FOR ORGANIZATIONS
            </div>
            <div style={{ marginTop: 14, fontFamily: T.serif, fontSize: 34, lineHeight: 1.35 }}>
              展覧会を、そのまま記録に。
            </div>
            <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.85, color: 'rgba(255,255,255,0.65)', maxWidth: 480 }}>
              作品・会期・会場を登録するだけで、共有可能な展覧会ページが公開されます。
            </div>
          </div>
          <button
            onClick={handleCreate}
            className="btn-accent"
            style={{
              flexShrink: 0, background: T.accent, color: T.paper, border: 'none',
              padding: '16px 28px', fontFamily: T.sans, fontWeight: 500,
              fontSize: 13, letterSpacing: '0.1em', cursor: 'pointer',
            }}
          >
            自分の展覧会を作る  →
          </button>
        </div>
      </div>

      <DesktopFooter />
    </div>
  )
}

function MobileView({ rows, handleCreate }) {
  return (
    <div style={{ background: T.paper, minHeight: '100vh', paddingBottom: 80 }}>
      <Header activeTab="top" />

      <div style={{
        padding: '14px 16px', borderBottom: `0.5px solid ${T.line}`,
        display: 'flex', justifyContent: 'space-between',
        fontFamily: T.mono, fontSize: 10, letterSpacing: '0.12em', color: T.inkMuted,
      }}>
        <span>CURRENT / UPCOMING</span>
        <span>{pad2(rows.length)} EXH.</span>
      </div>

      {/* table header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '28px 52px 1fr 84px',
        padding: '10px 16px', borderBottom: `0.5px solid ${T.ink}`,
        fontFamily: T.mono, fontSize: 9, letterSpacing: '0.14em', color: T.inkMuted, gap: 10,
      }}>
        <span>NO.</span><span /><span>展覧会 · 団体</span><span style={{ textAlign: 'right' }}>会期</span>
      </div>

      {rows.map(({ exhibition: exh, org }, i) => (
        <Link
          key={exh.id}
          to={`/${org?.slug}/exhibition/${exh.slug}`}
          className="list-row"
          style={{
            display: 'grid', gridTemplateColumns: '28px 52px 1fr 84px', gap: 10,
            padding: '14px 16px', borderBottom: `0.5px solid ${T.line}`,
            alignItems: 'center', textDecoration: 'none', color: T.ink,
          }}
        >
          <div style={{ fontFamily: T.mono, fontSize: 10, color: T.inkMuted }}>{pad2(i + 1)}</div>
          <div style={{ width: 52, height: 52, background: '#D9D6CE', flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: T.serif, fontSize: 15, lineHeight: 1.3, letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{exh.title}</div>
            <div style={{ marginTop: 2, fontSize: 11, color: T.inkSoft, lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{org?.name}</div>
            {exh.location && <div style={{ marginTop: 2, fontSize: 10.5, color: T.inkMuted, lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{exh.location}</div>}
          </div>
          <div style={{ fontFamily: T.mono, fontSize: 10, color: T.ink, lineHeight: 1.5, textAlign: 'right' }}>
            <div>{exh.start_date ? fmtDateDot(exh.start_date).slice(5) : ''}</div>
            <div style={{ color: T.inkMuted }}>— {exh.end_date ? fmtDateDot(exh.end_date).slice(5) : ''}</div>
          </div>
        </Link>
      ))}

      {rows.length === 0 && (
        <div style={{ padding: '48px 16px', fontFamily: T.mono, fontSize: 11, color: T.inkMuted, letterSpacing: '0.1em' }}>NO EXHIBITIONS YET</div>
      )}

      <div style={{ margin: '36px 16px', padding: '32px 24px', background: T.ink, color: T.paper }}>
        <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)' }}>FOR ORGANIZATIONS</div>
        <div style={{ marginTop: 14, fontFamily: T.serif, fontSize: 26, lineHeight: 1.4 }}>展覧会を、<br />そのまま記録に。</div>
        <div style={{ marginTop: 12, fontSize: 12, lineHeight: 1.85, color: 'rgba(255,255,255,0.65)' }}>作品・会期・会場を登録するだけで、共有可能な展覧会ページが公開されます。</div>
        <button onClick={handleCreate} className="btn-accent" style={{ marginTop: 22, background: T.accent, color: T.paper, border: 'none', padding: '13px 20px', fontFamily: T.sans, fontWeight: 500, fontSize: 12, letterSpacing: '0.1em', cursor: 'pointer' }}>
          自分の展覧会を作る  →
        </button>
      </div>

      <div style={{ padding: '24px 16px 28px', borderTop: `1px solid ${T.ink}`, display: 'flex', justifyContent: 'space-between', fontFamily: T.mono, fontSize: 10, letterSpacing: '0.14em', color: T.inkMuted }}>
        <span>© Artoir {new Date().getFullYear()}</span>
        <Link to="/login" style={{ color: T.inkMuted, textDecoration: 'none' }}>LOGIN ↗</Link>
      </div>

      <BottomNav active="top" />
    </div>
  )
}

function DesktopFooter() {
  return (
    <div style={{ borderTop: `1px solid ${T.ink}`, marginTop: 80 }}>
      <div style={{
        maxWidth: 1200, margin: '0 auto', padding: '20px 32px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.inkMuted,
      }}>
        <span>© Artoir {new Date().getFullYear()}</span>
        <span>展覧会プラットフォーム</span>
      </div>
    </div>
  )
}
