import { useNavigate } from 'react-router-dom'
import { T } from '../lib/tokens'
import { useIsDesktop } from '../lib/useIsDesktop'
import { Icon } from './Header'

const ITEMS = [
  { key: 'top', label: '展覧会', icon: 'list', path: '/' },
  { key: 'orgs', label: '団体', icon: 'org', path: '/orgs' },
  { key: 'account', label: 'アカウント', icon: 'user', path: '/account' },
]

export default function BottomNav({ active }) {
  const isDesktop = useIsDesktop()
  const navigate = useNavigate()

  if (isDesktop) return null

  return (
    <nav className="ui-bottom-nav" aria-label="Primary">
      {ITEMS.map((it) => {
        const on = active === it.key
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => navigate(it.path)}
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
