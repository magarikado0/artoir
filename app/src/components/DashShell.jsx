import { Link } from 'react-router-dom'
import { T } from '../lib/tokens'
import { useIsDesktop } from '../lib/useIsDesktop'
import BrandMark, { BrandLockup } from './BrandMark'
import BottomNav from './BottomNav'
import { Icon } from './Header'

function DashNav({ orgSlug }) {
  const items = [
    [`/${orgSlug}/dashboard`, 'Home', 'list'],
    [`/${orgSlug}/dashboard/exhibitions/new`, 'New', 'plus'],
    [`/${orgSlug}/dashboard/settings`, 'Settings', 'user'],
    [`/${orgSlug}`, 'Public', 'org'],
  ]
  return (
    <aside className="ui-side-rail">
      <Link to="/" className="ui-rail-brand" aria-label="Artoir home"><BrandMark size="rail" /></Link>
      <nav className="ui-rail-nav" aria-label="Dashboard">
        {items.map(([to, label, icon]) => (
          <Link key={to} to={to} className="ui-rail-item" aria-label={label}>
            <Icon name={icon} size={21} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  )
}

export default function DashShell({ children, orgSlug, crumbs = [] }) {
  const isDesktop = useIsDesktop()

  if (isDesktop) return (
    <div className="ui-page-shell" style={{ color: T.ink, fontFamily: T.sans }}>
      <DashNav orgSlug={orgSlug} />
      <main className="ui-app-main">
        <div className="ui-app-topline">
          <div className="ui-dashboard-header-title">
            <Link to="/" className="ui-header-brand" aria-label="Artoir home">
              <BrandLockup />
            </Link>
            <div className="ui-kicker">DASHBOARD</div>
            <div className="ui-crumbs">
              {crumbs.length > 0 ? crumbs.map((c, i) => (
                <span key={i}>{i > 0 ? ' / ' : ''}{c}</span>
              )) : <span>管理</span>}
            </div>
          </div>
          <Link to={`/${orgSlug}/dashboard/exhibitions/new`} className="ui-pill-action">
            <Icon name="plus" size={17} />
            <span>新規展覧会</span>
          </Link>
        </div>
        {children}
      </main>
    </div>
  )

  return (
    <div className="ui-page-shell" style={{ color: T.ink, fontFamily: T.sans, paddingBottom: 92 }}>
      <div className="ui-mobile-topbar">
        <Link to="/" className="ui-mobile-brand" aria-label="Artoir home">
          <BrandLockup />
        </Link>
      </div>
      {crumbs.length > 0 && (
        <div className="ui-mobile-crumbs">
          {crumbs.map((c, i) => <span key={i}>{i > 0 ? ' / ' : ''}{c}</span>)}
        </div>
      )}
      <main className="ui-app-main ui-dashboard-mobile-main">
        {children}
      </main>
      <BottomNav active="account" />
    </div>
  )
}

export function DashField({ label, value, onChange, placeholder, prefix, multiline, mono, warning, help, rightHint, type = 'text', readOnly, min, max }) {
  return (
    <div className="ui-form-field">
      <div className="ui-form-label-row">
        <div className="ui-form-label">{label.toUpperCase()}</div>
        {rightHint && <div className="ui-form-hint">{rightHint}</div>}
      </div>
      <div className="ui-input-wrap" data-readonly={readOnly ? 'true' : 'false'} data-multiline={multiline ? 'true' : 'false'}>
        {prefix && <div className="ui-input-prefix">{prefix}</div>}
        {multiline ? (
          <textarea
            value={value ?? ''}
            onChange={onChange ? (e) => onChange(e.target.value) : undefined}
            placeholder={placeholder}
            readOnly={readOnly}
            rows={4}
            style={{ fontFamily: mono ? T.mono : T.sans }}
          />
        ) : (
          <input
            type={type}
            value={value ?? ''}
            onChange={onChange ? (e) => onChange(e.target.value) : undefined}
            placeholder={placeholder}
            readOnly={readOnly}
            min={min}
            max={max}
            style={{ fontFamily: mono ? T.mono : T.sans }}
          />
        )}
      </div>
      {warning && <div className="ui-field-warning">{warning}</div>}
      {help && <div className="ui-field-help">{help}</div>}
    </div>
  )
}

export function DashSectionLabel({ children }) {
  return <div className="ui-section-label">{children}</div>
}

export function StatusBadge({ kind }) {
  const map = {
    live: { label: 'LIVE', color: T.paper, bg: T.accent },
    upcoming: { label: 'UPCOMING', color: T.ink, bg: T.gold },
    ended: { label: 'ENDED', color: T.inkMuted, bg: T.paperAlt, border: true },
  }
  const m = map[kind] || map.ended
  return (
    <span className="ui-status-badge" style={{ color: m.color, background: m.bg, borderColor: m.border ? T.lineSoft : 'transparent' }}>
      {m.label}
    </span>
  )
}
