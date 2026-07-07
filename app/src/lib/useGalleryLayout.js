import { useEffect, useState } from 'react'

const STORAGE_KEY = 'artoir:galleryLayout'
const VALID_LAYOUTS = ['wall', 'justified', 'grid']
const DEFAULT_LAYOUT = 'wall'

function readStoredLayout() {
  // Cookie ブロック環境では localStorage への参照自体が SecurityError を投げるため try/catch 必須。
  try {
    if (typeof window === 'undefined') return DEFAULT_LAYOUT
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return VALID_LAYOUTS.includes(stored) ? stored : DEFAULT_LAYOUT
  } catch {
    return DEFAULT_LAYOUT
  }
}

/**
 * 作品一覧の並び: 'wall'（現状の可変サイズ）/ 'justified'（段組・Flickr 風）/ 'grid'（均質な行列）。
 * 設定は端末（localStorage）に保持し、展覧会ページ・プロフィールページで共有する。
 */
export function useGalleryLayout() {
  const [layout, setLayout] = useState(readStoredLayout)

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, layout) } catch { /* localStorage 不可環境は無視 */ }
  }, [layout])

  return [layout, setLayout]
}
