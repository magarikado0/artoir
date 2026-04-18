import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { AuthContext } from './lib/auth'
import HomePage from './pages/HomePage'
import AllExhibitionsPage from './pages/AllExhibitionsPage'
import OrgPage from './pages/OrgPage'
import ExhibitionPage from './pages/ExhibitionPage'
import LoginPage from './pages/LoginPage'
import AdminPage from './pages/AdminPage'
import ProtectedRoute from './components/ProtectedRoute'

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
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/exhibitions" element={<AllExhibitionsPage />} />
          <Route path="/:orgSlug/exhibition/:exhibitionSlug" element={<ExhibitionPage />} />
          <Route path="/:orgSlug/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
          <Route path="/:orgSlug" element={<OrgPage />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  )
}
