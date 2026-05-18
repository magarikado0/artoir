import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { T } from '../lib/tokens'
import { useIsDesktop } from '../lib/useIsDesktop'
import BrandMark from './BrandMark'

const TABS = [
  { key: 'top', label: 'Exhibits', path: '/', icon: 'list' },
  { key: 'orgs', label: 'Orgs', path: '/orgs', icon: 'org' },
  { key: 'account', label: 'Account', path: '/account', icon: 'user' },
]

export function Icon({ name, size = 20 }) {
  const s = { stroke: 'currentColor', strokeWidth: 1.8, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }
  if (name === 'org') return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 21V8l8-4 8 4v13" {...s} />
      <path d="M9 21v-7h6v7M8 10h.01M12 10h.01M16 10h.01" {...s} />
    </svg>
  )
  if (name === 'user') return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="4" {...s} />
      <path d="M4 21c1.8-4 4.5-6 8-6s6.2 2 8 6" {...s} />
    </svg>
  )
  if (name === 'login') return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 18l6-6-6-6M15 12H3M21 4v16" {...s} />
    </svg>
  )
  if (name === 'plus') return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" {...s} />
    </svg>
  )
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 7h14M5 12h14M5 17h9" {...s} />
    </svg>
  )
}

export default function Header({ activeTab }) {
  const isDesktop = useIsDesktop()
  const { session } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    if (!supabase) return
    await supabase.auth.signOut()
    navigate('/')
  }

  if (isDesktop) {
    return (
      <aside className="ui-side-rail">
        <Link to="/" className="ui-rail-brand" aria-label="Artoir home">
          <BrandMark size="rail" />
        </Link>
        <nav className="ui-rail-nav" aria-label="Primary">
          {TABS.map((t) => {
            const on = activeTab === t.key
            return (
              <Link key={t.key} to={t.path} className={`ui-rail-item ${on ? 'is-active' : ''}`} aria-label={t.label}>
                <Icon name={t.icon} size={21} />
                <span>{t.label}</span>
              </Link>
            )
          })}
        </nav>
        <div className="ui-rail-bottom">
          {session ? (
            <button onClick={handleLogout} className="ui-rail-mini" aria-label="Sign out">OUT</button>
          ) : (
            <Link to="/login" className="ui-rail-mini" aria-label="Log in">
              <Icon name="login" size={17} />
            </Link>
          )}
        </div>
      </aside>
    )
  }

  return (
    <div className="ui-mobile-topbar">
      <Link to="/" style={{
        fontFamily: T.serif, fontSize: 19, letterSpacing: 0, fontWeight: 500,
        color: T.ink, textDecoration: 'none', lineHeight: 1.2,
      }}>
        Artoir<span style={{ color: T.accent }}>.</span>
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Link to="/account" className={`ui-top-icon ${activeTab === 'account' ? 'is-active' : ''}`} aria-label="アカウント">
          <Icon name="user" size={18} />
        </Link>
      </div>
    </div>
  )
}
