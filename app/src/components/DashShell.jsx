import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { T } from '../lib/tokens'
import { useIsDesktop } from '../lib/useIsDesktop'
import { supabase } from '../lib/supabase'
import { BrandLockup } from './BrandMark'
import BottomNav from './BottomNav'
import Header, { Icon } from './Header'

function getRailActive(pathname, orgSlug) {
  if (pathname.includes('/dashboard/members')) return 'members'
  if (pathname.includes('/dashboard/settings')) return 'settings'
  if (pathname.startsWith(`/${orgSlug}/dashboard`)) return 'home'
  return null
}

function DashboardSubNav({ orgSlug, org }) {
  const { pathname } = useLocation()
  const active = getRailActive(pathname, orgSlug)
  const showMembers = org?.kind !== 'person'
  const items = [
    { key: 'home', to: `/${orgSlug}/dashboard`, label: '展覧会', icon: 'list' },
    { key: 'settings', to: `/${orgSlug}/dashboard/settings`, label: '設定', icon: 'user' },
    ...(showMembers ? [{ key: 'members', to: `/${orgSlug}/dashboard/members`, label: 'メンバー', icon: 'org' }] : []),
  ]
  return (
    <nav className="ui-dashboard-subnav" aria-label="Dashboard">
      {items.map(({ key, to, label, icon }) => (
        <Link
          key={key}
          to={to}
          className={`ui-dashboard-subnav-item ${active === key ? 'is-active' : ''}`}
          aria-label={label}
          aria-current={active === key ? 'page' : undefined}
        >
          <Icon name={icon} size={18} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  )
}

function DashOrgBar({ orgSlug, orgName }) {
  return (
    <div className="ui-dash-org-bar">
      <Link to={`/${orgSlug}/dashboard`} className="ui-dash-org-bar-link ui-dashboard-header-title">
        {orgName || orgSlug}
      </Link>
    </div>
  )
}

export default function DashShell({ children, orgSlug, crumbs = [] }) {
  const isDesktop = useIsDesktop()
  const [org, setOrg] = useState(null)

  useEffect(() => {
    if (!orgSlug || !supabase) return
    let cancelled = false
    async function load() {
      let { data, error } = await supabase.from('organizations').select('name, slug, kind').eq('slug', orgSlug).single()
      if (error) {
        const fallback = await supabase.from('organizations').select('name, slug').eq('slug', orgSlug).single()
        data = fallback.data
      }
      if (!cancelled && data) setOrg(data)
    }
    load()
    return () => { cancelled = true }
  }, [orgSlug])

  const orgName = org?.name || orgSlug
  const showSetupCrumbs = !orgSlug && crumbs.length > 0

  const orgContext = orgSlug ? (
    isDesktop ? (
      <DashOrgBar orgSlug={orgSlug} orgName={orgName} />
    ) : null
  ) : null

  if (isDesktop) return (
    <div className="ui-page-shell" style={{ color: T.ink, fontFamily: T.sans }}>
      <Header activeTab="account" />
      <main className="ui-app-main">
        {orgContext}
        {orgSlug && <DashboardSubNav orgSlug={orgSlug} org={org} />}
        {children}
      </main>
    </div>
  )

  return (
    <div className="ui-page-shell" style={{ color: T.ink, fontFamily: T.sans, paddingBottom: 92 }}>
      <div className="ui-mobile-topbar">
        {orgSlug ? (
          <Link
            to={`/${orgSlug}/dashboard`}
            className="ui-dash-mobile-org-title ui-dashboard-header-title"
            aria-label={`${orgName} のダッシュボード`}
          >
            {orgName}
          </Link>
        ) : (
          <Link to="/" className="ui-mobile-brand" aria-label="Artoir home">
            <BrandLockup />
          </Link>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link to="/account" className="ui-top-icon" aria-label="アカウント">
            <Icon name="user" size={18} />
          </Link>
        </div>
      </div>
      {showSetupCrumbs && (
        <div className="ui-mobile-crumbs">
          {crumbs.map((c, i) => <span key={i}>{i > 0 ? ' / ' : ''}{c}</span>)}
        </div>
      )}
      {orgSlug && <DashboardSubNav orgSlug={orgSlug} org={org} />}
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

export function StatusBadge({ kind, className = 'ui-status-badge' }) {
  const map = {
    live: { label: '開催中', color: T.paper, bg: T.accent },
    upcoming: { label: '予定', color: T.ink, bg: T.gold },
    ended: { label: '終了', color: T.inkMuted, bg: T.paperAlt, border: true },
  }
  const m = map[kind] || map.ended
  return (
    <span className={className} style={{ color: m.color, background: m.bg, borderColor: m.border ? T.lineSoft : 'transparent' }}>
      {m.label}
    </span>
  )
}
