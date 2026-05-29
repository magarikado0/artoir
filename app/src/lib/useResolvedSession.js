import { useEffect, useState } from 'react'
import { useAuth } from './auth'
import { supabase } from './supabase'

/** Context の session が一瞬 null でも、Supabase 側のセッションを確認してから表示を決める */
export function useResolvedSession() {
  const { session } = useAuth()
  const [resolvedSession, setResolvedSession] = useState(session ?? null)
  const [ready, setReady] = useState(Boolean(session))

  useEffect(() => {
    if (session) {
      setResolvedSession(session)
      setReady(true)
      return undefined
    }

    if (!supabase) {
      setResolvedSession(null)
      setReady(true)
      return undefined
    }

    let cancelled = false
    setReady(false)
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setResolvedSession(data.session ?? null)
      setReady(true)
    }).catch(() => {
      if (!cancelled) {
        setResolvedSession(null)
        setReady(true)
      }
    })

    return () => { cancelled = true }
  }, [session])

  return { session: resolvedSession, ready }
}
