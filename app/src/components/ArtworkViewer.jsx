import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ArtworkMedia from './ArtworkMedia'
import FavoriteButton from './FavoriteButton'
import { getArtworkHighResolutionUrl, getGalleryThumbnailUrl, getModalImageUrl, preloadImageUrl } from '../lib/imageUrl'
import { profileExhibitionPath, profilePath } from '../lib/profileRoutes'
import { useHorizontalSwipe } from '../lib/useHorizontalSwipe'

const SLOT_BG = '#F7F8F6'
const DRAG_PX_PER_ITEM = 150
const MAX_DRAG_SENSITIVITY = 0.34
const FRICTION = 0.92
const SNAP_EASE = 0.14
const MIN_VEL = 0.06
const DEFAULT_AR = 0.8
const MIN_ZOOM = 1
const MAX_ZOOM = 4
const DOUBLE_TAP_MS = 280
// フォーカス中心から前後何枚を DOM に置くか（それ以外は角度を保ったままアンマウント）
const RENDER_WINDOW = 5
// ホイール送り。トラックパッドの慣性スクロールは wheel イベントが途切れず連続発火し、
// 1 イベント=1 枚送りだと速すぎる。イベント間隔が WHEEL_STREAM_GAP_MS 未満なら
// 「連続ストリーム（慣性）」とみなし、WHEEL_STEP_COOLDOWN_MS の最短間隔でしか進めない。
// マウスホイールは 1 ノッチごとに間隔が空くため判定から外れ、従来どおり 1 ノッチ=1 枚のまま。
const WHEEL_STREAM_GAP_MS = 50
const WHEEL_STEP_COOLDOWN_MS = 200

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

function ViewerNavIcon({ direction }) {
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

function computeSize(detailOpen) {
  if (typeof window === 'undefined') return { maxW: 480, maxH: 520 }
  const w = window.innerWidth
  const h = window.innerHeight
  const maxW = Math.max(240, Math.min(w - 64, 1100))
  // 詳細パネル展開中はステージが狭くなるので作品も小さめに収める
  const factor = detailOpen ? 0.44 : 0.62
  const maxH = Math.max(220, Math.min(h * factor, 600))
  return { maxW, maxH }
}

function norm180(deg) {
  let d = deg % 360
  if (d > 180) d -= 360
  else if (d < -180) d += 360
  return d
}

/** 角度差 a（deg）からカードの表示状態を求める。apply() とレンダー初期値で共有。 */
function cardPresentation(a, th, windowed) {
  let op = 1
  if (a > 8) op = Math.max(0.12, 1 - ((a - 8) / 92) * 0.88)
  if (a > 105) op = 0
  if (windowed) {
    // ウィンドウ端のカードはフェードアウトさせ、マウント/アンマウントのポップインを隠す
    const edge = RENDER_WINDOW * th
    if (a > edge - th) op *= Math.max(0, Math.min(1, (edge - a) / th))
  }
  return {
    opacity: op,
    pointerEvents: a < 55 ? 'auto' : 'none',
    zIndex: Math.round(1000 - a),
  }
}

function circularDistance(i, j, n) {
  const d = Math.abs(i - j)
  return Math.min(d, n - d)
}

function dragSensitivity(theta) {
  return Math.min(MAX_DRAG_SENSITIVITY, theta / DRAG_PX_PER_ITEM)
}

function maxFlingVelocity(theta) {
  return Math.max(0.7, Math.min(7, theta * 0.28))
}

function clampZoom(value) {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value))
}

function clampPan(value, zoom, size) {
  if (zoom <= 1) return 0
  const limit = size * (zoom - 1) * 0.5
  return Math.max(-limit, Math.min(limit, value))
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function center(a, b) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  }
}

/**
 * 作品詳細ビューア。クリックした作品を中心に開き、周囲の作品をカルーセルで巡れる。
 * - initialArtwork: 開いたときに中央へ表示する作品
 * - onArtworkChange: フォーカスが確定した作品が変わったときに呼ばれる（履歴同期用）
 * - prefers-reduced-motion 時はシリンダー回転を使わないフラット表示になる
 */
