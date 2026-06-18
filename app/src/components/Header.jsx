import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { useIsDesktop } from '../lib/useIsDesktop'
import BrandMark, { BrandLockup } from './BrandMark'

const TABS = [
  { key: 'top', label: '展覧会', path: '/', icon: 'list' },
  { key: 'orgs', label: '団体', path: '/orgs', icon: 'org' },
  { key: 'account', label: 'アカウント', path: '/account', icon: 'user' },
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
  if (name === 'logout') return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15 18l-6-6 6-6M9 12h12M3 4v16" {...s} />
    </svg>
  )
  if (name === 'plus') return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" {...s} />
    </svg>
  )
  if (name === 'edit') return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20h5l10.5-10.5a2.1 2.1 0 0 0-3-3L6 17v3Z" {...s} />
      <path d="M14.5 8.5l3 3" {...s} />
    </svg>
  )
  if (name === 'back') return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15 18l-6-6 6-6M9 12h11" {...s} />
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
        <nav className="ui-rail-nav" aria-label="メインメニュー">
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
            <button onClick={handleLogout} className="ui-rail-mini" aria-label="ログアウト">
              <Icon name="logout" size={17} />
            </button>
          ) : (
            <Link to="/login" className="ui-rail-mini" aria-label="ログイン">
              <Icon name="login" size={17} />
            </Link>
          )}
        </div>
      </aside>
    )
  }

  return (
    <div className="ui-mobile-topbar">
      <Link to="/" className="ui-mobile-brand" aria-label="Artoir home">
        <BrandLockup />
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Link to="/account" className={`ui-top-icon ${activeTab === 'account' ? 'is-active' : ''}`} aria-label="アカウント">
          <Icon name="user" size={18} />
        </Link>
      </div>
    </div>
  )
}
