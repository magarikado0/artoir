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
  const [showPassword, setShowPassword] = useState(false)
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

    try {
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
    } catch {
      setError('通信に失敗しました。時間をおいて再度お試しください。')
    } finally {
      setLoading(false)
    }
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
            autoComplete="email"
            style={S.input}
          />
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'パスワード（6文字以上）' : 'パスワード'}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              style={{ ...S.input, paddingRight: '2.8rem', boxSizing: 'border-box' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              style={{
                position: 'absolute',
                right: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                color: 'rgba(26,22,18,0.4)',
                display: 'flex',
                alignItems: 'center',
              }}
              aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
            >
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
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
