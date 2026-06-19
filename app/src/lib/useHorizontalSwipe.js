import { useEffect, useRef } from 'react'

const SWIPE_THRESHOLD_PX = 48

/**
 * 要素上の水平スワイプ（左右）を検知し、onPrev / onNext を呼ぶ。
 * 縦スクロールと誤判定しないよう、水平移動が垂直移動より大きい場合のみ反応する。
 */
export function useHorizontalSwipe(ref, { onPrev, onNext, enabled = true }) {
  const startRef = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !enabled) return undefined

    function onTouchStart(e) {
      const touch = e.changedTouches?.[0]
      if (!touch) return
      startRef.current = { x: touch.clientX, y: touch.clientY }
    }

    function onTouchEnd(e) {
      const touch = e.changedTouches?.[0]
      const start = startRef.current
      startRef.current = null
      if (!touch || !start) return

      const dx = touch.clientX - start.x
      const dy = touch.clientY - start.y
      if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy)) return

      if (dx < 0) onNext?.()
      else onPrev?.()
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [enabled, onPrev, onNext, ref])
}
