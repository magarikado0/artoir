import { useNavigate } from 'react-router-dom'
import { T } from '../lib/tokens'
import { useIsDesktop } from '../lib/useIsDesktop'

const ITEMS = [
  { key: 'top',     en: 'EXHIBITS', icon: 'index',  path: '/' },
  { key: 'orgs',    en: 'ORGS',     icon: 'org',    path: '/orgs' },
  { key: 'account', en: 'ACCOUNT',  icon: 'user',   path: '/account' },
]

function NavIcon({ name, color }) {
  const s = { stroke: color, strokeWidth: 1, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }
  if (name === 'index') return (
    <svg width="20" height="20" viewBox="0 0 20 20"><path d="M3 5h14M3 10h14M3 15h14" {...s} /></svg>
  )
  if (name === 'org') return (
    <svg width="20" height="20" viewBox="0 0 20 20">
      <rect x="3" y="6" width="14" height="11" {...s} />
      <path d="M7 6V3h6v3M7 10h2M11 10h2M7 13h2M11 13h2" {...s} />
    </svg>
  )
  return (
    <svg width="20" height="20" viewBox="0 0 20 20">
      <circle cx="10" cy="7" r="3" {...s} />
      <path d="M3.5 17c1.5-3.5 4-5 6.5-5s5 1.5 6.5 5" {...s} />
    </svg>
  )
}

export default function BottomNav({ active }) {
  const isDesktop = useIsDesktop()
  const navigate = useNavigate()

  if (isDesktop) return null

  function handleNav(item) {
    navigate(item.path)
  }

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
      background: T.paper, borderTop: `1px solid ${T.ink}`,
      display: 'flex', gap: 6, padding: '10px 12px 24px',
    }}>
      {ITEMS.map((it) => {
        const on = active === it.key
        return (
          <div key={it.key} onClick={() => handleNav(it)} className="ui-bottom-item" style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 5, padding: '9px 2px', cursor: 'pointer',
            background: on ? T.ink : T.paperAlt,
            color: on ? T.paper : T.inkSoft,
            border: on ? `1px solid ${T.ink}` : `0.5px solid ${T.line}`,
          }}>
            <NavIcon name={it.icon} color={on ? T.paper : T.inkSoft} />
            <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '0.14em' }}>{it.en}</div>
          </div>
        )
      })}
    </div>
  )
}
