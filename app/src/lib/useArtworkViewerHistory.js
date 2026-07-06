import { useCallback, useEffect, useRef, useState } from 'react'

const STATE_KEY = 'artworkViewerArtworkId'
const PARAM = 'artwork'

function urlWithArtworkParam(id) {
  const url = new URL(window.location.href)
  if (id == null) url.searchParams.delete(PARAM)
  else url.searchParams.set(PARAM, String(id))
  return `${url.pathname}${url.search}${url.hash}`
}

function stateWithArtwork(id) {
  const base = { ...(window.history.state || {}) }
  if (id == null) delete base[STATE_KEY]
  else base[STATE_KEY] = id
  return base
}

/**
 * 作品ビューアの開閉を履歴（pushState / popstate）と `?artwork={id}` パラメータに同期するフック。
 * - openArtwork: エントリを積んで開く（ブラウザバックで閉じられる）
 * - selectArtwork: 開いたままフォーカスを移す（replaceState。履歴は増やさない）
 * - closeArtwork: 積んだエントリがあれば history.back()、なければ状態と URL を掃除
 * - `?artwork={id}` 付きで開かれた場合はその作品でビューアを開く（ディープリンク）
 */
export function useArtworkViewerHistory(artworks) {
  const [selectedArtwork, setSelectedArtwork] = useState(null)
  const deepLinkCheckedRef = useRef(false)

  const openArtwork = useCallback((artwork) => {
    if (!artwork) return
    window.history.pushState(stateWithArtwork(artwork.id), '', urlWithArtworkParam(artwork.id))
    setSelectedArtwork(artwork)
  }, [])

  const selectArtwork = useCallback((artwork) => {
    if (!artwork) return
    if (window.history.state?.[STATE_KEY]) {
      window.history.replaceState(stateWithArtwork(artwork.id), '', urlWithArtworkParam(artwork.id))
    } else {
      window.history.pushState(stateWithArtwork(artwork.id), '', urlWithArtworkParam(artwork.id))
    }
    setSelectedArtwork(artwork)
  }, [])

  const closeArtwork = useCallback(() => {
    if (window.history.state?.[STATE_KEY]) {
      window.history.back()
      return
    }
    window.history.replaceState(stateWithArtwork(null), '', urlWithArtworkParam(null))
    setSelectedArtwork(null)
  }, [])

  useEffect(() => {
    const handlePopState = (event) => {
      const artworkId = event.state?.[STATE_KEY]
      if (!artworkId) {
        setSelectedArtwork(null)
        return
      }
      const nextArtwork = artworks.find((artwork) => String(artwork.id) === String(artworkId)) || null
      setSelectedArtwork(nextArtwork)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [artworks])

  // ディープリンク: マウント後、作品リストが揃った時点で ?artwork={id} を解決する
  useEffect(() => {
    if (deepLinkCheckedRef.current || artworks.length === 0) return
    deepLinkCheckedRef.current = true

    const params = new URLSearchParams(window.location.search)
    const id = params.get(PARAM)
    if (!id) return
    const artwork = artworks.find((item) => String(item.id) === String(id))
    if (!artwork) return

    // レンダー直後の連鎖更新を避けるため、マイクロタスクでビューアを開く
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      if (window.history.state?.[STATE_KEY]) {
        // リロードなどで state が残っている場合はエントリを積み直さない
        setSelectedArtwork(artwork)
        return
      }
      // ベースのエントリからパラメータを外した上でビューア用エントリを積む。
      // こうすると「閉じる = back」でパラメータなしのページに戻れる。
      window.history.replaceState(stateWithArtwork(null), '', urlWithArtworkParam(null))
      window.history.pushState(stateWithArtwork(artwork.id), '', urlWithArtworkParam(artwork.id))
      setSelectedArtwork(artwork)
    })
    return () => { cancelled = true }
  }, [artworks])

  return { selectedArtwork, openArtwork, selectArtwork, closeArtwork }
}
