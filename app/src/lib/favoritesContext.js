import { createContext, useCallback, useContext } from 'react'

export const FavoritesContext = createContext(null)

/** Provider の状態（favorites Sets / loaded / isLoggedIn / toggle）をそのまま返す。 */
export function useFavorites() {
  return useContext(FavoritesContext)
}

/**
 * 単一対象のお気に入り状態を返すフック。
 * @returns {{ isFavorite: boolean, toggle: () => void, pending: boolean, requiresLogin: boolean }}
 */
export function useFavorite(targetType, targetId) {
  const ctx = useContext(FavoritesContext)

  const isFavorite = Boolean(ctx?.favorites?.[targetType]?.has(targetId))
  const pending = Boolean(targetId && ctx?.pending?.has(`${targetType}:${targetId}`))
  const requiresLogin = !ctx?.isLoggedIn
  const ctxToggle = ctx?.toggle

  const toggle = useCallback(() => {
    ctxToggle?.(targetType, targetId)
  }, [ctxToggle, targetType, targetId])

  return { isFavorite, toggle, pending, requiresLogin }
}
