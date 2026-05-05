import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}
import { supabase } from './lib/supabase'
import { AuthContext } from './lib/auth'
import AllExhibitionsPage from './pages/AllExhibitionsPage'
import OrgsPage from './pages/OrgsPage'
import OrgPage from './pages/OrgPage'
import ExhibitionPage from './pages/ExhibitionPage'
import LoginPage from './pages/LoginPage'
import AdminPage from './pages/AdminPage'
import ProtectedRoute from './components/ProtectedRoute'
import DashHome from './pages/dashboard/DashHome'
import DashSettings from './pages/dashboard/DashSettings'
import DashExhibitionEdit from './pages/dashboard/DashExhibitionEdit'
import DashArtworks from './pages/dashboard/DashArtworks'
import AccountPage from './pages/AccountPage'
import AccountSetup from './pages/AccountSetup'

export default function App() {
  const [session, setSession] = useState(() => (supabase ? undefined : null))

  useEffect(() => {
    if (!supabase) return undefined
    let isMounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (isMounted) setSession(data.session)
    }).catch(() => {
      if (isMounted) setSession(null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s))
    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  if (session === undefined) return null

  return (
    <AuthContext.Provider value={{ session }}>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<AllExhibitionsPage />} />
          <Route path="/orgs" element={<OrgsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/account/setup" element={<AccountSetup />} />
          <Route path="/:orgSlug/exhibition/:exhibitionSlug" element={<ExhibitionPage />} />
          <Route path="/:orgSlug/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
          <Route path="/:orgSlug/dashboard" element={<ProtectedRoute><DashHome /></ProtectedRoute>} />
          <Route path="/:orgSlug/dashboard/settings" element={<ProtectedRoute><DashSettings /></ProtectedRoute>} />
          <Route path="/:orgSlug/dashboard/exhibitions/new" element={<ProtectedRoute><DashExhibitionEdit /></ProtectedRoute>} />
          <Route path="/:orgSlug/dashboard/exhibitions/:exhibitionId/edit" element={<ProtectedRoute><DashExhibitionEdit /></ProtectedRoute>} />
          <Route path="/:orgSlug/dashboard/exhibitions/:exhibitionId/artworks" element={<ProtectedRoute><DashArtworks /></ProtectedRoute>} />
          <Route path="/:orgSlug" element={<OrgPage />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  )
}
