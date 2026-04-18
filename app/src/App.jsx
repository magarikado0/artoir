import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import HomePage from './pages/HomePage'
import AllExhibitionsPage from './pages/AllExhibitionsPage'
import OrgPage from './pages/OrgPage'
import ExhibitionPage from './pages/ExhibitionPage'
import LoginPage from './pages/LoginPage'

export const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    if (!supabase) {
      setSession(null)
      return
    }
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return null

  return (
    <AuthContext.Provider value={{ session }}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          {/* 管理画面は認証必須 — 例: /admin */}
          {/* <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} /> */}
          <Route path="/exhibitions" element={<AllExhibitionsPage />} />
          <Route path="/:orgSlug/exhibition/:exhibitionSlug" element={<ExhibitionPage />} />
          <Route path="/:orgSlug" element={<OrgPage />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  )
}
