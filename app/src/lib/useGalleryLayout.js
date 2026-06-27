import { useEffect, useState } from 'react'

const STORAGE_KEY = 'artoir:galleryLayout'

/**
 * 作品一覧の並び: 'wall'（現状の可変サイズ）/ 'grid'（均質な行列）。
 * 設定は端末（localStorage）に保持し、展覧会ページ・プロフィールページで共有する。
 */
export function useGalleryLayout() {
  const [layout, setLayout] = useState(() =>
    (typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEY) === 'grid') ? 'grid' : 'wall',
  )

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, layout) } catch { /* localStorage 不可環境は無視 */ }
  }, [layout])

  return [layout, setLayout]
}
