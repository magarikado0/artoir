import { useEffect, useState } from 'react'

/**
 * 画像URLの自然サイズ(naturalWidth/Height)を読み込んで返すフック。
 * 写真ウォールのレイアウトに必要な width/height を、DB に保存が無くても得るための手段。
 *
 * @param {{id:string,url:string}[]} sources 計測対象（呼び出し側で useMemo して安定させること）
 * @returns {Map<string,{width:number,height:number}>} id → サイズ
 */
export function useImageNaturalSizes(sources) {
  const [sizes, setSizes] = useState(() => new Map())

  useEffect(() => {
    let active = true
    const images = []

    sources.forEach(({ id, url }) => {
      if (!url) return
      const img = new Image()
      img.onload = () => {
        if (!active) return
        setSizes((prev) => {
          if (prev.has(id)) return prev
          const next = new Map(prev)
          next.set(id, {
            width: img.naturalWidth || 1,
            height: img.naturalHeight || 1,
          })
          return next
        })
      }
      img.src = url
      images.push(img)
    })

    return () => {
      active = false
      images.forEach((img) => { img.onload = null })
    }
  }, [sources])

  return sizes
}
