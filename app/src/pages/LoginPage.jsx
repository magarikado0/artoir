import { useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  normalizeOAuthReturnPath,
  markOAuthRedirectPending,
  clearOAuthReturnState,
  stashOAuthReturnPath,
} from '../lib/oauthReturn'
import { T } from '../lib/tokens'
import { useIsDesktop } from '../lib/useIsDesktop'

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.81 32.657 29.288 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.047 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.289 14.928 18.743 12 24 12c3.059 0 5.842 1.157 7.962 3.066l5.656-5.657C34.048 6.05 29.268 4 24 4 15.693 4 8.622 9.068 6.307 14.689l-.001.002z" />
      <path fill="#4CAF50" d="M24 44c5.074 0 9.834-2.014 13.379-5.579l-6.207-6.207C29.298 34.089 26.734 36 24 36c-5.275 0-9.743-3.379-11.389-8.086l-.006.005-6.585 5.057C9.068 39.089 15.974 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083 42 20 24 20v8h11.308a15.94 15.94 0 01-7.074 10.086l-.006-.005 6.208 6.207C42.023 42.47 44 36.23 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  )
}

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

const tabBtn = (active) => ({
  flex: 1,
  padding: '12px 8px',
  background: 'transparent',
  border: 'none',
  borderBottom: active ? `2px solid ${T.accent}` : '2px solid transparent',
  marginBottom: '-1px',
  cursor: 'pointer',
  fontFamily: T.serif,
  fontSize: 14,
  letterSpacing: '0.08em',
  color: active ? T.ink : T.inkMuted,
})

