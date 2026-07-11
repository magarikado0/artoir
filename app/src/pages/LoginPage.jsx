import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useResolvedSession } from '../lib/useResolvedSession'
import BrandMark from '../components/BrandMark'
import Header from '../components/Header'
import LoadingFrames from '../components/LoadingFrames'
import { useDelayedLoading } from '../lib/useDelayedLoading'
import {
  normalizeOAuthReturnPath,
  markOAuthRedirectPending,
  clearOAuthReturnState,
  stashOAuthReturnPath,
  resolvePostLoginPath,
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
    <div className="ui-form-field">
      <div className="ui-form-label-row">
        <span>{label}</span>
        {required && <span>*</span>}
      </div>
      <div className="ui-input-wrap">
        <input
          type={isPw && showPw ? 'text' : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          style={{ fontFamily: isPw ? T.mono : T.sans }}
        />
        {isPw && (
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            style={{
              minWidth: 44, padding: '0 12px', background: 'none', border: 'none',
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
  const isDesktop = useIsDesktop()
  const { session, ready } = useResolvedSession()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [sessionRedirectTo, setSessionRedirectTo] = useState(null)
  const showLoader = useDelayedLoading(!ready)
  const navigate = useNavigate()
  const location = useLocation()
  const rawFrom = location.state?.from
  const from = !rawFrom
    ? '/exhibitions'
    : typeof rawFrom === 'string'
      ? rawFrom
      : `${rawFrom.pathname || ''}${rawFrom.search || ''}${rawFrom.hash || ''}`

  const redirectUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}${from.startsWith('/') ? from : `/${from}`}`
  const oauthReturnPath = normalizeOAuthReturnPath(from)
  const oauthCallbackUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/` : '/'

  useEffect(() => {
    if (!ready || !session) return undefined
    let cancelled = false
    async function resolveRedirect() {
      const target = await resolvePostLoginPath(supabase, session.user?.id, from)
      if (cancelled) return
      clearOAuthReturnState()
      setSessionRedirectTo(target)
    }
    resolveRedirect()
    return () => { cancelled = true }
  }, [from, ready, session])

  if (ready && session && sessionRedirectTo) {
    return <Navigate to={sessionRedirectTo} replace />
  }

  if (showLoader || (ready && session && !sessionRedirectTo)) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: T.paper }}>
        <LoadingFrames />
      </div>
    )
  }

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
        const { data, error: signErr } = await supabase.auth.signInWithPassword({ email, password })
        if (signErr) {
          setError(signErr.message)
        } else {
          clearOAuthReturnState()
          const target = await resolvePostLoginPath(supabase, data.user?.id, from)
          navigate(target, { replace: true })
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
          const target = await resolvePostLoginPath(supabase, data.user?.id, from)
          navigate(target, { replace: true })
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

  const formBody = (
    <>
      <div className="ui-screen-title" style={{ marginTop: 8 }}>{mode === 'login' ? 'ログイン' : '新規登録'}</div>
      <div className="ui-screen-subtitle" style={{ fontFamily: T.serifBody }}>
        {mode === 'login'
          ? 'アカウントへログインします。'
          : 'メールとパスワードでアカウントを作成します。登録後、プロフィール設定に進めます。'}
      </div>

      <button
        type="button"
        disabled={googleLoading || loading}
        onClick={handleGoogleAuth}
        aria-label="Google で続ける"
        className="ui-btn ui-btn--ghost ui-btn-block"
        style={{ marginTop: 20, gap: 10, cursor: googleLoading || loading ? 'wait' : 'pointer' }}
      >
        <GoogleMark />
        {googleLoading ? 'リダイレクト中…' : 'Google で続ける'}
      </button>

      <div className="ui-divider"><span>または</span></div>

      <div className="ui-auth-tabs">
        <button type="button" className={mode === 'login' ? 'is-active' : ''} onClick={() => switchMode('login')}>
          ログイン
        </button>
        <button type="button" className={mode === 'signup' ? 'is-active' : ''} onClick={() => switchMode('signup')}>
          新規登録
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ marginTop: 22 }}>
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
          <div className="ui-alert ui-alert--error" style={{ marginBottom: 12 }}>
            {error}
          </div>
        )}
        {success && (
          <div className="ui-alert ui-alert--success" style={{ marginBottom: 12 }}>
            {success}
          </div>
        )}

        <button type="submit" disabled={loading} style={{
          width: '100%', marginTop: 4,
          background: loading ? T.inkMuted : T.accent, color: T.paper, border: 'none',
          borderRadius: 8, minHeight: 48, padding: '0 16px', fontFamily: T.sans, fontSize: 13,
          fontWeight: 500, letterSpacing: '0.16em', cursor: loading ? 'wait' : 'pointer',
        }}>
          {loading ? '処理中…' : (mode === 'login' ? 'ログイン  →' : 'アカウント作成  →')}
        </button>
      </form>

      <div className="ui-auth-note">
        ご不明な点は info@artoir.net まで。
      </div>
    </>
  )

  const loginContent = (
    <main className={`ui-auth-shell ${isDesktop ? '' : 'ui-auth-shell-mobile'}`}>
      <section className="ui-auth-login-surface">
        {isDesktop && (
          <div className="ui-auth-login-top">
            <Link to="/exhibitions" className="ui-auth-brand-link" style={{ textDecoration: 'none' }} aria-label="Artoir">
              <span className="ui-auth-mark">
                <BrandMark size="auth" />
              </span>
              <span className="ui-brand-lockup-word">Artoir<span className="ui-brand-lockup-dot">.</span></span>
            </Link>
          </div>
        )}
        {formBody}
      </section>
    </main>
  )

  if (!isDesktop) return (
    <div className="ui-page-shell">
      <Header activeTab="account" />
      {loginContent}
    </div>
  )

  return <div className="ui-page-shell">{loginContent}</div>
}
