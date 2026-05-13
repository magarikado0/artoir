import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { T } from '../lib/tokens'
import { useIsDesktop } from '../lib/useIsDesktop'

const TABS = [
  { key: 'top',  label: '展覧会一覧', path: '/', icon: 'list' },
  { key: 'orgs', label: '団体一覧',   path: '/orgs', icon: 'org' },
]

function Icon({ name, size = 18 }) {
  const s = { stroke: 'currentColor', strokeWidth: 1.7, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }
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
      <div style={{
        borderBottom: `3px solid ${T.ink}`,
        background: T.ink, position: 'sticky', top: 0, zIndex: 50,
        boxShadow: `0 6px 0 ${T.gold}`,
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto',
          display: 'flex', alignItems: 'center',
          padding: '0 32px', height: 68, gap: 0,
        }}>
          <Link to="/" style={{
            fontFamily: T.serif, fontSize: 22, letterSpacing: '-0.01em', fontWeight: 500,
            color: T.paper, textDecoration: 'none', marginRight: 40, flexShrink: 0,
          }}>
            Artoir<span style={{ color: T.accent }}>.</span>
          </Link>

          <div style={{ display: 'flex', flex: 1, gap: 0 }}>
            {TABS.map((t) => {
              const on = activeTab === t.key
              return (
                <Link key={t.key} to={t.path} className="ui-icon-button" style={{
                  padding: '0 16px', height: 68, display: 'flex', alignItems: 'center', gap: 8,
                  textDecoration: 'none', position: 'relative',
                  fontFamily: T.sans, fontSize: 13, letterSpacing: '0.04em',
                  color: on ? T.ink : T.paper,
                  background: on ? T.gold : 'transparent',
                  borderLeft: on ? `2px solid ${T.paper}` : '2px solid transparent',
                  borderRight: on ? `2px solid ${T.paper}` : '2px solid transparent',
                  borderBottom: 'none',
                  boxSizing: 'border-box',
                }}>
                  <Icon name={t.icon} size={17} />
                  <span>{t.label}</span>
                </Link>
              )
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {session ? (
              <>
                <Link to="/account" className="ui-icon-button" style={{ height: 38, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 7, fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em', color: T.paper, textDecoration: 'none', border: `1px solid ${T.paper}`, background: 'rgba(255,249,233,0.08)' }}>
                  <Icon name="user" size={15} />
                  DASHBOARD
                </Link>
                <div style={{ width: 1, height: 16, background: 'rgba(255,249,233,0.28)' }} />
                <button onClick={handleLogout} style={{
                  fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em',
                  color: 'rgba(255,249,233,0.72)', background: 'none', border: 'none', cursor: 'pointer',
                }}>SIGN OUT</button>
              </>
            ) : (
              <Link to="/login" className="ui-action" style={{
                padding: '9px 14px', background: T.accent, color: T.paper,
                fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em',
                textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8,
                border: `1px solid ${T.paper}`,
              }}><Icon name="login" size={15} />LOG IN</Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  // mobile header（縦占有を抑えつつ、主タップ領域は最小 44px）
  return (
    <div style={{
      padding: '10px 14px 10px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      borderBottom: `3px solid ${T.gold}`,
      background: T.ink, position: 'sticky', top: 0, zIndex: 50,
    }}>
      <Link to="/" style={{
        fontFamily: T.serif, fontSize: 18, letterSpacing: '-0.01em', fontWeight: 500,
        lineHeight: 1.2,
        color: T.paper, textDecoration: 'none',
      }}>
        Artoir<span style={{ color: T.accent }}>.</span>
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Link to="/account" className="ui-icon-button" aria-label="アカウント" style={{ minWidth: 44, minHeight: 44, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: activeTab === 'account' ? T.ink : T.paper, background: activeTab === 'account' ? T.gold : 'rgba(255,249,233,0.08)', border: `1px solid ${T.paper}`, textDecoration: 'none' }}>
          <Icon name="user" size={17} />
        </Link>
      </div>
    </div>
  )
}
