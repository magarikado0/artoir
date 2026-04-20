import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'

const S = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.5rem clamp(2rem, 5vw, 5rem)',
    borderBottom: '1px solid rgba(26,22,18,0.12)',
    position: 'sticky',
    top: 0,
    background: 'rgba(245,240,232,0.92)',
    backdropFilter: 'blur(8px)',
    zIndex: 100,
  },
  logo: {
    fontFamily: 'Cormorant Garamond, serif',
    fontSize: '1.5rem',
    fontWeight: 300,
    letterSpacing: '0.15em',
    color: '#1a1612',
    textDecoration: 'none',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: '2rem',
    fontSize: '0.75rem',
    letterSpacing: '0.1em',
    color: '#9a9088',
  },
  navLink: {
    color: '#9a9088',
    textDecoration: 'none',
  },
  loginBtn: {
    fontFamily: 'Cormorant Garamond, serif',
    fontSize: '0.75rem',
    letterSpacing: '0.15em',
    color: '#1a1612',
    background: 'transparent',
    border: '1px solid rgba(26,22,18,0.3)',
    padding: '0.4rem 1rem',
    cursor: 'pointer',
    textDecoration: 'none',
  },
}

export default function Header({ orgName, orgSlug }) {
  const { session } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    if (!supabase) {
      window.alert('現在ログアウト機能を利用できません。')
      return
    }

    const { error } = await supabase.auth.signOut()

    if (error) {
      window.alert('ログアウトに失敗しました。時間をおいて再度お試しください。')
      return
    }

    navigate('/')
  }

  return (
    <header style={S.header}>
      <Link to="/" style={S.logo}>
        art<span style={{ color: '#c0392b' }}>port</span>
      </Link>
      <div style={S.nav}>
        {orgSlug && (
          <>
            <Link to={`/${orgSlug}`} style={S.navLink}>{orgName}</Link>
            <Link to="/" style={S.navLink}>すべての展覧会</Link>
          </>
        )}
        {session ? (
          <button onClick={handleLogout} style={S.loginBtn}>ログアウト</button>
        ) : (
          <Link to="/login" style={S.loginBtn}>ログイン / 登録</Link>
        )}
      </div>
    </header>
  )
}
