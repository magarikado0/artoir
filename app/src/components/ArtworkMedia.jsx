import { useState } from 'react'
import { T } from '../lib/tokens'

function PlaceholderBadge({ label, caption }) {
  return (
    <div style={{ display: 'grid', placeItems: 'center', gap: 8, padding: 16, textAlign: 'center' }}>
      <span style={{
        fontFamily: T.serif,
        fontSize: 13,
        lineHeight: 1.4,
        color: T.inkSoft,
        maxWidth: '100%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
      {caption && (
        <span style={{ fontSize: 11, letterSpacing: '0.02em', color: T.inkMuted }}>
          {caption}
        </span>
      )}
    </div>
  )
}

function ArtworkMediaPlaceholder({
  className,
  containerStyle,
  decorative,
  title,
  caption,
}) {
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

function imageContainStyle(fit, intrinsic, layered = false) {
  if (intrinsic) return { width: '100%', height: 'auto' }
  if (fit === 'contain') {
    const base = {
      maxWidth: '100%',
      maxHeight: '100%',
      width: 'auto',
      height: 'auto',
      objectFit: 'contain',
    }
    if (layered) {
      return {
        ...base,
        position: 'absolute',
        inset: 0,
        margin: 'auto',
      }
    }
    return base
  }
  return {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: fit,
  }
}

function ArtworkMediaImage({
  src,
  placeholderSrc,
  alt,
  label,
  decorative,
  loading,
  fit,
  naturalSize,
  className,
  containerStyle,
  imageStyle,
  onLoad,
  onError,
}) {
  const [status, setStatus] = useState('loading')
  const title = label || alt || '画像'
  const intrinsic = fit === 'contain' && naturalSize
  const showPlaceholder = Boolean(placeholderSrc) && status !== 'loaded'
  const layered = Boolean(placeholderSrc)
  const containStyle = imageContainStyle(fit, intrinsic, layered)

  if (status === 'error') {
    return (
      <ArtworkMediaPlaceholder
        className={className}
        containerStyle={containerStyle}
        decorative={decorative}
        title={title}
        caption="画像を表示できません"
      />
    )
  }

  return (
    <div
      className={className}
      style={{
        ...containerStyle,
        display: intrinsic ? 'block' : fit === 'contain' && !layered ? 'flex' : 'block',
        alignItems: !intrinsic && fit === 'contain' && !layered ? 'center' : undefined,
        justifyContent: !intrinsic && fit === 'contain' && !layered ? 'center' : undefined,
        lineHeight: intrinsic ? 0 : undefined,
      }}
    >
      {showPlaceholder && (
        <img
          src={placeholderSrc}
          alt=""
          aria-hidden="true"
          decoding="async"
          className="ui-artwork-media-placeholder"
          style={{
            ...containStyle,
            display: 'block',
            ...imageStyle,
          }}
        />
      )}
      {status !== 'loaded' && !placeholderSrc && (
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
        fetchPriority={loading === 'eager' ? 'high' : undefined}
        onLoad={(e) => {
          setStatus('loaded')
          onLoad?.(e)
        }}
        onError={(e) => {
          setStatus('error')
          onError?.(e)
        }}
        style={{
          ...containStyle,
          display: 'block',
          opacity: status === 'loaded' ? 1 : 0,
          transition: 'opacity 200ms ease',
          ...imageStyle,
        }}
      />
    </div>
  )
}

export default function ArtworkMedia({
  src,
  placeholderSrc,
  alt = '',
  label,
  decorative = false,
  loading = 'lazy',
  fit = 'cover',
  aspectRatio,
  fillHeight = false,
  naturalSize = false,
  background = 'transparent',
  minHeight,
  className,
  wrapperStyle,
  imageStyle,
  onLoad,
  onError,
}) {
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
    return (
      <ArtworkMediaPlaceholder
        className={className}
        containerStyle={containerStyle}
        decorative={decorative}
        title={title}
        caption="画像を表示できません"
      />
    )
  }

  return (
    <ArtworkMediaImage
      key={src}
      src={src}
      placeholderSrc={placeholderSrc}
      alt={alt}
      label={label}
      decorative={decorative}
      loading={loading}
      fit={fit}
      naturalSize={naturalSize}
      className={className}
      containerStyle={containerStyle}
      imageStyle={imageStyle}
      onLoad={onLoad}
      onError={onError}
    />
  )
}