export const OAUTH_RETURN_KEY = 'oauthReturnTo'
export const OAUTH_PENDING_KEY = 'oauthPending'

/** 「Google で続ける」の保留状態の最大寿命（過去のフラグ残骸で誤遷移しないため） */
export const OAUTH_PENDING_TTL_MS = 15 * 60 * 1000

/** Same-origin pathname only — blocks `//evil` open redirects */
export function normalizeOAuthReturnPath(path) {
  if (!path || typeof path !== 'string') return '/account'
  if (!path.startsWith('/') || path.startsWith('//')) return '/account'
  if (path === '/login') return '/account'
  return path
}

/** OAuth コールバック直後（PKCEの code / implicit の fragment） — ログ用・将来の検知に使用可 */
export function hasOAuthRedirectMarker(search, hash) {
  try {
    const qs = typeof search === 'string'
      ? (search.startsWith('?') ? search.slice(1) : search)
      : ''
    if (new URLSearchParams(qs).has('code')) return true
  } catch { /* noop */ }
  return typeof hash === 'string' && hash.includes('access_token')
}

export function markOAuthRedirectPending() {
  try {
    sessionStorage.setItem(OAUTH_PENDING_KEY, String(Date.now()))
  } catch { /* ignore */ }
}

/** Google OAuth 開始前にセットした pending が有効なら true */
export function peekOAuthRedirectPending() {
  try {
    const v = sessionStorage.getItem(OAUTH_PENDING_KEY)
    if (!v) return false
    if (v === '1') {
      sessionStorage.removeItem(OAUTH_PENDING_KEY)
      sessionStorage.removeItem(OAUTH_RETURN_KEY)
      return false
    }
    const t = Number(v)
    if (!Number.isFinite(t) || Date.now() - t > OAUTH_PENDING_TTL_MS) {
      sessionStorage.removeItem(OAUTH_PENDING_KEY)
      sessionStorage.removeItem(OAUTH_RETURN_KEY)
      return false
    }
    return true
  } catch {
    return false
  }
}

export function clearOAuthReturnState() {
  try {
    sessionStorage.removeItem(OAUTH_RETURN_KEY)
    sessionStorage.removeItem(OAUTH_PENDING_KEY)
  } catch { /* ignore */ }
}

export function stashOAuthReturnPath(returnPathname) {
  try {
    sessionStorage.setItem(OAUTH_RETURN_KEY, normalizeOAuthReturnPath(returnPathname))
  } catch { /* ignore */ }
}
