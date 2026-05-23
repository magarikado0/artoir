import { useEffect, useState } from 'react'
import { T } from '../lib/tokens'

function PlaceholderBadge({ label, caption }) {
  return (
    <div style={{ display: 'grid', placeItems: 'center', gap: 6, padding: 16, textAlign: 'center' }}>
      <span style={{
        fontFamily: T.serif,
        fontSize: 12,
        lineHeight: 1.4,
        color: T.ink,
        background: T.gold,
        border: `1px solid ${T.ink}`,
        padding: '4px 10px',
        borderRadius: 999,
        maxWidth: '100%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
      {caption && (
        <span style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.08em', color: T.inkMuted }}>
          {caption}
        </span>
      )}
    </div>
  )
}

export default function ArtworkMedia({
  src,
  alt = '',
  label,
  decorative = false,
  loading = 'lazy',
  fit = 'cover',
  aspectRatio,
  fillHeight = false,
  background = T.surfaceMuted,
  minHeight,
  className,
  wrapperStyle,
  imageStyle,
  onLoad,
  onError,
}) {
  const [status, setStatus] = useState(src ? 'loading' : 'error')

  useEffect(() => {
    setStatus(src ? 'loading' : 'error')
  }, [src])

  const title = label || alt || '画像'
  const containerStyle = {
    position: 'relative',
    width: '100%',
    height: fillHeight ? '100%' : undefined,
    minHeight,
    background,
    overflow: 'hidden',
    ...wrapperStyle,
  }

  if (aspectRatio) containerStyle.aspectRatio = aspectRatio

  if (!src) {
    const caption = '画像を表示できません'
    return (
      <div
        className={className}
        style={{
          ...containerStyle,
          display: 'grid',
          placeItems: 'center',
        }}
        aria-hidden={decorative ? 'true' : undefined}
        aria-busy={undefined}
        role={decorative ? undefined : 'img'}
        aria-label={decorative ? undefined : `${title} ${caption}`}
      >
        {!decorative && <PlaceholderBadge label={title} caption={caption} />}
      </div>
    )
  }

  if (status === 'error') {
    const caption = status === 'loading' ? '読み込み中' : '画像を表示できません'
    return (
      <div
        className={className}
        style={{
          ...containerStyle,
          display: 'grid',
          placeItems: 'center',
        }}
        aria-hidden={decorative ? 'true' : undefined}
        aria-busy={!decorative && status === 'loading' ? 'true' : undefined}
        role={decorative ? undefined : 'img'}
        aria-label={decorative ? undefined : `${title} ${caption}`}
      >
        {!decorative && <PlaceholderBadge label={title} caption={caption} />}
      </div>
    )
  }

  return (
    <div className={className} style={{ ...containerStyle, display: 'block' }}>
      {status !== 'loaded' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        >
          {!decorative && <PlaceholderBadge label={title} caption="読み込み中" />}
        </div>
      )}
      <img
        src={src}
        alt={decorative ? '' : alt || label || ''}
        loading={loading}
        decoding="async"
        onLoad={(e) => {
          setStatus('loaded')
          onLoad?.(e)
        }}
        onError={(e) => {
          setStatus('error')
          onError?.(e)
        }}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          display: 'block',
          objectFit: fit,
          opacity: status === 'loaded' ? 1 : 0,
          transition: 'opacity 160ms ease',
          ...imageStyle,
        }}
      />
    </div>
  )
}