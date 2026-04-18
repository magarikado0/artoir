import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const S = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f5f0e8',
  },
  container: {
    width: '100%',
    maxWidth: '400px',
    padding: '2rem',
  },
  logoWrap: {
    textAlign: 'center',
    marginBottom: '3rem',
  },
  logo: {
    fontFamily: 'Cormorant Garamond, serif',
    fontSize: '2rem',
    fontWeight: 300,
    letterSpacing: '0.15em',
    color: '#1a1612',
    textDecoration: 'none',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  input: {
    padding: '0.75rem 1rem',
    border: '1px solid rgba(26,22,18,0.2)',
    background: 'transparent',
    fontFamily: 'Noto Serif JP, serif',
    fontSize: '0.9rem',
    outline: 'none',
    color: '#1a1612',
    width: '100%',
  },
  error: {
    color: '#c0392b',
    fontSize: '0.8rem',
  },
  button: {
    padding: '0.75rem',
    background: '#1a1612',
    color: '#f5f0e8',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'Cormorant Garamond, serif',
    fontSize: '0.8rem',
    letterSpacing: '0.2em',
  },
}

const S_extra = {
  tabs: {
    display: 'flex',
    marginBottom: '1.5rem',
    borderBottom: '1px solid rgba(26,22,18,0.15)',
  },
  tab: (active) => ({
    flex: 1,
    padding: '0.6rem',
    background: 'transparent',
    border: 'none',
    borderBottom: active ? '2px solid #1a1612' : '2px solid transparent',
    cursor: 'pointer',
    fontFamily: 'Cormorant Garamond, serif',
    fontSize: '0.85rem',
    letterSpacing: '0.15em',
    color: active ? '#1a1612' : 'rgba(26,22,18,0.45)',
    marginBottom: '-1px',
  }),
  success: {
    color: '#27ae60',
    fontSize: '0.85rem',
    textAlign: 'center',
    padding: '0.5rem 0',
  },
}

export default function LoginPage() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from
    ? `${location.state.from.pathname || ''}${location.state.from.search || ''}${location.state.from.hash || ''}`
    : '/'

  function switchMode(next) {
    setMode(next)
    setError('')
    setSuccess('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!supabase) {
      setError('Supabase が未設定です')
      return
    }
    setLoading(true)
    setError('')
    setSuccess('')

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        navigate(from, { replace: true })
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else {
        setSuccess('確認メールを送信しました。メールをご確認ください。')
        setEmail('')
        setPassword('')
      }
    }

    setLoading(false)
  }

  return (
    <div style={S.page}>
      <div style={S.container}>
        <div style={S.logoWrap}>
          <span style={S.logo}>
            art<span style={{ color: '#c0392b' }}>port</span>
          </span>
        </div>
        <div style={S_extra.tabs}>
          <button style={S_extra.tab(mode === 'login')} onClick={() => switchMode('login')} type="button">
            ログイン
          </button>
          <button style={S_extra.tab(mode === 'signup')} onClick={() => switchMode('signup')} type="button">
            アカウント作成
          </button>
        </div>
        <form onSubmit={handleSubmit} style={S.form}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="メールアドレス"
            required
            style={S.input}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === 'signup' ? 'パスワード（6文字以上）' : 'パスワード'}
            required
            style={S.input}
          />
          {error && <p style={S.error}>{error}</p>}
          {success && <p style={S_extra.success}>{success}</p>}
          <button type="submit" disabled={loading} style={S.button}>
            {loading ? '...' : mode === 'login' ? 'ログイン' : 'アカウントを作成'}
          </button>
        </form>
      </div>
    </div>
  )
}
