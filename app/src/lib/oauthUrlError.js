/**
 * Supabase / OAuth が URL に載せて返す error / error_description を読む（フラグメント両対応）。
 * 開発者コンソールに出さない構成でも画面上で理由を伝えられるようにする。
 */
export function peekSupabaseAuthUrlErrorFromWindow() {
  if (typeof window === 'undefined') return ''

  try {
    const url = new URL(window.location.href)
    const qp = url.searchParams
    const hp = url.hash.includes('=')
      ? new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : url.hash)
      : null

    const pickFrom = (p) => {
      if (!p) return ''
      const desc = p.get('error_description')
      const code = p.get('error_code')
      const err = p.get('error')

      let line = ''
      if (desc) {
        try {
          line = decodeURIComponent(desc.replace(/\+/g, ' '))
        } catch {
          line = desc
        }
      } else if (err) {
        try {
          line = decodeURIComponent(err.replace(/\+/g, ' '))
        } catch {
          line = err
        }
        if (code) line = `${line} (${code})`
      }
      return line
    }

    const a = pickFrom(qp)
    if (a) return a
    return pickFrom(hp)
  } catch {
    return ''
  }
}

/** 「Unable to exchange external code」系 — Google ↔ Supabase のサーバー側交換が失敗したとき */
export function isGoogleExchangeExternalCodeError(text) {
  return typeof text === 'string' && text.includes('Unable to exchange external code')
}

/** このフロントの Supabase プロジェクトに対応する、Google の「承認済みリダイレクト URI」に入れるべき URL */
export function getSupabaseAuthCallbackUrlForGoogle() {
  const u = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_SUPABASE_URL : ''
  if (!u || typeof u !== 'string') return ''
  try {
    return `${new URL(u).origin}/auth/v1/callback`
  } catch {
    return ''
  }
}
