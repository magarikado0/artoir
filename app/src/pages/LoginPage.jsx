import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
    } else {
      navigate('/')
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
            placeholder="パスワード"
            required
            style={S.input}
          />
          {error && <p style={S.error}>{error}</p>}
          <button type="submit" disabled={loading} style={S.button}>
            {loading ? '...' : 'ログイン'}
          </button>
        </form>
      </div>
    </div>
  )
}
