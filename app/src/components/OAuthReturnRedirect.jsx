import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import {
  OAUTH_RETURN_KEY,
  peekOAuthRedirectPending,
  normalizeOAuthReturnPath,
  clearOAuthReturnState,
} from '../lib/oauthReturn'

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

    let target = '/account'
    try {
      const stored = sessionStorage.getItem(OAUTH_RETURN_KEY)
      if (stored) target = normalizeOAuthReturnPath(stored)
    } catch { /* ignore */ }

    clearOAuthReturnState()
    navigate(target, { replace: true })
  }, [session, navigate])

  return null
}
