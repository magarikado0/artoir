import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from './auth'
import { FavoritesContext } from './favoritesContext'
import { FAVORITE_TYPES, addFavorite, fetchFavoriteIds, removeFavorite } from './favorites'

function emptyMap() {
  return FAVORITE_TYPES.reduce((acc, type) => ({ ...acc, [type]: new Set() }), {})
}

/**
 * ログイン中ユーザーのお気に入り（いいね/ブックマーク）状態をメモリ上に保持する Provider。
 * ボタンが複数ページ・複数箇所に出るため、ログイン時に一度だけ全 type を読み込んで共有する。
 */
export function FavoritesProvider({ children }) {
  const { session } = useAuth()
  const profileId = session?.user?.id ?? null
  const [favorites, setFavorites] = useState(emptyMap)
  const [pending, setPending] = useState(() => new Set())
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!profileId) {
      setFavorites(emptyMap())
      setLoaded(true)
      return undefined
    }
    let active = true
    setLoaded(false)
    Promise.all(FAVORITE_TYPES.map((type) => fetchFavoriteIds(type))).then((sets) => {
      if (!active) return
      setFavorites(FAVORITE_TYPES.reduce((acc, type, i) => ({ ...acc, [type]: sets[i] }), {}))
      setLoaded(true)
    })
    return () => { active = false }
  }, [profileId])

  const toggle = useCallback(async (targetType, targetId) => {
    if (!profileId || !targetId) return
    const key = `${targetType}:${targetId}`
    const wasFavorite = favorites[targetType]?.has(targetId)

    // 楽観的更新
    setPending((prev) => new Set(prev).add(key))
    setFavorites((prev) => {
      const next = new Set(prev[targetType])
      if (wasFavorite) next.delete(targetId)
      else next.add(targetId)
      return { ...prev, [targetType]: next }
    })

    try {
      if (wasFavorite) await removeFavorite(targetType, targetId)
      else await addFavorite(targetType, targetId, profileId)
    } catch (error) {
      console.warn('[favorites] toggle failed', error?.message)
      // 失敗時ロールバック
      setFavorites((prev) => {
        const next = new Set(prev[targetType])
        if (wasFavorite) next.add(targetId)
        else next.delete(targetId)
        return { ...prev, [targetType]: next }
      })
    } finally {
      setPending((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }, [favorites, profileId])

  const value = useMemo(() => ({
    favorites,
    pending,
    toggle,
    loaded,
    isLoggedIn: Boolean(profileId),
  }), [favorites, pending, toggle, loaded, profileId])

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}