export default function LoginPage() {
  const isDesktop = useIsDesktop()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const rawFrom = location.state?.from
  const from = !rawFrom
    ? '/account'
    : typeof rawFrom === 'string'
      ? rawFrom
      : `${rawFrom.pathname || ''}${rawFrom.search || ''}${rawFrom.hash || ''}`

  const redirectUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}${from.startsWith('/') ? from : `/${from}`}`
  const oauthReturnPath = normalizeOAuthReturnPath(from)
  const oauthCallbackUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/login` : '/login'

  async function handleGoogleAuth() {
    if (!supabase) { setError('Supabase が未設定です'); return }
    setError('')
    setSuccess('')
    setGoogleLoading(true)
    try {
      stashOAuthReturnPath(oauthReturnPath)
      markOAuthRedirectPending()
      const { error: oAuthErr } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: oauthCallbackUrl,
        },
      })
      if (oAuthErr) {
        clearOAuthReturnState()
        setError(oAuthErr.message)
        setGoogleLoading(false)
      }
    } catch {
      clearOAuthReturnState()
      setError('Google ログインを開始できませんでした。')
      setGoogleLoading(false)
    }
  }

  function switchMode(next) {
    setMode(next)
    setError('')
    setSuccess('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!supabase) { setError('Supabase が未設定です'); return }
    if (mode === 'signup' && password.length < 6) {
      setError('パスワードは6文字以上にしてください')
      return
    }
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      if (mode === 'login') {
        const { error: signErr } = await supabase.auth.signInWithPassword({ email, password })
        if (signErr) {
          setError(signErr.message)
        } else {
          clearOAuthReturnState()
          navigate(from, { replace: true })
        }
      } else {
        const { data, error: signErr } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectUrl },
        })
        if (signErr) {
          setError(signErr.message)
        } else if (data.session) {
          clearOAuthReturnState()
          navigate(from, { replace: true })
        } else {
          clearOAuthReturnState()
          setSuccess('確認メールを送信しました。メール内のリンクから登録を完了してください。')
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

  const year = new Date().getFullYear()

  const formBody = (
    <>
      <div style={{
        fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em',
        color: T.inkMuted, marginBottom: 10,
      }}>{mode === 'login' ? 'AUTH / 01 — LOGIN' : 'AUTH / 02 — SIGN UP'}</div>
      <div style={{
        fontFamily: T.serif, fontSize: 32, letterSpacing: '0.03em', lineHeight: 1.2, color: T.ink,
      }}>{mode === 'login' ? 'Sign in.' : 'Join.'}</div>
      <div style={{
        marginTop: 8, fontSize: 13, color: T.inkSoft,
        fontFamily: T.serifBody, lineHeight: 1.7,
      }}>
        {mode === 'login'
          ? '団体アカウントへログインします。'
          : 'メールとパスワードでアカウントを作成します。登録後、団体の作成に進めます。'}
      </div>

      <button
        type="button"
        disabled={googleLoading || loading}
        onClick={handleGoogleAuth}
        aria-label="Google で続ける"
        style={{
          width: '100%',
          marginTop: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          padding: '14px 16px',
          background: T.card,
          color: T.ink,
          border: `1px solid ${T.ink}`,
          fontFamily: T.sans,
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: '0.06em',
          cursor: googleLoading || loading ? 'wait' : 'pointer',
          opacity: googleLoading || loading ? 0.65 : 1,
        }}
      >
        <GoogleMark />
        {googleLoading ? 'リダイレクト中…' : 'Google で続ける'}
      </button>

      <div style={{
        marginTop: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        fontFamily: T.mono,
        fontSize: 9,
        letterSpacing: '0.14em',
        color: T.inkMuted,
      }}>
        <div style={{ flex: 1, height: '0.5px', background: T.line }} aria-hidden />
        <span>または</span>
        <div style={{ flex: 1, height: '0.5px', background: T.line }} aria-hidden />
      </div>

      <div style={{
        display: 'flex',
        marginTop: 28,
        borderBottom: `1px solid ${T.ink}`,
      }}>
        <button type="button" style={tabBtn(mode === 'login')} onClick={() => switchMode('login')}>
          ログイン
        </button>
        <button type="button" style={tabBtn(mode === 'signup')} onClick={() => switchMode('signup')}>
          新規登録
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ marginTop: 28 }}>
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
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
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
          {loading ? '...' : (mode === 'login' ? 'ログイン  →' : 'アカウント作成  →')}
        </button>
      </form>

      <div style={{
        marginTop: 32, paddingTop: 20, borderTop: `0.5px solid ${T.line}`,
        fontSize: 11, color: T.inkMuted, lineHeight: 1.7,
        fontFamily: T.mono, letterSpacing: '0.08em',
      }}>
        ご不明な点は info@artoir.net まで。
      </div>
    </>
  )

  if (isDesktop) {
    return (
      <div style={{
        minHeight: '100vh', background: T.paper,
        display: 'flex', flexDirection: 'column',
      }}>
        {/* desktop header */}
        <div style={{ borderBottom: `1px solid ${T.ink}`, background: T.paper }}>
          <div style={{
            maxWidth: 1200, margin: '0 auto',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 32px', height: 56,
          }}>
            <Link to="/" style={{
              fontFamily: T.serif, fontSize: 20, letterSpacing: '-0.01em', fontWeight: 500,
              color: T.ink, textDecoration: 'none',
            }}>
              Artoir<span style={{ color: T.accent }}>.</span>
            </Link>
            <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.12em', color: T.inkSoft }}>
              INDEX · {year}
            </div>
          </div>
        </div>

        {/* centered form area */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '48px 24px',
        }}>
          <div style={{ width: '100%', maxWidth: 440 }}>
            {formBody}
          </div>
        </div>

        {/* desktop footer */}
        <div style={{ borderTop: `0.5px solid ${T.line}` }}>
          <div style={{
            maxWidth: 1200, margin: '0 auto', padding: '16px 32px',
            display: 'flex', justifyContent: 'space-between',
            fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.inkMuted,
          }}>
            <span>Artoir</span>
            <span>{year}</span>
          </div>
        </div>
      </div>
    )
  }

  // mobile layout
  return (
    <div style={{
      minHeight: '100vh', background: T.paper,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* mobile header */}
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
          INDEX · {year}
        </div>
      </div>

      {/* mobile form content */}
      <div style={{ flex: 1, padding: '32px 16px', display: 'flex', flexDirection: 'column', maxWidth: 480 }}>
        {formBody}
        <div style={{ flex: 1, minHeight: 28 }} />
        <div style={{
          fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em',
          color: T.inkMuted,
          display: 'flex', justifyContent: 'space-between',
          paddingTop: 16, borderTop: `0.5px solid ${T.line}`,
        }}>
          <span>Artoir</span>
          <span>{year}</span>
        </div>
      </div>
    </div>
  )
}
