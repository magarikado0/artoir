import { Link } from 'react-router-dom'
import { T } from '../lib/tokens'
import { useIsDesktop } from '../lib/useIsDesktop'
import BrandMark, { BrandLockup } from './BrandMark'
import BottomNav from './BottomNav'
import { Icon } from './Header'

function DashNav({ orgSlug }) {
  const items = [
    [`/${orgSlug}/dashboard`, 'Home', 'list'],
    [`/${orgSlug}/dashboard/exhibitions/new`, '展覧会作成', 'plus'],
    [`/${orgSlug}/dashboard/settings`, '団体設定', 'user'],
    [`/${orgSlug}`, '公開', 'org'],
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

function SetupNav() {
  const items = [
    ['/', 'Home', 'list'],
    ['/account', 'アカウント', 'user'],
  ]
  return (
    <aside className="ui-side-rail">
      <Link to="/" className="ui-rail-brand" aria-label="Artoir home"><BrandMark size="rail" /></Link>
      <nav className="ui-rail-nav" aria-label="Setup">
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
      {orgSlug ? <DashNav orgSlug={orgSlug} /> : <SetupNav />}
      <main className="ui-app-main">
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link to="/account" className="ui-top-icon" aria-label="アカウント">
            <Icon name="user" size={18} />
          </Link>
        </div>
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
    live: { label: '開催中', color: T.paper, bg: T.accent },
    upcoming: { label: '予定', color: T.ink, bg: T.gold },
    ended: { label: '終了', color: T.inkMuted, bg: T.paperAlt, border: true },
  }
  const m = map[kind] || map.ended
  return (
    <span className="ui-status-badge" style={{ color: m.color, background: m.bg, borderColor: m.border ? T.lineSoft : 'transparent' }}>
      {m.label}
    </span>
  )
}
