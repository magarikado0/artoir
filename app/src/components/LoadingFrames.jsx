import { useEffect, useState } from 'react'
import { T } from '../lib/tokens'
import frame1 from '../assets/frame1.png'
import frame2 from '../assets/frame2.png'
import frame3 from '../assets/frame3.png'
import frame4 from '../assets/frame4.png'

const DEFAULT_FRAMES = [frame1, frame2, frame3, frame4]
const DEFAULT_INTERVAL = 180
const DEFAULT_WIDTH = 80

function isImageSrc(value) {
  return typeof value === 'string' && /\.(svg|png|jpe?g|webp|gif|avif)(\?.*)?$/i.test(value)
}

export default function LoadingFrames({
  frames = DEFAULT_FRAMES,
  interval = DEFAULT_INTERVAL,
  size = DEFAULT_WIDTH,
  color,
  fontSize = 11,
  alt = '',
}) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!frames || frames.length <= 1) return undefined
    const id = setInterval(() => setIndex((v) => (v + 1) % frames.length), interval)
    return () => clearInterval(id)
  }, [frames, interval])

  const frame = frames[index]

  if (isImageSrc(frame)) {
    return (
      <img
        src={frame}
        alt={alt}
        aria-hidden={alt ? undefined : 'true'}
        style={{ width: size, height: 'auto', display: 'inline-block', verticalAlign: 'middle' }}
      />
    )
  }

  return (
    <span
      style={{
        fontFamily: T.mono,
        color: color || T.inkMuted,
        letterSpacing: '0.2em',
        fontSize,
        whiteSpace: 'pre',
        display: 'inline-block',
        minWidth: '3ch',
        textAlign: 'left',
      }}
    >
      {frame}
    </span>
  )
}