export default function ArtworkViewer({ artworks, initialArtwork = null, onArtworkChange, onClose, showCreators = true }) {
  const items = useMemo(() => artworks.filter((a) => a.image_url), [artworks])
  const N = items.length

  // 初期フォーカスはマウント時に一度だけ決める（以降のフォーカスはビューア内で管理）
  const [initialIndex] = useState(() => {
    if (!initialArtwork) return 0
    const idx = artworks
      .filter((a) => a.image_url)
      .findIndex((a) => String(a.id) === String(initialArtwork.id))
    return idx >= 0 ? idx : 0
  })

  const [reducedMotion, setReducedMotion] = useState(() => (
    typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  ))
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mq?.addEventListener) return undefined
    const onChange = () => setReducedMotion(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const [detailOpen, setDetailOpen] = useState(true)
  const [size, setSize] = useState(() => computeSize(true))
  const [aspects, setAspects] = useState({})
  useEffect(() => {
    const onResize = () => setSize(computeSize(detailOpen))
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [detailOpen])

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

  const overlayRef = useRef(null)
  const stageRef = useRef(null)
  const cylinderRef = useRef(null)
  const itemRefs = useRef([])
  const rotationRef = useRef(initialIndex * theta)
  const velRef = useRef(0)
  const targetRef = useRef(initialIndex * theta)
  const modeRef = useRef('idle')
  const draggingRef = useRef(false)
  const movedRef = useRef(false)
  const lastXRef = useRef(0)
  const lastTRef = useRef(0)
  const rafRef = useRef(0)
  const focusedRef = useRef(initialIndex)
  const windowCenterRef = useRef(initialIndex)
  const thetaRef = useRef(theta)
  const radiusRef = useRef(radius)
  const pointersRef = useRef(new Map())
  const gestureRef = useRef(null)
  const lastTapRef = useRef({ time: 0, index: -1 })
  const zoomRef = useRef(MIN_ZOOM)
  const panRef = useRef({ x: 0, y: 0 })
  const lastWheelTimeRef = useRef(0)
  const lastWheelStepRef = useRef(0)
  useEffect(() => {
    thetaRef.current = theta
    radiusRef.current = radius
  }, [theta, radius])

  const [focused, setFocused] = useState(initialIndex)
  const [windowCenter, setWindowCenter] = useState(initialIndex)
  const [dragging, setDragging] = useState(false)
  const [zoomView, setZoomView] = useState({ zoom: MIN_ZOOM, x: 0, y: 0 })

  useEffect(() => {
    focusedRef.current = focused
  }, [focused])

  // フォーカス確定の通知（初期表示分は通知しない）
  const onArtworkChangeRef = useRef(onArtworkChange)
  useEffect(() => {
    onArtworkChangeRef.current = onArtworkChange
  })
  const lastNotifiedRef = useRef(initialIndex)
  useEffect(() => {
    if (focused === lastNotifiedRef.current) return
    lastNotifiedRef.current = focused
    const item = items[focused]
    if (item) onArtworkChangeRef.current?.(item)
  }, [focused, items])

  const setZoomPan = useCallback((nextZoom, nextX = panRef.current.x, nextY = panRef.current.y) => {
    const zoom = clampZoom(nextZoom)
    const x = clampPan(nextX, zoom, size.maxW)
    const y = clampPan(nextY, zoom, size.maxH)
    zoomRef.current = zoom
    panRef.current = { x, y }
    setZoomView({ zoom, x, y })
  }, [size.maxH, size.maxW])

  useEffect(() => {
    setZoomPan(MIN_ZOOM, 0, 0)
  }, [focused, setZoomPan])

  const windowed = N > RENDER_WINDOW * 2 + 1

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
      const p = cardPresentation(a, th, windowed)
      node.style.opacity = String(p.opacity)
      node.style.pointerEvents = p.pointerEvents
      node.style.zIndex = String(p.zIndex)
    }
    const f = ((Math.round(rot / th) % N) + N) % N
    // レンダーウィンドウは回転中も追従させる（settle を待たない）
    if (f !== windowCenterRef.current) {
      windowCenterRef.current = f
      setWindowCenter(f)
    }
    const settled = !draggingRef.current
      && modeRef.current === 'idle'
      && Math.abs(targetRef.current - rot) < 0.8
    if (settled && f !== focusedRef.current) {
      focusedRef.current = f
      setFocused(f)
    }
  }, [N, windowed])

  const applyRef = useRef(apply)
  useEffect(() => {
    applyRef.current = apply
  })

  useEffect(() => {
    if (reducedMotion) return undefined
    // フラット表示から戻った場合に備えて回転位置をフォーカスに合わせ直す
    rotationRef.current = focusedRef.current * thetaRef.current
    targetRef.current = rotationRef.current
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
  }, [reducedMotion])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const goTo = useCallback((delta) => {
    if (N <= 1) return
    if (reducedMotion) {
      const next = (((focusedRef.current + delta) % N) + N) % N
      focusedRef.current = next
      windowCenterRef.current = next
      setFocused(next)
      setWindowCenter(next)
      return
    }
    modeRef.current = 'idle'
    velRef.current = 0
    const th = thetaRef.current
    const current = Math.round(rotationRef.current / th)
    targetRef.current = (current + delta) * th
  }, [N, reducedMotion])

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
    const card = e.target.closest?.('.ui-artwork-viewer-card')
    const isCard = Boolean(card)
    const isControl = Boolean(e.target.closest?.('button, a')) && !isCard
    const inStage = Boolean(stageRef.current?.contains(e.target))

    if (isControl) return

    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (e.pointerType === 'touch' && pointersRef.current.size >= 2) {
      const points = Array.from(pointersRef.current.values()).slice(-2)
      draggingRef.current = false
      movedRef.current = true
      setDragging(false)
      gestureRef.current = {
        type: 'pinch',
        distance: Math.max(1, distance(points[0], points[1])),
        center: center(points[0], points[1]),
        zoom: zoomRef.current,
        pan: { ...panRef.current },
      }
      try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* noop */ }
      return
    }

    if (zoomRef.current > MIN_ZOOM) {
      movedRef.current = false
      gestureRef.current = {
        type: 'pan',
        start: { x: e.clientX, y: e.clientY },
        pan: { ...panRef.current },
      }
      try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* noop */ }
      return
    }

    if (!inStage) return
    if (N <= 1) return
    if (reducedMotion) return
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
  }, [N, reducedMotion])

  const onPointerMove = useCallback((e) => {
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    }

    const gesture = gestureRef.current
    if (gesture?.type === 'pinch' && pointersRef.current.size >= 2) {
      const points = Array.from(pointersRef.current.values()).slice(-2)
      const nextCenter = center(points[0], points[1])
      const ratio = distance(points[0], points[1]) / gesture.distance
      setZoomPan(
        gesture.zoom * ratio,
        gesture.pan.x + nextCenter.x - gesture.center.x,
        gesture.pan.y + nextCenter.y - gesture.center.y,
      )
      return
    }

    if (gesture?.type === 'pan') {
      const dx = e.clientX - gesture.start.x
      const dy = e.clientY - gesture.start.y
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) movedRef.current = true
      setZoomPan(zoomRef.current, gesture.pan.x + dx, gesture.pan.y + dy)
      return
    }

    if (!draggingRef.current) return
    const dx = e.clientX - lastXRef.current
    if (Math.abs(dx) > 3) movedRef.current = true
    lastXRef.current = e.clientX
    const now = performance.now()
    const dt = Math.max(1, now - lastTRef.current)
    lastTRef.current = now
    const th = thetaRef.current
    const delta = -dx * dragSensitivity(th)
    rotationRef.current += delta
    const v = (delta / dt) * 16
    const maxVel = maxFlingVelocity(th)
    velRef.current = Math.max(-maxVel, Math.min(maxVel, v))
  }, [setZoomPan])

  const endDrag = useCallback((e) => {
    if (e?.pointerId != null) pointersRef.current.delete(e.pointerId)
    if (gestureRef.current) {
      gestureRef.current = null
      return
    }
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
    if (e.ctrlKey || zoomRef.current > MIN_ZOOM) {
      const nextZoom = zoomRef.current * Math.exp(-e.deltaY * 0.002)
      if (Math.abs(nextZoom - zoomRef.current) < 0.001) return
      e.preventDefault()
      setZoomPan(nextZoom)
      return
    }

    const d = e.deltaX || e.deltaY
    if (Math.abs(d) < 2) return
    e.preventDefault()

    const now = performance.now()
    const sinceLastEvent = now - lastWheelTimeRef.current
    lastWheelTimeRef.current = now
    // 連続ストリーム（トラックパッドの慣性）中は最短間隔を空けてしか進めない。
    // 離散的なマウスホイール（イベント間隔が空く）は gap が大きいので、ここでは弾かれない。
    if (sinceLastEvent < WHEEL_STREAM_GAP_MS && now - lastWheelStepRef.current < WHEEL_STEP_COOLDOWN_MS) {
      return
    }
    lastWheelStepRef.current = now

    goTo(Math.sign(d))
  }, [setZoomPan, goTo])

  useEffect(() => {
    const el = overlayRef.current
    if (!el) return
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onWheel])

  const onCardClick = useCallback((i) => {
    if (movedRef.current) return
    const now = performance.now()
    if (i === focusedRef.current && now - lastTapRef.current.time < DOUBLE_TAP_MS && lastTapRef.current.index === i) {
      setZoomPan(zoomRef.current > MIN_ZOOM ? MIN_ZOOM : 2.4, 0, 0)
      lastTapRef.current = { time: 0, index: -1 }
      return
    }
    lastTapRef.current = { time: now, index: i }
    if (reducedMotion) return
    const th = thetaRef.current
    targetRef.current = i * th
    modeRef.current = 'idle'
    velRef.current = 0
  }, [setZoomPan, reducedMotion])

  // フラット表示（reduced-motion）では左右スワイプで前後の作品へ
  const swipePrev = useCallback(() => {
    if (zoomRef.current > MIN_ZOOM) return
    goTo(-1)
  }, [goTo])
  const swipeNext = useCallback(() => {
    if (zoomRef.current > MIN_ZOOM) return
    goTo(1)
  }, [goTo])
  useHorizontalSwipe(stageRef, {
    onPrev: swipePrev,
    onNext: swipeNext,
    enabled: reducedMotion && N > 1,
  })

  const closeIfCurrentPath = useCallback((to) => {
    if (typeof window === 'undefined') return
    if (window.location.pathname === to) onClose?.()
  }, [onClose])

  if (N === 0) return null

  const current = items[focused] || items[0]
  const title = current.title?.trim() ?? ''
  const description = current.description?.trim() ?? ''
  const meta = composeArtworkMeta(current)
  const visibleCreators = showCreators
    ? (current.creators || []).filter((c) => c.profile?.display_name)
    : []
  const positionLabel = N > 1 ? `${padNum(focused + 1)} / ${padNum(N)}` : null

  const exhibition = current.exhibitions
  const ownerOrg = exhibition?.organizations
  const ownerProfile = exhibition?.profiles
  const exhibitionHref = exhibition?.slug
    ? ownerOrg?.slug
      ? `/${ownerOrg.slug}/exhibition/${exhibition.slug}`
      : ownerProfile?.slug
        ? profileExhibitionPath(ownerProfile.slug, exhibition.slug)
        : ''
    : ''
  const exhibitionTitle = exhibition?.title?.trim() || '展示を見る'
  const ownerHref = ownerProfile?.slug ? profilePath(ownerProfile.slug) : ownerOrg?.slug ? `/${ownerOrg.slug}` : ''
  const ownerName = ownerOrg?.name || ownerProfile?.display_name || ''
  const ownerLabel = ownerOrg ? '団体ページ' : 'プロフィール'
  const hasExhibitionLink = Boolean(exhibitionHref)
  const hasOwnerLink = Boolean(ownerHref)
  const hasDetailBody = Boolean(visibleCreators.length || description || meta || hasExhibitionLink || hasOwnerLink || current.id)

  const { maxW, maxH } = size
  const isZoomed = zoomView.zoom > MIN_ZOOM

  const currentAr = aspects[current.id] ?? DEFAULT_AR
  const currentBox = fitCardToBox(currentAr, maxW, maxH)

  const renderCreators = (className) => (
    <div className={className}>
      {visibleCreators.map((creator) => {
        const creatorSlug = creator.profile?.slug
        const creatorName = creator.profile.display_name
        const key = creator.profile_id || creator.profile.id
        if (!creatorSlug) {
          return <span key={key}>@{creatorName}</span>
        }
        const creatorHref = profilePath(creatorSlug)
        return (
          <Link key={key} to={creatorHref} onClick={() => closeIfCurrentPath(creatorHref)}>
            @{creatorName}
          </Link>
        )
      })}
    </div>
  )

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'artwork-viewer-title' : undefined}
      aria-label={title ? undefined : '作品詳細'}
      className="ui-artwork-viewer-overlay"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div className="ui-artwork-viewer-bar">
        <div className="ui-artwork-viewer-eyebrow">作品</div>
        {positionLabel && (
          <div className="ui-artwork-viewer-position" aria-live="polite">
            {positionLabel}
          </div>
        )}
        <button
          type="button"
          onClick={onClose}
          className="ui-artwork-viewer-close"
          aria-label="作品詳細を閉じる"
        >
          ×
        </button>
      </div>

      <div
        ref={stageRef}
        className={[
          'ui-artwork-viewer-stage',
          dragging && 'is-dragging',
          isZoomed && 'is-zoomed',
          reducedMotion && 'is-flat',
        ].filter(Boolean).join(' ')}
      >
        {reducedMotion ? (
          <button
            key={current.id}
            type="button"
            className="ui-artwork-viewer-card ui-artwork-viewer-card--flat"
            style={{ width: currentBox.w, height: currentBox.h }}
            onClick={() => onCardClick(focused)}
            aria-label={title || `作品 ${focused + 1}`}
          >
            <div
              className="ui-artwork-viewer-card-zoom"
              style={{ transform: `translate3d(${zoomView.x}px, ${zoomView.y}px, 0) scale(${zoomView.zoom})` }}
            >
              <ArtworkMedia
                className="ui-artwork-viewer-card-media"
                src={getModalImageUrl(current.image_url)}
                finalSrc={getArtworkHighResolutionUrl(current.image_url)}
                placeholderSrc={getGalleryThumbnailUrl(current.image_url)}
                alt={current.title || '作品画像'}
                label={current.title}
                loading="eager"
                fit="contain"
                fillHeight
                background={SLOT_BG}
                imageStyle={{ borderRadius: 6 }}
              />
            </div>
          </button>
        ) : (
          <div
            ref={cylinderRef}
            className="ui-artwork-viewer-cylinder"
            style={{ transform: `translateZ(${-radius}px) rotateY(${-rotationRef.current}deg)` }}
          >
            {items.map((artwork, i) => {
              if (windowed && circularDistance(i, windowCenter, N) > RENDER_WINDOW) {
                return null
              }
              const isFocused = i === focused
              const src = getModalImageUrl(artwork.image_url)
              const label = artwork.title?.trim() || `作品 ${i + 1}`
              const ar = aspects[artwork.id] ?? DEFAULT_AR
              const { w, h } = fitCardToBox(ar, maxW, maxH)
              const a = Math.abs(norm180(i * theta - rotationRef.current))
              const presentation = cardPresentation(a, theta, windowed)
              return (
                <button
                  key={artwork.id}
                  type="button"
                  ref={(el) => { itemRefs.current[i] = el }}
                  className="ui-artwork-viewer-card"
                  data-index={i}
                  style={{
                    width: w,
                    height: h,
                    marginLeft: -w / 2,
                    marginTop: -h / 2,
                    transform: `rotateY(${i * theta}deg) translateZ(${radius}px)`,
                    opacity: presentation.opacity,
                    pointerEvents: presentation.pointerEvents,
                    zIndex: presentation.zIndex,
                  }}
                  onClick={() => onCardClick(i)}
                  aria-label={`${label}を中央に表示`}
                  tabIndex={-1}
                >
                  <div
                    className="ui-artwork-viewer-card-zoom"
                    style={isFocused ? {
                      transform: `translate3d(${zoomView.x}px, ${zoomView.y}px, 0) scale(${zoomView.zoom})`,
                    } : undefined}
                  >
                    <ArtworkMedia
                      className="ui-artwork-viewer-card-media"
                      src={src}
                      finalSrc={isFocused ? getArtworkHighResolutionUrl(artwork.image_url) : undefined}
                      placeholderSrc={getGalleryThumbnailUrl(artwork.image_url)}
                      alt={artwork.title || '作品画像'}
                      label={artwork.title}
                      loading={isFocused ? 'eager' : 'lazy'}
                      fit="contain"
                      fillHeight
                      background={SLOT_BG}
                      imageStyle={{ borderRadius: 6 }}
                    />
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {N > 1 && (
          <>
            <button
              type="button"
              className="ui-artwork-viewer-nav ui-artwork-viewer-nav--prev"
              onClick={(e) => { e.stopPropagation(); goTo(-1) }}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label="前の作品"
            >
              <ViewerNavIcon direction="prev" />
            </button>
            <button
              type="button"
              className="ui-artwork-viewer-nav ui-artwork-viewer-nav--next"
              onClick={(e) => { e.stopPropagation(); goTo(1) }}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label="次の作品"
            >
              <ViewerNavIcon direction="next" />
            </button>
          </>
        )}
      </div>

      {/* 情報パネル。ドラッグ/ズームのジェスチャに巻き込まれないよう伝播を止める */}
      <div className="ui-artwork-viewer-caption" onPointerDown={(e) => e.stopPropagation()}>
        <div className="ui-artwork-viewer-caption-summary">
          {title && <h2 id="artwork-viewer-title" className="ui-artwork-viewer-title">{title}</h2>}
          {hasDetailBody && (
            <button
              type="button"
              className="ui-artwork-viewer-detail-toggle"
              aria-expanded={detailOpen}
              aria-controls="artwork-viewer-detail"
              onClick={() => setDetailOpen((v) => !v)}
            >
              <span>詳細</span>
              <svg
                width={12}
                height={12}
                viewBox="0 0 24 24"
                aria-hidden="true"
                style={{ transform: detailOpen ? 'rotate(180deg)' : undefined, transition: 'transform 160ms ease' }}
              >
                <path d="M6 15l6-6 6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>

        {hasDetailBody && detailOpen && (
          <div id="artwork-viewer-detail" className="ui-artwork-viewer-detail">
            {(visibleCreators.length > 0 || meta) && (
              <div className="ui-artwork-viewer-byline">
                {visibleCreators.length > 0 && renderCreators('ui-artwork-viewer-creators')}
                {meta && <div className="ui-artwork-viewer-meta">{meta}</div>}
              </div>
            )}
            {description && (
              <p className="ui-artwork-viewer-description">{description}</p>
            )}
            <div className="ui-artwork-viewer-detail-actions">
              {hasExhibitionLink && (
                <Link
                  to={exhibitionHref}
                  onClick={() => closeIfCurrentPath(exhibitionHref)}
                  className="ui-artwork-viewer-exhibition-link"
                >
                  <span>{exhibitionTitle}</span>
                  <span aria-hidden="true">→</span>
                </Link>
              )}
              {hasOwnerLink && (
                <Link
                  to={ownerHref}
                  onClick={() => closeIfCurrentPath(ownerHref)}
                  className="ui-artwork-viewer-owner-link"
                >
                  <span>{ownerName || ownerLabel}</span>
                  <span>{ownerLabel}</span>
                </Link>
              )}
              <FavoriteButton
                targetType="artwork"
                targetId={current.id}
                kind="bookmark"
                appearance="icon"
                className="ui-artwork-viewer-fav"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
