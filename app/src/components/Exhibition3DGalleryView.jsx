import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getGalleryThumbnailUrl, getModalImageUrl } from '../lib/imageUrl'
import { profilePath } from '../lib/profileRoutes'
import './Exhibition3DGalleryView.css'

const ROOM_WIDTH = 3000
const ROOM_DEPTH = 3000
const ROOM_HEIGHT = 700 // Wall height is 700px
const LIMIT = 1350 // Boundaries

const WALLS = ['front', 'left', 'right', 'back']

// Dynamic calculations based on aspect ratio, max width 360px, max height 400px
function fitCardToBox(ar, maxW = 360, maxH = 400) {
  const safeAr = ar > 0 ? ar : 0.8
  if (safeAr >= maxW / maxH) {
    return { w: maxW, h: maxW / safeAr }
  }
  return { w: maxH * safeAr, h: maxH }
}

// Calculate painting positions on a specific wall
function getPositionsForWall(list, wallName) {
  if (list.length === 0) return []
  const spacing = ROOM_WIDTH / (list.length + 1)
  return list.map((item, idx) => {
    const offset = -ROOM_WIDTH / 2 + spacing * (idx + 1)
    let x = 0
    let y = -30 // Centered around visual eye-level
    let z = 0
    let ry = 0

    if (wallName === 'front') {
      x = offset
      z = -(ROOM_DEPTH / 2 - 15) // prevent z-fighting
      ry = 0
    } else if (wallName === 'back') {
      x = -offset
      z = (ROOM_DEPTH / 2 - 15)
      ry = 180
    } else if (wallName === 'left') {
      x = -(ROOM_WIDTH / 2 - 15)
      z = -offset
      ry = 90
    } else if (wallName === 'right') {
      x = (ROOM_WIDTH / 2 - 15)
      z = offset
      ry = -90
    }

    return { ...item, x, y, z, ry }
  })
}

// Fixed ViewPoints (Standing spots) for museum navigation
const VIEWPOINTS = [
  { id: 'entrance', name: 'エントランス', x: 0, y: 0, z: 1050, rx: 0, ry: 0, markerX: 0, markerZ: 1050 },
  { id: 'center', name: '中央室', x: 0, y: 0, z: 0, rx: 0, ry: 0, markerX: 0, markerZ: 0 },
  { id: 'front', name: '正面展示前', x: 0, y: 0, z: -550, rx: 0, ry: 0, markerX: 0, markerZ: -650 },
  { id: 'left', name: '左側展示前', x: -550, y: 0, z: 0, rx: 0, ry: 90, markerX: -650, markerZ: 0 },
  { id: 'right', name: '右側展示前', x: 550, y: 0, z: 0, rx: 0, ry: -90, markerX: 650, markerZ: 0 },
  { id: 'back', name: '背面展示前', x: 0, y: 0, z: 550, rx: 0, ry: 180, markerX: 0, markerZ: 650 },
]

