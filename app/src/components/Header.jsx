import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useAccountDestination } from '../lib/useAccountDestination'
import { BrandLockup } from './BrandMark'

const TABS = [
  { key: 'top', label: '展覧会', path: '/exhibitions', icon: 'list' },
  { key: 'orgs', label: '団体', path: '/orgs', icon: 'org' },
  { key: 'creators', label: '作家', path: '/creators', icon: 'users' },
  { key: 'account', label: 'アカウント', path: '/account', icon: 'user' },
]

export function Icon({ name, size = 20 }) {
  const s = { stroke: 'currentColor', strokeWidth: 1.6, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }
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
  if (name === 'users') return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="8" r="3.2" {...s} />
      <path d="M3 20c1.3-3.2 3.4-4.8 6-4.8s4.7 1.6 6 4.8" {...s} />
      <path d="M16 5.2a3.2 3.2 0 0 1 0 6.1M18.5 20c-.5-1.6-1.3-2.9-2.4-3.8" {...s} />
    </svg>
  )
  if (name === 'bookmark') return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1z" {...s} />
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
  if (name === 'share') return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="6" cy="12" r="2.4" {...s} />
      <circle cx="18" cy="6" r="2.4" {...s} />
      <circle cx="18" cy="18" r="2.4" {...s} />
      <path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6" {...s} />
    </svg>
  )
  if (name === 'check') return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7" {...s} />
    </svg>
  )
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 7h14M5 12h14M5 17h9" {...s} />
    </svg>
  )
}

export default function Header({ activeTab }) {
  const { session } = useAuth()
  const accountPath = useAccountDestination()
  const brandPath = session ? '/exhibitions' : '/'

  return (
    <header className="ui-topbar">
      <Link to={brandPath} className="ui-topbar-brand" aria-label="Artoir">
        <BrandLockup />
      </Link>
      <nav className="ui-topbar-nav" aria-label="メインメニュー">
        {TABS.map((t) => (
          <Link
            key={t.key}
            to={t.key === 'account' ? accountPath : t.path}
            className={`ui-topbar-link ${activeTab === t.key ? 'is-active' : ''}`}
          >
            {t.label}
          </Link>
        ))}
        {session && (
          <Link
            to="/collection"
            className={`ui-topbar-link ${activeTab === 'collection' ? 'is-active' : ''}`}
          >
            コレクション
          </Link>
        )}
      </nav>
    </header>
  )
}
