import { useEffect, useState } from 'react'
import { T } from '../lib/tokens'

// PLACEHOLDER FRAMES — replace with real コマ送り images later.
// To swap to images:
//   1. 画像を app/src/assets/loading/ などに置く
//   2. import frame1 from '../assets/loading/frame1.svg' のように読み込む
//   3. DEFAULT_FRAMES = [frame1, frame2, frame3, ...] に置き換える
const DEFAULT_FRAMES = ['.  ', '.. ', '...', ' ..', '  .']
const DEFAULT_INTERVAL = 180

function isImageSrc(value) {
  return typeof value === 'string' && /\.(svg|png|jpe?g|webp|gif|avif)(\?.*)?$/i.test(value)
}

export default function LoadingFrames({
  frames = DEFAULT_FRAMES,
  interval = DEFAULT_INTERVAL,
  size = 32,
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
        style={{ width: size, height: size, display: 'block' }}
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