export default function Exhibition3DGalleryView({ artworks, onClose }) {
  const items = useMemo(() => artworks.filter((a) => a.image_url), [artworks])
  const [aspects, setAspects] = useState({})

  // Compute camera state tracking
  const cameraRef = useRef({ x: 0, y: 0, z: 1050, rx: 0, ry: 0 })
  const rigRef = useRef(null)
  const roomRef = useRef(null)
  const isAnimatingRef = useRef(false)
  
  const [animating, setAnimating] = useState(false)
  const [focusedArtwork, setFocusedArtwork] = useState(null)
  const [currentViewPoint, setCurrentViewPoint] = useState('entrance')
  const preFocusPositionRef = useRef(null)

  // Track dynamic screen FOV via perspective
  const [perspective, setPerspective] = useState(1000)

  // Track image aspect ratios for dynamic framing sizes
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

  useEffect(() => {
    const handleResize = () => {
      const H = window.innerHeight
      // FOV 50 deg approx: perspective = H * 1.07
      setPerspective(Math.max(800, Math.round(H * 1.07)))
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Keyboard navigation tracking (as secondary support)
  const activeKeys = useRef({
    w: false, a: false, s: false, d: false,
    ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false
  })

  // Distribute artworks across 4 walls
  const paintings = useMemo(() => {
    const distributed = items.map((item, idx) => {
      const wallName = WALLS[idx % 4]
      return { ...item, wall: wallName }
    })

    const frontPos = getPositionsForWall(distributed.filter((p) => p.wall === 'front'), 'front')
    const leftPos = getPositionsForWall(distributed.filter((p) => p.wall === 'left'), 'left')
    const rightPos = getPositionsForWall(distributed.filter((p) => p.wall === 'right'), 'right')
    const backPos = getPositionsForWall(distributed.filter((p) => p.wall === 'back'), 'back')

    return [...frontPos, ...leftPos, ...rightPos, ...backPos]
  }, [items])

  // Camera transition tween handler
  const transitionCamera = useCallback((targetX, targetY, targetZ, targetRx, targetRy, callback) => {
    if (isAnimatingRef.current) return
    isAnimatingRef.current = true
    setAnimating(true)

    // Normalize targetRy so it doesn't spin wildly
    let diffRy = targetRy - cameraRef.current.ry
    diffRy = ((diffRy + 180) % 360) - 180
    if (diffRy < -180) diffRy += 360
    targetRy = cameraRef.current.ry + diffRy

    cameraRef.current = { x: targetX, y: targetY, z: targetZ, rx: targetRx, ry: targetRy }

    if (rigRef.current && roomRef.current) {
      rigRef.current.style.transition = 'transform 0.9s cubic-bezier(0.25, 1, 0.5, 1)'
      roomRef.current.style.transition = 'transform 0.9s cubic-bezier(0.25, 1, 0.5, 1)'

      rigRef.current.style.transform = `translate3d(${-targetX}px, ${-targetY}px, ${-targetZ}px)`
      roomRef.current.style.transform = `rotateX(${targetRx}deg) rotateY(${targetRy}deg)`
    }

    setTimeout(() => {
      if (rigRef.current && roomRef.current) {
        rigRef.current.style.transition = 'none'
        roomRef.current.style.transition = 'none'
      }
      isAnimatingRef.current = false
      setAnimating(false)
      if (callback) callback()
    }, 900)
  }, [])

  // Viewpoint movement trigger
  const goToViewPoint = useCallback((vp) => {
    setFocusedArtwork(null)
    setCurrentViewPoint(vp.id)
    transitionCamera(vp.x, vp.y, vp.z, vp.rx, vp.ry)
  }, [transitionCamera])

  // Unfocus painting & return to viewpoint
  const unfocusArtwork = useCallback(() => {
    if (isAnimatingRef.current) return
    const prevPos = preFocusPositionRef.current

    if (prevPos) {
      transitionCamera(prevPos.x, prevPos.y, prevPos.z, prevPos.rx, prevPos.ry, () => {
        setFocusedArtwork(null)
      })
    } else {
      // Fallback to center viewpoint
      const centerVp = VIEWPOINTS.find((v) => v.id === 'center') || VIEWPOINTS[1]
      goToViewPoint(centerVp)
    }
  }, [transitionCamera, goToViewPoint])

  // Focus painting orthogonally
  const focusArtwork = useCallback((painting) => {
    if (isAnimatingRef.current) return
    
    // Save position before focus
    preFocusPositionRef.current = { ...cameraRef.current }
    setFocusedArtwork(painting)

    let targetX = painting.x
    let targetZ = painting.z
    let targetRy = -painting.ry

    // Distance to stand in front of the artwork
    const zoomDistance = 330
    const ryRad = (painting.ry * Math.PI) / 180
    targetX += Math.sin(ryRad) * zoomDistance
    targetZ += Math.cos(ryRad) * zoomDistance

    transitionCamera(targetX, painting.y, targetZ, 0, targetRy)
  }, [transitionCamera])

  // Drag controls to look around (yaw & pitch)
  const pointerDownRef = useRef(false)
  const lastPointerRef = useRef({ x: 0, y: 0 })

  const onPointerDown = useCallback((e) => {
    if (e.target.closest('button, a, .ui-gallery3d-detail-panel, .ui-gallery3d-marker')) return
    pointerDownRef.current = true
    lastPointerRef.current = { x: e.clientX, y: e.clientY }
    e.currentTarget.setPointerCapture(e.pointerId)
    
    if (focusedArtwork) {
      unfocusArtwork()
    }
  }, [focusedArtwork, unfocusArtwork])

  const onPointerMove = useCallback((e) => {
    if (!pointerDownRef.current) return
    const dx = e.clientX - lastPointerRef.current.x
    const dy = e.clientY - lastPointerRef.current.y
    lastPointerRef.current = { x: e.clientX, y: e.clientY }

    const sensitivity = 0.16
    cameraRef.current.ry = (cameraRef.current.ry - dx * sensitivity) % 360
    cameraRef.current.rx = Math.max(-40, Math.min(40, cameraRef.current.rx + dy * sensitivity))

    // Break pre-defined viewpoint match on drag since user looked away
    setCurrentViewPoint(null)

    if (rigRef.current && roomRef.current && !isAnimatingRef.current) {
      rigRef.current.style.transform = `translate3d(${-cameraRef.current.x}px, ${-cameraRef.current.y}px, ${-cameraRef.current.z}px)`
      roomRef.current.style.transform = `rotateX(${cameraRef.current.rx}deg) rotateY(${cameraRef.current.ry}deg)`
    }
  }, [])

  const onPointerUp = useCallback((e) => {
    pointerDownRef.current = false
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch {}
  }, [])

  // Keyboard controls tick loop (WASD / Arrows) - acts as secondary control
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key
      if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
        activeKeys.current[key] = true
        if (focusedArtwork) {
          unfocusArtwork()
        }
      }
      if (key === 'Escape') {
        if (focusedArtwork) {
          unfocusArtwork()
        } else {
          onClose()
        }
      }
    }

    const handleKeyUp = (e) => {
      const key = e.key
      if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
        activeKeys.current[key] = false
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    let rafId
    const tick = () => {
      const ryRad = (cameraRef.current.ry * Math.PI) / 180
      let dx = 0
      let dz = 0
      const speed = 12

      if (activeKeys.current.w || activeKeys.current.ArrowUp) {
        dx -= Math.sin(ryRad)
        dz -= Math.cos(ryRad)
      }
      if (activeKeys.current.s || activeKeys.current.ArrowDown) {
        dx += Math.sin(ryRad)
        dz += Math.cos(ryRad)
      }
      if (activeKeys.current.a || activeKeys.current.ArrowLeft) {
        dx -= Math.cos(ryRad)
        dz += Math.sin(ryRad)
      }
      if (activeKeys.current.d || activeKeys.current.ArrowRight) {
        dx += Math.cos(ryRad)
        dz -= Math.sin(ryRad)
      }

      const length = Math.hypot(dx, dz)
      if (length > 0 && !isAnimatingRef.current) {
        cameraRef.current.x += (dx / length) * speed
        cameraRef.current.z += (dz / length) * speed

        // Boundary clamps
        cameraRef.current.x = Math.max(-LIMIT, Math.min(LIMIT, cameraRef.current.x))
        cameraRef.current.z = Math.max(-LIMIT, Math.min(LIMIT, cameraRef.current.z))

        setCurrentViewPoint(null) // User roamed freely

        if (rigRef.current && roomRef.current) {
          rigRef.current.style.transform = `translate3d(${-cameraRef.current.x}px, ${-cameraRef.current.y}px, ${-cameraRef.current.z}px)`
          roomRef.current.style.transform = `rotateX(${cameraRef.current.rx}deg) rotateY(${cameraRef.current.ry}deg)`
        }
      }

      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      cancelAnimationFrame(rafId)
    }
  }, [focusedArtwork, unfocusArtwork, onClose])

  // Setup initial viewport position and freeze body scroll
  useEffect(() => {
    const originalStyle = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Set starting position at Entrance
    const ent = VIEWPOINTS[0]
    cameraRef.current = { x: ent.x, y: ent.y, z: ent.z, rx: ent.rx, ry: ent.ry }
    
    if (rigRef.current && roomRef.current) {
      rigRef.current.style.transform = `translate3d(${-ent.x}px, ${-ent.y}px, ${-ent.z}px)`
      roomRef.current.style.transform = `rotateX(${ent.rx}deg) rotateY(${ent.ry}deg)`
    }

    return () => {
      document.body.style.overflow = originalStyle
    }
  }, [])

  const handleMobileNav = (direction, start) => {
    if (focusedArtwork) {
      unfocusArtwork()
    }
    const keyMap = {
      up: 'w',
      down: 's',
      left: 'a',
      right: 'd'
    }
    const mappedKey = keyMap[direction]
    if (mappedKey) {
      activeKeys.current[mappedKey] = start
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="3Dアートギャラリー"
      className="ui-gallery3d-overlay"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="ui-gallery3d-viewport" style={{ perspective: `${perspective}px` }}>
        {/* Camera Stage */}
        <div ref={rigRef} className="ui-gallery3d-camera-rig">
          <div ref={roomRef} className="ui-gallery3d-room">
            {/* Floor */}
            <div
              className="ui-gallery3d-floor"
              style={{
                width: ROOM_WIDTH,
                height: ROOM_DEPTH,
                left: -ROOM_WIDTH / 2,
                top: -ROOM_DEPTH / 2,
                transform: `translateY(250px) rotateX(90deg)`,
              }}
            />

            {/* Ceiling */}
            <div
              className="ui-gallery3d-ceiling"
              style={{
                width: ROOM_WIDTH,
                height: ROOM_DEPTH,
                left: -ROOM_WIDTH / 2,
                top: -ROOM_DEPTH / 2,
                transform: `translateY(-450px) rotateX(-90deg)`,
              }}
            />

            {/* Front Wall */}
            <div
              className="ui-gallery3d-wall"
              style={{
                width: ROOM_WIDTH,
                height: ROOM_HEIGHT,
                left: -ROOM_WIDTH / 2,
                top: -ROOM_HEIGHT / 2,
                transform: `translate3d(0, -100px, ${-ROOM_DEPTH / 2}px)`,
              }}
            />

            {/* Back Wall */}
            <div
              className="ui-gallery3d-wall"
              style={{
                width: ROOM_WIDTH,
                height: ROOM_HEIGHT,
                left: -ROOM_WIDTH / 2,
                top: -ROOM_HEIGHT / 2,
                transform: `translate3d(0, -100px, ${ROOM_DEPTH / 2}px) rotateY(180deg)`,
              }}
            />

            {/* Left Wall */}
            <div
              className="ui-gallery3d-wall"
              style={{
                width: ROOM_DEPTH,
                height: ROOM_HEIGHT,
                left: -ROOM_DEPTH / 2,
                top: -ROOM_HEIGHT / 2,
                transform: `translate3d(${-ROOM_WIDTH / 2}px, -100px, 0) rotateY(90deg)`,
              }}
            />

            {/* Right Wall */}
            <div
              className="ui-gallery3d-wall"
              style={{
                width: ROOM_DEPTH,
                height: ROOM_HEIGHT,
                left: -ROOM_DEPTH / 2,
                top: -ROOM_HEIGHT / 2,
                transform: `translate3d(${ROOM_WIDTH / 2}px, -100px, 0) rotateY(-90deg)`,
              }}
            />

            {/* Interactive Viewpoint Markers on Floor (Only visible when not zooming an artwork) */}
            {!focusedArtwork && VIEWPOINTS.map((vp) => {
              const isActive = currentViewPoint === vp.id
              return (
                <button
                  key={vp.id}
                  type="button"
                  className={`ui-gallery3d-marker ${isActive ? 'is-active' : ''}`}
                  style={{
                    left: vp.markerX,
                    top: vp.markerZ,
                    transform: `translate(-50%, -50%) translateY(248px) rotateX(90deg)`,
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    goToViewPoint(vp)
                  }}
                  aria-label={`${vp.name}に移動`}
                  title={vp.name}
                >
                  <div className="ui-gallery3d-marker-inner" />
                </button>
              )
            })}

            {/* Spotlight Glows & Artworks */}
            {paintings.map((painting) => {
              const src = getModalImageUrl(painting.image_url)
              const thumb = getGalleryThumbnailUrl(painting.image_url)
              const visibleCreators = (painting.creators || []).filter((c) => c.profile?.display_name)
              const creatorName = visibleCreators.length > 0 ? visibleCreators[0].profile.display_name : null
              const ar = aspects[painting.id] ?? 0.8
              const { w, h } = fitCardToBox(ar, 360, 400) // Slightly larger size

              return (
                <div
                  key={painting.id}
                  className="ui-gallery3d-artwork-container"
                  style={{
                    left: 0,
                    top: 0,
                    transform: `translate3d(${painting.x}px, ${painting.y}px, ${painting.z}px) rotateY(${painting.ry}deg)`,
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    focusArtwork(painting)
                  }}
                >
                  {/* Spotlight Behind Painting */}
                  <div className="ui-gallery3d-spotlight-glow" style={{ top: -20 }} />

                  {/* Frame */}
                  <div className="ui-gallery3d-frame" style={{ width: w, height: h }}>
                    <img
                      src={src}
                      alt={painting.title || '作品'}
                      className="ui-gallery3d-img"
                      onError={(e) => {
                        e.target.src = thumb
                      }}
                    />
                  </div>

                  {/* Plaque */}
                  <div className="ui-gallery3d-plaque" style={{ width: Math.max(220, Math.min(w, 280)) }}>
                    <div className="ui-gallery3d-plaque-title">{painting.title || '無題'}</div>
                    {creatorName && <div className="ui-gallery3d-plaque-creator">@{creatorName}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* HUD Controls Overlay */}
        <div className="ui-gallery3d-controls-overlay">
          {/* Top Bar */}
          <div className="ui-gallery3d-topbar">
            <div className="ui-gallery3d-title-info">
              <h3>3D空間を巡る</h3>
            </div>
            <button
              type="button"
              className="ui-gallery3d-close-btn"
              onClick={onClose}
              aria-label="3Dビューを閉じる"
            >
              ×
            </button>
          </div>

          {/* Minimal Temporary Instructions */}
          <div className="ui-gallery3d-instructions">
            床のマーカーをクリックして歩き回る<br />
            絵画をクリック：正面でじっくり鑑賞
          </div>

          {/* Virtual D-Pad navigation for touch screens / mobile as backup */}
          <div className="ui-gallery3d-navigation-pad">
            <div />
            <button
              type="button"
              className="ui-gallery3d-nav-btn"
              onPointerDown={() => handleMobileNav('up', true)}
              onPointerUp={() => handleMobileNav('up', false)}
              onPointerLeave={() => handleMobileNav('up', false)}
              aria-label="前進"
            >
              ▲
            </button>
            <div />
            
            <button
              type="button"
              className="ui-gallery3d-nav-btn"
              onPointerDown={() => handleMobileNav('left', true)}
              onPointerUp={() => handleMobileNav('left', false)}
              onPointerLeave={() => handleMobileNav('left', false)}
              aria-label="左スライド"
            >
              ◀
            </button>
            <button
              type="button"
              className="ui-gallery3d-nav-btn"
              onPointerDown={() => handleMobileNav('down', true)}
              onPointerUp={() => handleMobileNav('down', false)}
              onPointerLeave={() => handleMobileNav('down', false)}
              aria-label="後退"
            >
              ▼
            </button>
            <button
              type="button"
              className="ui-gallery3d-nav-btn"
              onPointerDown={() => handleMobileNav('right', true)}
              onPointerUp={() => handleMobileNav('right', false)}
              onPointerLeave={() => handleMobileNav('right', false)}
              aria-label="右スライド"
            >
              ▶
            </button>
          </div>

          {/* Details Sidebar Panel when focused */}
          {focusedArtwork && (
            <div className="ui-gallery3d-detail-panel">
              <div className="ui-gallery3d-detail-header">
                <div>
                  <h2 className="ui-gallery3d-detail-title">{focusedArtwork.title || '無題'}</h2>
                  {focusedArtwork.creators && focusedArtwork.creators.length > 0 && (
                    <div className="ui-gallery3d-detail-creators">
                      {focusedArtwork.creators.map((c, i) => {
                        const name = c.profile?.display_name
                        const slug = c.profile?.slug
                        if (!name) return null
                        return (
                          <span key={c.profile_id || i}>
                            {i > 0 && '　'}
                            {slug ? (
                              <Link to={profilePath(slug)} style={{ color: 'inherit' }}>
                                @{name}
                              </Link>
                            ) : (
                              `@${name}`
                            )}
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={unfocusArtwork}
                  className="ui-gallery3d-detail-close"
                  aria-label="詳細を閉じる"
                >
                  ×
                </button>
              </div>

              {/* Plaque Metadata */}
              {(focusedArtwork.material || focusedArtwork.medium || focusedArtwork.size || focusedArtwork.dimensions) && (
                <div className="ui-gallery3d-detail-meta">
                  {focusedArtwork.material || focusedArtwork.medium}
                  {(focusedArtwork.material || focusedArtwork.medium) && (focusedArtwork.size || focusedArtwork.dimensions) && '　·　'}
                  {focusedArtwork.size || focusedArtwork.dimensions}
                </div>
              )}

              {focusedArtwork.description && (
                <div className="ui-gallery3d-detail-description">
                  {focusedArtwork.description}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
