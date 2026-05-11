import { useNavigate } from 'react-router-dom'
import { T } from '../lib/tokens'
import { useIsDesktop } from '../lib/useIsDesktop'

const ITEMS = [
  { key: 'top',     en: 'EXHIBITS', icon: 'index',  path: '/' },
  { key: 'orgs',    en: 'ORGS',     icon: 'org',    path: '/orgs' },
  { key: 'account', en: 'ACCOUNT',  icon: 'user',   path: '/account' },
]

function NavIcon({ name, color, size = 18 }) {
  const s = { stroke: color, strokeWidth: 1, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }
  if (name === 'index') return (
    <svg width={size} height={size} viewBox="0 0 20 20"><path d="M3 5h14M3 10h14M3 15h14" {...s} /></svg>
  )
  if (name === 'org') return (
    <svg width={size} height={size} viewBox="0 0 20 20">
      <rect x="3" y="6" width="14" height="11" {...s} />
      <path d="M7 6V3h6v3M7 10h2M11 10h2M7 13h2M11 13h2" {...s} />
    </svg>
  )
  return (
    <svg width={size} height={size} viewBox="0 0 20 20">
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

  const safeBottom = 'max(8px, env(safe-area-inset-bottom, 0px))'

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
      background: T.ink, borderTop: `3px solid ${T.gold}`,
      display: 'flex', gap: 6, padding: `6px 8px calc(10px + ${safeBottom})`,
    }}>
      {ITEMS.map((it) => {
        const on = active === it.key
        return (
          <div key={it.key} onClick={() => handleNav(it)} className="ui-bottom-item" style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 2, minHeight: 48, padding: '6px 2px', cursor: 'pointer',
            background: on ? T.gold : 'rgba(255,249,233,0.08)',
            color: on ? T.ink : T.paper,
            border: on ? `1px solid ${T.gold}` : `1px solid rgba(255,249,233,0.36)`,
          }}>
            <NavIcon name={it.icon} color={on ? T.ink : T.paper} size={18} />
            <div style={{ fontFamily: T.mono, fontSize: 8, letterSpacing: '0.12em', lineHeight: 1.2 }}>{it.en}</div>
          </div>
        )
      })}
    </div>
  )
}
