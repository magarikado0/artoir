import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { IS_DEV, demoOrgs, demoExhibitions } from '../lib/demoData'
import Header from '../components/Header'
import BottomNav from '../components/BottomNav'
import { T, fmtDateDot, pad2 } from '../lib/tokens'
import { useIsDesktop } from '../lib/useIsDesktop'
import { useAuth } from '../lib/auth'

const FILTERS = ['ALL', 'OPEN NOW', 'UPCOMING']

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function parseLocalDate(s) {
  if (!s) return null
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return new Date(s)
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

function filterRows(rows, filter) {
  if (filter === 'ALL') return rows
  const today = startOfToday()
  return rows.filter(({ exhibition: exh }) => {
    const start = parseLocalDate(exh.start_date)
    const end = parseLocalDate(exh.end_date)
    if (filter === 'OPEN NOW') {
      if (!start || !end) return false
      return start <= today && today <= end
    }
    if (filter === 'UPCOMING') {
      if (!start) return false
      return start > today
    }
    return true
  })
}

export default function AllExhibitionsPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
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

  const filteredRows = filterRows(rows, filter)

  if (isDesktop) return <DesktopView rows={filteredRows} filter={filter} setFilter={setFilter} navigate={navigate} handleCreate={handleCreate} />
  return <MobileView rows={filteredRows} filter={filter} setFilter={setFilter} navigate={navigate} handleCreate={handleCreate} />
}

