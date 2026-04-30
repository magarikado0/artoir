import { Link } from 'react-router-dom'
import { T } from '../lib/tokens'
import { useIsDesktop } from '../lib/useIsDesktop'
import BottomNav from './BottomNav'

// Desktop top nav for dashboard (same as public but with DASHBOARD indicator)
function DashDesktopNav({ orgSlug }) {
  return (
    <div style={{ borderBottom: `1px solid ${T.ink}`, background: T.paper, position: 'sticky', top: 0, zIndex: 50 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', padding: '0 32px', height: 68, gap: 0 }}>
        <Link to="/" style={{ fontFamily: T.serif, fontSize: 20, letterSpacing: '-0.01em', fontWeight: 500, color: T.ink, textDecoration: 'none', marginRight: 40, flexShrink: 0 }}>
          Artoir<span style={{ color: T.accent }}>.</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent, display: 'inline-block' }} />
          <span style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em', color: T.ink }}>DASHBOARD</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link to={`/${orgSlug}`} style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: '0.12em', color: T.inkMuted, textDecoration: 'none' }}>PUBLIC ↗</Link>
        </div>
      </div>
    </div>
  )
}

export default function DashShell({ children, orgSlug, crumbs = [] }) {
  const isDesktop = useIsDesktop()

  if (isDesktop) return (
    <div style={{ background: T.paper, minHeight: '100vh', color: T.ink, fontFamily: T.sans }}>
      <DashDesktopNav orgSlug={orgSlug} />
      {crumbs.length > 0 && (
        <div style={{ borderBottom: `0.5px solid ${T.line}`, background: T.paper }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '10px 32px', fontFamily: T.mono, fontSize: 10, letterSpacing: '0.12em', color: T.inkMuted, display: 'flex', gap: 6 }}>
            {crumbs.map((c, i) => (
              <span key={i}>
                {i > 0 && <span style={{ marginRight: 6 }}>/</span>}
                <span style={{ color: i === crumbs.length - 1 ? T.ink : T.inkMuted }}>{c}</span>
              </span>
            ))}
          </div>
        </div>
      )}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px' }}>
        {children}
      </div>
    </div>
  )

  return (
    <div style={{ background: T.paper, minHeight: '100vh', color: T.ink, fontFamily: T.sans, paddingBottom: 80 }}>
      {/* mobile header */}
      <div style={{ padding: '18px 16px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${T.ink}`, background: T.paper, position: 'sticky', top: 0, zIndex: 50 }}>
        <Link to="/" style={{ fontFamily: T.serif, fontSize: 20, letterSpacing: '-0.01em', fontWeight: 500, color: T.ink, textDecoration: 'none' }}>
          Artoir<span style={{ color: T.accent }}>.</span>
        </Link>
        <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.14em', color: T.ink, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent, display: 'inline-block' }} />
          DASHBOARD
        </div>
      </div>
      {/* crumbs */}
      {crumbs.length > 0 && (
        <div style={{ padding: '10px 16px', borderBottom: `0.5px solid ${T.line}`, fontFamily: T.mono, fontSize: 10, letterSpacing: '0.12em', color: T.inkMuted, display: 'flex', gap: 6, overflowX: 'auto', whiteSpace: 'nowrap' }}>
          {crumbs.map((c, i) => (
            <span key={i}>
              {i > 0 && <span style={{ marginRight: 6 }}>/</span>}
              <span style={{ color: i === crumbs.length - 1 ? T.ink : T.inkMuted }}>{c}</span>
            </span>
          ))}
        </div>
      )}
      {children}
      <BottomNav active="account" />
    </div>
  )
}

// Shared form field component for dashboard forms
export function DashField({ label, value, onChange, placeholder, prefix, multiline, mono, warning, help, rightHint, type = 'text', readOnly }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '0.18em', color: T.inkMuted }}>{label.toUpperCase()}</div>
        {rightHint && <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '0.12em', color: T.inkMuted }}>{rightHint}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'stretch', border: `1px solid ${T.ink}`, background: readOnly ? T.lineSoft : T.card, minHeight: multiline ? 92 : 44 }}>
        {prefix && (
          <div style={{ padding: '12px 12px', background: T.lineSoft, fontFamily: T.mono, fontSize: 11, color: T.inkMuted, borderRight: `0.5px solid ${T.line}`, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>{prefix}</div>
        )}
        {multiline ? (
          <textarea
            value={value ?? ''}
            onChange={onChange ? (e) => onChange(e.target.value) : undefined}
            placeholder={placeholder}
            readOnly={readOnly}
            rows={4}
            style={{ flex: 1, padding: '12px 14px', fontFamily: mono ? T.mono : T.sans, fontSize: mono ? 12 : 13, lineHeight: 1.55, color: T.ink, border: 'none', outline: 'none', background: 'transparent', resize: 'vertical', minHeight: 92 }}
          />
        ) : (
          <input
            type={type}
            value={value ?? ''}
            onChange={onChange ? (e) => onChange(e.target.value) : undefined}
            placeholder={placeholder}
            readOnly={readOnly}
            style={{ flex: 1, padding: '12px 14px', fontFamily: mono ? T.mono : T.sans, fontSize: mono ? 12 : 13, lineHeight: 1.55, color: T.ink, border: 'none', outline: 'none', background: 'transparent' }}
          />
        )}
      </div>
      {warning && (
        <div style={{ marginTop: 6, display: 'flex', gap: 6, alignItems: 'flex-start', fontFamily: T.mono, fontSize: 10, color: T.accent, lineHeight: 1.5 }}>
          <span>⚠</span><span>{warning}</span>
        </div>
      )}
      {help && <div style={{ marginTop: 6, fontSize: 11, color: T.inkMuted, lineHeight: 1.5 }}>{help}</div>}
    </div>
  )
}

export function DashSectionLabel({ children }) {
  return (
    <div style={{ marginTop: 28, marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${T.ink}`, fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.ink }}>
      {children}
    </div>
  )
}

export function StatusBadge({ kind }) {
  const map = {
    live:      { label: 'LIVE',      color: T.accent,   bg: 'rgba(180,69,44,0.08)' },
    upcoming:  { label: 'UPCOMING',  color: T.ink,      bg: T.lineSoft },
    ended:     { label: 'ENDED',     color: T.inkMuted, bg: 'transparent', border: true },
  }
  const m = map[kind] || map.ended
  return (
    <span style={{ padding: '2px 6px', background: m.bg, color: m.color, border: m.border ? `0.5px solid ${T.inkMuted}` : 'none', letterSpacing: '0.16em', fontFamily: T.mono, fontSize: 9 }}>
      {m.label}
    </span>
  )
}
