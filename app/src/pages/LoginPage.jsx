import { useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { T } from '../lib/tokens'

function Field({ label, value, onChange, type = 'text', placeholder, required, autoComplete }) {
  const [showPw, setShowPw] = useState(false)
  const isPw = type === 'password'
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontFamily: T.mono, fontSize: 9, letterSpacing: '0.18em',
        color: T.inkMuted, marginBottom: 6,
      }}>
        <span>{label}</span>
        {required && <span>*</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'stretch', border: `1px solid ${T.ink}`, background: T.card }}>
        <input
          type={isPw && showPw ? 'text' : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          style={{
            flex: 1, padding: '12px 14px',
            fontFamily: isPw ? T.mono : T.sans,
            fontSize: 14, border: 'none', outline: 'none',
            background: 'transparent', color: T.ink,
          }}
        />
        {isPw && (
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            style={{
              padding: '0 14px', background: 'none', border: 'none',
              cursor: 'pointer', color: T.inkMuted,
            }}
            aria-label={showPw ? 'パスワードを隠す' : 'パスワードを表示'}
          >
            {showPw ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from
    ? `${location.state.from.pathname || ''}${location.state.from.search || ''}${location.state.from.hash || ''}`
    : '/account'

  async function handleSubmit(e) {
    e.preventDefault()
    if (!supabase) { setError('Supabase が未設定です'); return }
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        navigate(from, { replace: true })
      }
    } catch {
      setError('通信に失敗しました。時間をおいて再度お試しください。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: T.paper,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* header */}
      <div style={{
        padding: '14px 16px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `1px solid ${T.ink}`,
        background: T.paper,
      }}>
        <Link to="/" style={{
          fontFamily: T.serif, fontSize: 18, letterSpacing: '-0.01em', fontWeight: 500,
          color: T.ink, textDecoration: 'none',
        }}>
          Artoir<span style={{ color: T.accent }}>.</span>
        </Link>
        <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.12em', color: T.inkSoft }}>
          INDEX · {new Date().getFullYear()}
        </div>
      </div>

      {/* form content */}
      <div style={{ flex: 1, padding: '32px 16px', display: 'flex', flexDirection: 'column', maxWidth: 480 }}>
        <div style={{
          fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em',
          color: T.inkMuted, marginBottom: 10,
        }}>AUTH / 01</div>
        <div style={{
          fontFamily: T.serif, fontSize: 32, letterSpacing: '0.03em', lineHeight: 1.2, color: T.ink,
        }}>Sign in.</div>
        <div style={{
          marginTop: 8, fontSize: 13, color: T.inkSoft,
          fontFamily: T.serifBody, lineHeight: 1.7,
        }}>
          団体アカウントへログインします。
        </div>

        <form onSubmit={handleSubmit} style={{ marginTop: 36 }}>
          <Field
            label="MAIL"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="example@mail.com"
            required
            autoComplete="email"
          />
          <Field
            label="PASSWORD"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••••"
            required
            autoComplete="current-password"
          />

          {error && (
            <div style={{
              marginBottom: 12, padding: '10px 14px',
              background: 'rgba(180,69,44,0.06)', border: `0.5px solid ${T.accent}`,
              fontFamily: T.mono, fontSize: 11, color: T.accent, letterSpacing: '0.06em',
            }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{
              marginBottom: 12, padding: '10px 14px',
              background: 'rgba(0,128,0,0.05)', border: '0.5px solid #2d8a4e',
              fontFamily: T.mono, fontSize: 11, color: '#2d8a4e', letterSpacing: '0.06em',
            }}>
              {success}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', marginTop: 4,
            background: loading ? T.inkMuted : T.accent, color: T.paper, border: 'none',
            padding: '16px', fontFamily: T.sans, fontSize: 13,
            fontWeight: 500, letterSpacing: '0.16em', cursor: loading ? 'wait' : 'pointer',
          }}>
            {loading ? '...' : 'ログイン  →'}
          </button>
        </form>

        <div style={{
          marginTop: 32, paddingTop: 20, borderTop: `0.5px solid ${T.line}`,
          fontSize: 11, color: T.inkMuted, lineHeight: 1.7,
          fontFamily: T.mono, letterSpacing: '0.08em',
        }}>
          アカウントは招待制です。<br/>
          利用希望は info@Artoir.jp まで。
        </div>

        <div style={{ flex: 1, minHeight: 28 }} />
        <div style={{
          fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em',
          color: T.inkMuted,
          display: 'flex', justifyContent: 'space-between',
          paddingTop: 16, borderTop: `0.5px solid ${T.line}`,
        }}>
          <span>Artoir</span>
          <span>{new Date().getFullYear()}</span>
        </div>
      </div>
    </div>
  )
}
