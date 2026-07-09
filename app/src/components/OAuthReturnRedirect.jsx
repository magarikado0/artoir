import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import {
  OAUTH_RETURN_KEY,
  DEFAULT_POST_LOGIN_PATH,
  peekOAuthRedirectPending,
  normalizeOAuthReturnPath,
  clearOAuthReturnState,
  resolvePostLoginPath,
} from '../lib/oauthReturn'
import { supabase } from '../lib/supabase'

/**
 * 「Google で続ける」復帰先が /login 以外でも、セッション確立後に意図したパスへ飛ばす。
 * （Supabase の Site URL が / のときなど、OAuth 復帰がトップになるケースも含む）
 */
export default function OAuthReturnRedirect() {
  const navigate = useNavigate()
  const { session } = useAuth()

  useEffect(() => {
    if (!session) return
    if (!peekOAuthRedirectPending()) return
    let cancelled = false

    async function redirect() {
      let target = DEFAULT_POST_LOGIN_PATH
      try {
        const stored = sessionStorage.getItem(OAUTH_RETURN_KEY)
        if (stored) target = normalizeOAuthReturnPath(stored)
      } catch { /* ignore */ }

      target = await resolvePostLoginPath(supabase, session.user?.id, target)
      if (cancelled) return
      clearOAuthReturnState()
      navigate(target, { replace: true })
    }

    redirect()
    return () => { cancelled = true }
  }, [session, navigate])

  return null
}
