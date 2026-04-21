import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { T } from '../lib/tokens'
import { useIsDesktop } from '../lib/useIsDesktop'

const TABS = [
  { key: 'top',  label: '展覧会一覧', path: '/' },
  { key: 'orgs', label: '団体一覧',   path: '/orgs' },
]

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
        borderBottom: `1px solid ${T.ink}`,
        background: T.paper, position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto',
          display: 'flex', alignItems: 'center',
          padding: '0 32px', height: 56, gap: 0,
        }}>
          <Link to="/" style={{
            fontFamily: T.serif, fontSize: 20, letterSpacing: '-0.01em', fontWeight: 500,
            color: T.ink, textDecoration: 'none', marginRight: 40, flexShrink: 0,
          }}>
            artport<span style={{ color: T.accent }}>.</span>
          </Link>

          <div style={{ display: 'flex', flex: 1, gap: 0 }}>
            {TABS.map((t) => {
              const on = activeTab === t.key
              return (
                <Link key={t.key} to={t.path} style={{
                  padding: '0 18px', height: 56, display: 'flex', alignItems: 'center',
                  textDecoration: 'none', position: 'relative',
                  fontFamily: T.sans, fontSize: 13, letterSpacing: '0.04em',
                  color: on ? T.ink : T.inkSoft,
                  borderBottom: on ? `2px solid ${T.accent}` : '2px solid transparent',
                  boxSizing: 'border-box',
                }}>{t.label}</Link>
              )
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {session ? (
              <>
                <Link to="/account" style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em', color: T.inkSoft, textDecoration: 'none' }}>
                  DASHBOARD
                </Link>
                <div style={{ width: 1, height: 16, background: T.line }} />
                <button onClick={handleLogout} style={{
                  fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em',
                  color: T.inkMuted, background: 'none', border: 'none', cursor: 'pointer',
                }}>SIGN OUT</button>
              </>
            ) : (
              <Link to="/login" style={{
                padding: '8px 16px', background: T.ink, color: T.paper,
                fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em',
                textDecoration: 'none', display: 'inline-block',
              }}>LOG IN</Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  // mobile header
  return (
    <div style={{
      padding: '14px 16px 12px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      borderBottom: `1px solid ${T.ink}`,
      background: T.paper, position: 'sticky', top: 0, zIndex: 50,
    }}>
      <Link to="/" style={{
        fontFamily: T.serif, fontSize: 18, letterSpacing: '-0.01em', fontWeight: 500,
        color: T.ink, textDecoration: 'none',
      }}>
        artport<span style={{ color: T.accent }}>.</span>
      </Link>
      <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.12em', color: T.inkSoft }}>
        INDEX · {new Date().getFullYear()}
      </div>
    </div>
  )
}
