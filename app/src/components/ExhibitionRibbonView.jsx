import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ArtworkMedia from './ArtworkMedia'
import { getGalleryThumbnailUrl, getModalImageUrl, preloadImageUrl } from '../lib/imageUrl'
import { profilePath } from '../lib/profileRoutes'

const SLOT_BG = '#F7F8F6'
const DRAG_SENSITIVITY = 0.34
const FRICTION = 0.92
const SNAP_EASE = 0.14
const MIN_VEL = 0.06
const DEFAULT_AR = 0.8

function fitCardToBox(ar, maxW, maxH) {
  const safeAr = ar > 0 ? ar : DEFAULT_AR
  if (safeAr >= maxW / maxH) {
    const w = maxW
    const h = maxW / safeAr
    return { w, h }
  }
  const h = maxH
  const w = maxH * safeAr
  return { w, h }
}

function RibbonNavIcon({ direction }) {
  const s = { stroke: 'currentColor', strokeWidth: 1.8, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" aria-hidden="true">
      {direction === 'prev' ? (
        <path d="M14 6l-6 6 6 6" {...s} />
      ) : (
        <path d="M10 6l6 6-6 6" {...s} />
      )}
    </svg>
  )
}

function composeArtworkMeta(artwork) {
  const material = artwork?.material || artwork?.medium
  const size = artwork?.size || artwork?.dimensions
  const parts = []
  if (material) parts.push(material)
  if (size) parts.push(size)
  return parts.join('　·　')
}

function padNum(n) {
  return String(n).padStart(2, '0')
}

function computeSize() {
  if (typeof window === 'undefined') return { maxW: 480, maxH: 520 }
  const w = window.innerWidth
  const h = window.innerHeight
  const maxW = Math.max(240, Math.min(w - 64, 1100))
  const maxH = Math.max(240, Math.min(h * 0.62, 600))
  return { maxW, maxH }
}

function norm180(deg) {
  let d = deg % 360
  if (d > 180) d -= 360
  else if (d < -180) d += 360
  return d
}

