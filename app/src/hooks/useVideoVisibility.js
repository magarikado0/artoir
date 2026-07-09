import { useEffect, useRef, useState } from 'react'

export default function useVideoVisibility({ threshold = 0.45 } = {}) {
  const ref = useRef(null)
  const [isVisible, setIsVisible] = useState(() => (
    typeof window !== 'undefined' && typeof IntersectionObserver === 'undefined'
  ))

  useEffect(() => {
    const node = ref.current
    if (!node || typeof IntersectionObserver === 'undefined') return undefined

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting && entry.intersectionRatio >= threshold),
      { threshold: [0, threshold, 0.75] },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [threshold])

  return { ref, isVisible }
}
