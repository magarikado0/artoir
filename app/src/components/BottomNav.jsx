import { useNavigate } from 'react-router-dom'
import { T } from '../lib/tokens'
import { useIsDesktop } from '../lib/useIsDesktop'
import { useAccountDestination } from '../lib/useAccountDestination'
import { Icon } from './Header'

const ITEMS = [
  { key: 'top', label: '展覧会', icon: 'list', path: '/' },
  { key: 'orgs', label: '団体', icon: 'org', path: '/orgs' },
  { key: 'creators', label: '作家', icon: 'users', path: '/creators' },
  { key: 'account', label: 'アカウント', icon: 'user', path: '/account' },
]

export default function BottomNav({ active }) {
  const isDesktop = useIsDesktop()
  const navigate = useNavigate()
  const accountPath = useAccountDestination()

  if (isDesktop) return null

  return (
    <nav className="ui-bottom-nav" aria-label="Primary">
      {ITEMS.map((it) => {
        const on = active === it.key
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => navigate(it.key === 'account' ? accountPath : it.path)}
            className={`ui-bottom-item ${on ? 'is-active' : ''}`}
            style={{ color: on ? T.ink : T.inkMuted }}
          >
            <Icon name={it.icon} size={20} />
            <span>{it.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