export default function ExhibitionRibbonView({ artworks, onClose }) {
  const items = useMemo(() => artworks.filter((a) => a.image_url), [artworks])
  const N = items.length

  const [size, setSize] = useState(computeSize)
  const [aspects, setAspects] = useState({})
  useEffect(() => {
    const onResize = () => setSize(computeSize())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    let cancelled = false
    items.forEach((artwork) => {
      const url = getGalleryThumbnailUrl(artwork.image_url)
      const img = new Image()
      img.onload = () => {
        if (cancelled) return
        if (!img.naturalWidth || !img.naturalHeight) return
        const ar = img.naturalWidth / img.naturalHeight
        setAspects((prev) => (prev[artwork.id] ? prev : { ...prev, [artwork.id]: ar }))
      }
      img.src = url
    })
    return () => { cancelled = true }
  }, [items])

  const theta = N > 1 ? 360 / N : 360
  const radius = useMemo(() => {
    if (N <= 1) return Math.max(size.maxW, 320)
    const half = Math.min(89.5, theta / 2)
    const r = (size.maxW / 2) / Math.tan((half * Math.PI) / 180)
    return Math.max(r, size.maxW * 0.8)
  }, [N, theta, size.maxW])

  const stageRef = useRef(null)
  const cylinderRef = useRef(null)
  const itemRefs = useRef([])
  const rotationRef = useRef(0)
  const velRef = useRef(0)
  const targetRef = useRef(0)
  const modeRef = useRef('idle')
  const draggingRef = useRef(false)
  const movedRef = useRef(false)
  const lastXRef = useRef(0)
  const lastTRef = useRef(0)
  const rafRef = useRef(0)
  const focusedRef = useRef(0)
  const thetaRef = useRef(theta)
  const radiusRef = useRef(radius)
  useEffect(() => {
    thetaRef.current = theta
    radiusRef.current = radius
  }, [theta, radius])

  const [focused, setFocused] = useState(0)
  const [dragging, setDragging] = useState(false)

  const apply = useCallback(() => {
    const rot = rotationRef.current
    const cyl = cylinderRef.current
    if (cyl) {
      cyl.style.transform = `translateZ(${-radiusRef.current}px) rotateY(${-rot}deg)`
    }
    const th = thetaRef.current
    const nodes = itemRefs.current
    for (let i = 0; i < nodes.length; i += 1) {
      const node = nodes[i]
      if (!node) continue
      const a = Math.abs(norm180(i * th - rot))
      let op = 1
      if (a > 8) op = Math.max(0.12, 1 - ((a - 8) / 92) * 0.88)
      if (a > 105) op = 0
      node.style.opacity = String(op)
      node.style.pointerEvents = a < 55 ? 'auto' : 'none'
      node.style.zIndex = String(Math.round(1000 - a))
    }
    const f = ((Math.round(rot / th) % N) + N) % N
    const settled = !draggingRef.current
      && modeRef.current === 'idle'
      && Math.abs(targetRef.current - rot) < 0.8
    if (settled && f !== focusedRef.current) {
      focusedRef.current = f
      setFocused(f)
    }
  }, [N])

  const applyRef = useRef(apply)
  useEffect(() => {
    applyRef.current = apply
  })

  useEffect(() => {
    const tick = () => {
      const th = thetaRef.current
      if (!draggingRef.current) {
        if (modeRef.current === 'inertia' && Math.abs(velRef.current) > MIN_VEL) {
          rotationRef.current += velRef.current
          velRef.current *= FRICTION
          targetRef.current = Math.round(rotationRef.current / th) * th
        } else {
          modeRef.current = 'idle'
          const diff = targetRef.current - rotationRef.current
          if (Math.abs(diff) < 0.25) {
            rotationRef.current = targetRef.current
            velRef.current = 0
          } else {
            rotationRef.current += diff * SNAP_EASE
          }
        }
      }
      applyRef.current()
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const goTo = useCallback((indexTarget) => {
    modeRef.current = 'idle'
    velRef.current = 0
    const th = thetaRef.current
    const current = Math.round(rotationRef.current / th)
    targetRef.current = (current + indexTarget) * th
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose?.()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goTo(-1)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        goTo(1)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose, goTo])

  useEffect(() => {
    if (N === 0) return
    const f = focused
    const preloadIdx = [f, (f + 1) % N, (f - 1 + N) % N, (f + 2) % N, (f - 2 + N) % N]
    preloadIdx.forEach((idx) => {
      const it = items[idx]
      if (it) preloadImageUrl(getModalImageUrl(it.image_url))
    })
  }, [focused, items, N])

  const onPointerDown = useCallback((e) => {
    if (N <= 1) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    draggingRef.current = true
    movedRef.current = false
    modeRef.current = 'idle'
    velRef.current = 0
    targetRef.current = rotationRef.current
    lastXRef.current = e.clientX
    lastTRef.current = performance.now()
    setDragging(true)
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* noop */ }
  }, [N])

  const onPointerMove = useCallback((e) => {
    if (!draggingRef.current) return
    const dx = e.clientX - lastXRef.current
    if (Math.abs(dx) > 3) movedRef.current = true
    lastXRef.current = e.clientX
    const now = performance.now()
    const dt = Math.max(1, now - lastTRef.current)
    lastTRef.current = now
    const delta = -dx * DRAG_SENSITIVITY
    rotationRef.current += delta
    const v = (delta / dt) * 16
    velRef.current = Math.max(-42, Math.min(42, v))
  }, [])

  const endDrag = useCallback(() => {
    if (!draggingRef.current) return
    draggingRef.current = false
    setDragging(false)
    if (Math.abs(velRef.current) > MIN_VEL * 4) {
      modeRef.current = 'inertia'
    } else {
      modeRef.current = 'idle'
      const th = thetaRef.current
      targetRef.current = Math.round(rotationRef.current / th) * th
    }
  }, [])

  const onWheel = useCallback((e) => {
    const d = e.deltaX || e.deltaY
    if (Math.abs(d) < 2) return
    e.preventDefault()
    const th = thetaRef.current
    const current = Math.round(rotationRef.current / th)
    targetRef.current = (current + Math.sign(d)) * th
    modeRef.current = 'idle'
    velRef.current = 0
  }, [])

  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onWheel])

  const onCardClick = useCallback((i) => {
    if (movedRef.current) return
    const th = thetaRef.current
    targetRef.current = i * th
    modeRef.current = 'idle'
    velRef.current = 0
  }, [])

  if (N === 0) return null

  const current = items[focused] || items[0]
  const title = current.title?.trim() ?? ''
  const description = current.description?.trim() ?? ''
  const meta = composeArtworkMeta(current)
  const visibleCreators = (current.creators || []).filter(
    (c) => c.is_visible && c.profile?.display_name,
  )
  const hasCaption = Boolean(title || description || meta || visibleCreators.length)
  const positionLabel = N > 1 ? `${padNum(focused + 1)} / ${padNum(N)}` : null

  const { maxW, maxH } = size

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="作品を巡る"
      className="ui-ribbon-overlay"
    >
      <div className="ui-ribbon-bar">
        <div className="ui-ribbon-eyebrow">巡る</div>
        {positionLabel && (
          <div className="ui-ribbon-position" aria-live="polite">
            {positionLabel}
          </div>
        )}
        <button
          type="button"
          onClick={onClose}
          className="ui-ribbon-close"
          aria-label="作品を巡る表示を閉じる"
        >
          ×
        </button>
      </div>

      <div
        ref={stageRef}
        className={`ui-ribbon-stage${dragging ? ' is-dragging' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div
          ref={cylinderRef}
          className="ui-ribbon-cylinder"
          style={{ transform: `translateZ(${-radius}px) rotateY(0deg)` }}
        >
          {items.map((artwork, i) => {
            const isFocused = i === focused
            const src = getModalImageUrl(artwork.image_url)
            const label = artwork.title?.trim() || `作品 ${i + 1}`
            const ar = aspects[artwork.id] ?? DEFAULT_AR
            const { w, h } = fitCardToBox(ar, maxW, maxH)
            return (
              <button
                key={artwork.id}
                type="button"
                ref={(el) => { itemRefs.current[i] = el }}
                className="ui-ribbon-card"
                style={{
                  width: w,
                  height: h,
                  marginLeft: -w / 2,
                  marginTop: -h / 2,
                  transform: `rotateY(${i * theta}deg) translateZ(${radius}px)`,
                }}
                onClick={() => onCardClick(i)}
                aria-label={`${label}を中央に表示`}
                tabIndex={-1}
              >
                <ArtworkMedia
                  className="ui-ribbon-card-media"
                  src={src}
                  placeholderSrc={getGalleryThumbnailUrl(artwork.image_url)}
                  alt={artwork.title || '作品画像'}
                  label={artwork.title}
                  loading={isFocused ? 'eager' : 'lazy'}
                  fit="contain"
                  fillHeight
                  background={SLOT_BG}
                  imageStyle={{ borderRadius: 6 }}
                />
              </button>
            )
          })}
        </div>

        {N > 1 && (
          <>
            <button
              type="button"
              className="ui-ribbon-nav ui-ribbon-nav--prev"
              onClick={(e) => { e.stopPropagation(); goTo(-1) }}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label="前の作品"
            >
              <RibbonNavIcon direction="prev" />
            </button>
            <button
              type="button"
              className="ui-ribbon-nav ui-ribbon-nav--next"
              onClick={(e) => { e.stopPropagation(); goTo(1) }}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label="次の作品"
            >
              <RibbonNavIcon direction="next" />
            </button>
          </>
        )}
      </div>

      {hasCaption && (
        <div className="ui-ribbon-caption">
          {title && <h2 className="ui-ribbon-title">{title}</h2>}

          {visibleCreators.length > 0 && (
            <div className="ui-ribbon-creators">
              {visibleCreators.map((creator) => {
                const creatorSlug = creator.profile?.slug
                const creatorName = creator.profile.display_name
                const key = creator.profile_id || creator.profile.id
                if (!creatorSlug) {
                  return <span key={key}>@{creatorName}</span>
                }
                return (
                  <Link key={key} to={profilePath(creatorSlug)}>
                    @{creatorName}
                  </Link>
                )
              })}
            </div>
          )}

          {meta && <div className="ui-ribbon-meta">{meta}</div>}

          {description && (
            <p className="ui-ribbon-description">{description}</p>
          )}
        </div>
      )}
    </div>
  )
}
