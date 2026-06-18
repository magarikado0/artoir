import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { lazy, Suspense, useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { peekSupabaseAuthUrlErrorFromWindow, isGoogleExchangeExternalCodeError, getSupabaseAuthCallbackUrlForGoogle } from './lib/oauthUrlError'
import { AuthContext } from './lib/auth'
import ProtectedRoute from './components/ProtectedRoute'
import OAuthReturnRedirect from './components/OAuthReturnRedirect'

const AllExhibitionsPage = lazy(() => import('./pages/AllExhibitionsPage'))
const OrgsPage = lazy(() => import('./pages/OrgsPage'))
const OrgPage = lazy(() => import('./pages/OrgPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const ExhibitionPage = lazy(() => import('./pages/ExhibitionPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const DashHome = lazy(() => import('./pages/dashboard/DashHome'))
const DashSettings = lazy(() => import('./pages/dashboard/DashSettings'))
const DashMembers = lazy(() => import('./pages/dashboard/DashMembers'))
const DashExhibitionEdit = lazy(() => import('./pages/dashboard/DashExhibitionEdit'))
const DashArtworks = lazy(() => import('./pages/dashboard/DashArtworks'))
const AccountPage = lazy(() => import('./pages/AccountPage'))
const AccountSetup = lazy(() => import('./pages/AccountSetup'))
const OrganizationCreatePage = lazy(() => import('./pages/OrganizationCreatePage'))
const InviteAcceptPage = lazy(() => import('./pages/InviteAcceptPage'))

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

/** OAuth 失敗時、Supabase が URL に載せる error がコンソールに出ない環境でも分かるようにする */
function SupabaseOAuthErrorBanner() {
  const [text] = useState(() => peekSupabaseAuthUrlErrorFromWindow())
  if (!text) return null

  const showGoogleHint = isGoogleExchangeExternalCodeError(text)
  const supabaseCallback = getSupabaseAuthCallbackUrlForGoogle()

  return (
    <div
      role="alert"
      style={{
        margin: 0,
        padding: '12px 20px',
        background: 'rgba(180,69,44,0.09)',
        borderBottom: '0.5px solid #b4452c',
        fontFamily: 'ui-monospace, monospace',
        fontSize: 12,
        lineHeight: 1.65,
        color: '#b4452c',
        letterSpacing: '0.04em',
      }}
    >
      <div>認証: {text}</div>
      {showGoogleHint && (
        <div
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: '0.5px solid rgba(180,69,44,0.35)',
            fontFamily: '"Noto Sans JP", system-ui, sans-serif',
            fontSize: 12,
            letterSpacing: '0.02em',
            lineHeight: 1.75,
            color: '#3d342c',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 6 }}>このエラーは「Google が返したコードを、Supabase 側でトークンに交換できない」ときに出ます。次を確認してください。</div>
          <ul style={{ margin: '0 0 10px 1em', padding: 0 }}>
            <li>Google Cloud Console → 認証情報 → 使用中の OAuth 2.0 クライアントが<strong>ウェブアプリケーション</strong>であること。</li>
            <li>同画面の<strong>承認済みのリダイレクト URI</strong>に、次を<strong>一字一句同じ</strong>で追加していること（ローカル URL ではなく Supabase のコールバックです）。</li>
          </ul>
          {supabaseCallback ? (
            <div style={{ wordBreak: 'break-all', fontFamily: 'ui-monospace, monospace', fontSize: 11, background: 'rgba(255,255,255,0.6)', padding: '8px 10px' }}>
              {supabaseCallback}
            </div>
          ) : (
            <div style={{ fontSize: 11 }}>VITE_SUPABASE_URL からコールバック URL を表示できませんでした。Project Settings → API の Project URL を基に、末尾に <code>/auth/v1/callback</code> を付けた URL を Google に登録してください。</div>
          )}
          <div style={{ marginTop: 10, fontSize: 11 }}>
            Supabase ダッシュボード → Authentication → Providers → Google の <strong>Client ID / Client Secret</strong> が、上記 Google クライアントと一致していること（Secret を再発行したあと Supabase に未反映のことが多いです）。手順は{' '}
            <a href="https://supabase.com/docs/guides/auth/social-login/auth-google" target="_blank" rel="noreferrer" style={{ color: '#b4452c' }}>Login with Google（Supabase）</a>
            を参照してください。
          </div>
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(() => (supabase ? undefined : null))

  useEffect(() => {
    if (!supabase) return undefined
    let isMounted = true
    let authSettled = false

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!isMounted || !authSettled) return
      setSession(s ?? null)
    })

    supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return
      if (error) {
        console.warn('[supabase auth]', error.message)
        setSession(null)
      } else {
        setSession(data.session ?? null)
      }
      authSettled = true
    }).catch(() => {
      if (isMounted) {
        setSession(null)
        authSettled = true
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  if (session === undefined) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: 0,
        padding: '24px',
        fontFamily: 'system-ui, sans-serif',
        fontSize: 14,
        color: '#524a42',
      }}>
        読み込み中…
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ session }}>
      <BrowserRouter>
        <SupabaseOAuthErrorBanner />
        <OAuthReturnRedirect />
        <ScrollToTop />
        <Suspense fallback={(
          <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', fontFamily: 'system-ui, sans-serif', fontSize: 14, color: '#524a42' }}>
            読み込み中…
          </div>
        )}>
          <Routes>
            <Route path="/" element={<AllExhibitionsPage />} />
            <Route path="/orgs" element={<OrgsPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/account/setup" element={<AccountSetup />} />
            <Route path="/account/organizations/new" element={<OrganizationCreatePage />} />
            <Route path="/invite/:token" element={<InviteAcceptPage />} />
            <Route path="/@:profileSlug" element={<ProfilePage />} />
            <Route path="/@:profileSlug/exhibition/:exhibitionSlug" element={<ExhibitionPage />} />
            <Route path="/@:profileSlug/dashboard" element={<ProtectedRoute><DashHome /></ProtectedRoute>} />
            <Route path="/@:profileSlug/dashboard/exhibitions/new" element={<ProtectedRoute><DashExhibitionEdit /></ProtectedRoute>} />
            <Route path="/@:profileSlug/dashboard/exhibitions/:exhibitionId/edit" element={<ProtectedRoute><DashExhibitionEdit /></ProtectedRoute>} />
            <Route path="/@:profileSlug/dashboard/exhibitions/:exhibitionId/artworks" element={<ProtectedRoute><DashArtworks /></ProtectedRoute>} />
            <Route path="/:orgSlug/exhibition/:exhibitionSlug" element={<ExhibitionPage />} />
            <Route path="/:orgSlug/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
            <Route path="/:orgSlug/dashboard" element={<ProtectedRoute><DashHome /></ProtectedRoute>} />
            <Route path="/:orgSlug/dashboard/settings" element={<ProtectedRoute><DashSettings /></ProtectedRoute>} />
            <Route path="/:orgSlug/dashboard/members" element={<ProtectedRoute><DashMembers /></ProtectedRoute>} />
            <Route path="/:orgSlug/dashboard/exhibitions/new" element={<ProtectedRoute><DashExhibitionEdit /></ProtectedRoute>} />
            <Route path="/:orgSlug/dashboard/exhibitions/:exhibitionId/edit" element={<ProtectedRoute><DashExhibitionEdit /></ProtectedRoute>} />
            <Route path="/:orgSlug/dashboard/exhibitions/:exhibitionId/artworks" element={<ProtectedRoute><DashArtworks /></ProtectedRoute>} />
            <Route path="/:orgSlug" element={<OrgPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthContext.Provider>
  )
}
