import { useEffect, useRef, useState } from 'react'

const DEFAULT_MIN_MS = 800

export function useDelayedLoading(loading, minMs = DEFAULT_MIN_MS) {
  const [extended, setExtended] = useState(loading)
  const startRef = useRef(null)

  useEffect(() => {
    if (loading) {
      if (startRef.current == null) startRef.current = Date.now()
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExtended(true)
      return undefined
    }
    const start = startRef.current
    if (start == null) {
      setExtended(false)
      return undefined
    }
    const remaining = Math.max(0, minMs - (Date.now() - start))
    if (remaining === 0) {
      setExtended(false)
      startRef.current = null
      return undefined
    }
    const id = setTimeout(() => {
      setExtended(false)
      startRef.current = null
    }, remaining)
    return () => clearTimeout(id)
  }, [loading, minMs])

  return extended
}
