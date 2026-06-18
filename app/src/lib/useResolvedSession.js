import { useEffect, useState } from 'react'
import { useAuth } from './auth'
import { supabase } from './supabase'

/** Context の session が一瞬 null でも、Supabase 側のセッションを確認してから表示を決める */
export function useResolvedSession() {
  const { session } = useAuth()
  const [resolvedSession, setResolvedSession] = useState(null)
  const [resolvedReady, setResolvedReady] = useState(false)
  const [checkingFallback, setCheckingFallback] = useState(false)

  useEffect(() => {
    let cancelled = false

    if (session) {
      Promise.resolve().then(() => {
        if (cancelled) return
        setResolvedSession(null)
        setResolvedReady(false)
        setCheckingFallback(false)
      })
      return () => { cancelled = true }
    }

    if (!supabase) {
      Promise.resolve().then(() => {
        if (cancelled) return
        setResolvedSession(null)
        setResolvedReady(true)
        setCheckingFallback(false)
      })
      return () => { cancelled = true }
    }

    Promise.resolve().then(() => {
      if (cancelled) return
      setResolvedSession(null)
      setResolvedReady(false)
      setCheckingFallback(true)
    })
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setResolvedSession(data.session ?? null)
      setResolvedReady(true)
      setCheckingFallback(false)
    }).catch(() => {
      if (!cancelled) {
        setResolvedSession(null)
        setResolvedReady(true)
        setCheckingFallback(false)
      }
    })

    return () => { cancelled = true }
  }, [session])

  return {
    session: session ?? resolvedSession,
    ready: Boolean(session) || (!checkingFallback && resolvedReady),
  }
}