function DesktopView({ rows, filter, setFilter, navigate, handleCreate }) {
  return (
    <div className="ui-page-shell" style={{ minHeight: '100vh' }}>
      <Header activeTab="top" />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px' }}>
        {/* page header */}
        <div className="ui-strong-panel" style={{
          marginTop: 28,
          padding: '36px 36px 32px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
          background: T.card,
          border: `2px solid ${T.ink}`,
          boxShadow: `8px 8px 0 ${T.gold}`,
        }}>
          <div>
            <div style={{
              fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em',
              color: T.accent, marginBottom: 8,
            }}>CURRENT / UPCOMING · {new Date().getFullYear()}</div>
            <div style={{ fontFamily: T.serif, fontSize: 54, letterSpacing: '0.01em', lineHeight: 1.05 }}>
              展覧会一覧
            </div>
          </div>
          <div style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: '0.18em', color: T.paper, background: T.ink, padding: '10px 12px' }}>
            {pad2(rows.length)} EXHIBITIONS
          </div>
        </div>

        {/* filter row */}
        <div style={{ padding: '16px 0', display: 'flex', gap: 6, borderBottom: `0.5px solid ${T.line}`, flexWrap: 'wrap' }}>
          {FILTERS.map((f) => {
            const active = filter === f
            return (
              <button key={f} type="button" onClick={() => setFilter(f)} style={{
                padding: '6px 12px',
                background: active ? T.ink : 'transparent',
                color: active ? T.paper : T.inkSoft,
                border: `0.5px solid ${active ? T.ink : T.line}`,
                fontFamily: T.mono, fontSize: 10, letterSpacing: '0.14em',
                cursor: 'pointer',
              }}>{f}</button>
            )
          })}
        </div>

        {/* table header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 260px 200px 80px',
          padding: '10px 0', gap: 20, borderBottom: `0.5px solid ${T.ink}`,
          fontFamily: T.mono, fontSize: 9, letterSpacing: '0.16em', color: T.inkMuted,
        }}>
          <span>展覧会 · 団体</span>
          <span>会場</span>
          <span>会期</span>
          <span style={{ textAlign: 'right' }}>作品数</span>
        </div>

        {rows.map(({ exhibition: exh, org }, i) => (
          <Link
            key={exh.id}
            to={`/${org?.slug}/exhibition/${exh.slug}`}
            className="ui-row"
            style={{
              display: 'grid', gridTemplateColumns: '1fr 260px 200px 80px',
              padding: '18px 0', gap: 20, alignItems: 'center',
              borderBottom: `0.5px solid ${T.line}`, cursor: 'pointer',
              textDecoration: 'none', color: T.ink,
              background: i % 2 === 0 ? T.card : T.paperAlt,
            }}
          >
            <div>
              <div style={{ fontFamily: T.serif, fontSize: 18, letterSpacing: '0.02em' }}>{exh.title}</div>
              <div style={{ marginTop: 3, fontSize: 12, color: T.inkSoft }}>{org?.name}</div>
            </div>
            <div style={{ fontSize: 12, color: T.inkSoft, lineHeight: 1.5 }}>{exh.location}</div>
            <div style={{ fontFamily: T.mono, fontSize: 11, color: T.ink, lineHeight: 1.6 }}>
              {fmtDateDot(exh.start_date)}<br/>
              <span style={{ color: T.inkMuted }}>— {fmtDateDot(exh.end_date)}</span>
            </div>
            <div style={{ fontFamily: T.mono, fontSize: 12, textAlign: 'right', color: T.inkMuted }}>
              —
            </div>
          </Link>
        ))}

        {rows.length === 0 && (
          <div style={{ padding: '60px 0', fontFamily: T.mono, fontSize: 11, color: T.inkMuted, letterSpacing: '0.1em' }}>
            NO EXHIBITIONS YET
          </div>
        )}
      </div>

      {/* CTA */}
      <div style={{ maxWidth: 1200, margin: '60px auto 0', padding: '0 32px' }}>
        <div className="ui-strong-panel" style={{
          padding: '42px 48px', background: T.ink, color: T.paper,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          border: `2px solid ${T.ink}`,
          boxShadow: `8px 8px 0 ${T.accent}`,
        }}>
          <div>
            <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.55)' }}>
              FOR ORGANIZATIONS
            </div>
            <div style={{ marginTop: 10, fontFamily: T.serif, fontSize: 28, lineHeight: 1.4 }}>
              展覧会を、そのまま記録に。
            </div>
            <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.8, color: 'rgba(255,255,255,0.7)', maxWidth: 480 }}>
              作品・会期・会場を登録するだけで、共有可能な展覧会ページが公開されます。
            </div>
          </div>
          <button
            onClick={handleCreate}
            style={{
              flexShrink: 0, background: T.gold, color: T.ink, border: `2px solid ${T.ink}`,
              padding: '14px 24px', fontFamily: T.sans, fontWeight: 500,
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

function MobileView({ rows, filter, setFilter, navigate, handleCreate }) {
  return (
    <div className="ui-page-shell" style={{ minHeight: '100vh', paddingBottom: 80 }}>
      <Header activeTab="top" />

      <div style={{
        padding: '14px 16px', borderBottom: `2px solid ${T.ink}`,
        background: T.card,
        display: 'flex', justifyContent: 'space-between',
        fontFamily: T.mono, fontSize: 10, letterSpacing: '0.12em', color: T.inkMuted,
      }}>
        <span>CURRENT / UPCOMING</span>
        <span>{pad2(rows.length)} EXH.</span>
      </div>

      <div style={{ padding: '12px 16px', display: 'flex', gap: 6, borderBottom: `0.5px solid ${T.line}`, flexWrap: 'wrap' }}>
        {FILTERS.map((f) => {
          const active = filter === f
          return (
            <button key={f} type="button" onClick={() => setFilter(f)} style={{
              padding: '6px 12px',
              background: active ? T.ink : 'transparent',
              color: active ? T.paper : T.inkSoft,
              border: `0.5px solid ${active ? T.ink : T.line}`,
              fontFamily: T.mono, fontSize: 10, letterSpacing: '0.14em',
              cursor: 'pointer',
            }}>{f}</button>
          )
        })}
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 100px',
        padding: '10px 16px', borderBottom: `0.5px solid ${T.ink}`,
        fontFamily: T.mono, fontSize: 9, letterSpacing: '0.14em', color: T.inkMuted, gap: 10,
      }}>
        <span>展覧会 · 団体</span><span style={{ textAlign: 'right' }}>会期</span>
      </div>

      {rows.map(({ exhibition: exh, org }, i) => (
        <Link
          key={exh.id}
          to={`/${org?.slug}/exhibition/${exh.slug}`}
          className="ui-row"
          style={{
            display: 'grid', gridTemplateColumns: '1fr 100px', gap: 10,
            padding: '16px 16px', borderBottom: `0.5px solid ${T.line}`,
            alignItems: 'start', textDecoration: 'none', color: T.ink,
            background: i % 2 === 0 ? T.card : T.paperAlt,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: T.serif, fontSize: 16, lineHeight: 1.3, letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{exh.title}</div>
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

      <div className="ui-strong-panel" style={{ margin: '32px 16px', padding: '28px 22px', background: T.ink, color: T.paper, border: `2px solid ${T.ink}`, boxShadow: `7px 7px 0 ${T.accent}` }}>
        <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.55)' }}>FOR ORGANIZATIONS</div>
        <div style={{ marginTop: 10, fontFamily: T.serif, fontSize: 22, lineHeight: 1.4 }}>展覧会を、<br/>そのまま記録に。</div>
        <div style={{ marginTop: 10, fontSize: 12, lineHeight: 1.8, color: 'rgba(255,255,255,0.7)' }}>作品・会期・会場を登録するだけで、共有可能な展覧会ページが公開されます。</div>
        <button onClick={handleCreate} className="ui-action" style={{ marginTop: 20, background: T.gold, color: T.ink, border: `2px solid ${T.ink}`, padding: '12px 18px', fontFamily: T.sans, fontWeight: 500, fontSize: 12, letterSpacing: '0.1em', cursor: 'pointer' }}>
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
        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16,
        fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.inkMuted,
      }}>
        <span>© Artoir {new Date().getFullYear()}</span>
        <span>展覧会プラットフォーム</span>
        <span>Artoir(アルトワール)</span>
      </div>
    </div>
  )
}
