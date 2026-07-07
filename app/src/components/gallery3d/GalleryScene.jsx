import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CanvasTexture, MathUtils, RepeatWrapping, SRGBColorSpace, Vector3 } from 'three'
import ArtworkFrame from './ArtworkFrame'
import { ROOM, DEFAULT_FOV, createGalleryLayout } from './layout'

const PITCH_LIMIT = MathUtils.degToRad(40)
const LOOK_SENSITIVITY = 0.005
const DRAG_THRESHOLD = 6
const MIN_FOV = 24
const MAX_FOV = 60
const WHEEL_ZOOM_SENSITIVITY = 0.025
const ROOM_EDGE_COLOR = '#d6d1c8'
const ROOM_EDGE_SIZE = 0.018

function makeWoodFloorTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  const plankWidth = 64
  const plankColors = ['#b88963', '#bd8e68', '#b3825d', '#c0926c']

  for (let plank = 0; plank < canvas.width / plankWidth; plank += 1) {
    const x = plank * plankWidth
    ctx.fillStyle = plankColors[plank % plankColors.length]
    ctx.fillRect(x, 0, plankWidth, canvas.height)

    for (let grain = 0; grain < 12; grain += 1) {
      const grainX = x + 5 + ((grain * 19 + plank * 7) % (plankWidth - 10))
      const drift = ((grain + plank) % 3) - 1
      ctx.beginPath()
      ctx.moveTo(grainX, 0)
      ctx.bezierCurveTo(
        grainX + drift * 2,
        150,
        grainX - drift * 3,
        350,
        grainX + drift,
        canvas.height,
      )
      ctx.strokeStyle = `rgba(79, 50, 31, ${0.035 + (grain % 4) * 0.012})`
      ctx.lineWidth = grain % 5 === 0 ? 1.4 : 0.7
      ctx.stroke()
    }

    ctx.fillStyle = 'rgba(83, 54, 35, 0.28)'
    ctx.fillRect(x, 0, 1.5, canvas.height)
    ctx.fillStyle = 'rgba(255, 244, 226, 0.14)'
    ctx.fillRect(x + 1.5, 0, 1, canvas.height)
  }

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(3, 2)
  texture.anisotropy = 8
  texture.needsUpdate = true
  return texture
}

function makeWallTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 384
  canvas.height = 384
  const ctx = canvas.getContext('2d')
  const image = ctx.createImageData(canvas.width, canvas.height)

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const index = (y * canvas.width + x) * 4
      const noise = ((x * 13 + y * 17 + (x * y) % 19) % 7) - 3
      image.data[index] = 250 + noise
      image.data[index + 1] = 248 + noise
      image.data[index + 2] = 243 + noise
      image.data[index + 3] = 255
    }
  }
  ctx.putImageData(image, 0, 0)

  for (let patch = 0; patch < 56; patch += 1) {
    const x = (patch * 83) % canvas.width
    const y = (patch * 149) % canvas.height
    const radius = 10 + (patch % 7) * 4
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
    gradient.addColorStop(
      0,
      patch % 2
        ? 'rgba(118, 109, 96, 0.026)'
        : 'rgba(255, 255, 255, 0.14)',
    )
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = gradient
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
  }

  for (let fiber = 0; fiber < 180; fiber += 1) {
    const x = (fiber * 73) % canvas.width
    const y = (fiber * 137) % canvas.height
    const length = 3 + (fiber % 9)
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + length, y + ((fiber % 3) - 1))
    ctx.strokeStyle = fiber % 2
      ? 'rgba(126, 119, 108, 0.035)'
      : 'rgba(255, 255, 255, 0.14)'
    ctx.lineWidth = 0.7
    ctx.stroke()
  }

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(2, 1)
  texture.anisotropy = 8
  texture.needsUpdate = true
  return texture
}

function shortestYawDelta(from, to) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from))
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}

function RoomShell() {
  const edgeX = ROOM.halfWidth - ROOM_EDGE_SIZE / 2
  const edgeZ = ROOM.halfDepth - ROOM_EDGE_SIZE / 2
  const floorTexture = useMemo(() => makeWoodFloorTexture(), [])
  const wallTexture = useMemo(() => makeWallTexture(), [])
  useEffect(() => () => floorTexture.dispose(), [floorTexture])
  useEffect(() => () => wallTexture.dispose(), [wallTexture])

  return (
    <group>
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM.width, ROOM.depth]} />
        <meshStandardMaterial map={floorTexture} color="#ffffff" roughness={0.82} metalness={0} />
      </mesh>
      <mesh position={[0, ROOM.height / 2, -ROOM.halfDepth]}>
        <planeGeometry args={[ROOM.width, ROOM.height]} />
        <meshStandardMaterial
          map={wallTexture}
          bumpMap={wallTexture}
          bumpScale={0.018}
          color="#ffffff"
          emissive="#e8e2d7"
          emissiveIntensity={0.58}
          roughness={0.96}
          metalness={0}
        />
      </mesh>
      <mesh position={[ROOM.halfWidth, ROOM.height / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM.depth, ROOM.height]} />
        <meshStandardMaterial
          map={wallTexture}
          bumpMap={wallTexture}
          bumpScale={0.018}
          color="#ffffff"
          emissive="#e8e2d7"
          emissiveIntensity={0.58}
          roughness={0.96}
          metalness={0}
        />
      </mesh>
      <mesh position={[0, ROOM.height / 2, ROOM.halfDepth]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[ROOM.width, ROOM.height]} />
        <meshStandardMaterial
          map={wallTexture}
          bumpMap={wallTexture}
          bumpScale={0.018}
          color="#ffffff"
          emissive="#e8e2d7"
          emissiveIntensity={0.58}
          roughness={0.96}
          metalness={0}
        />
      </mesh>
      <mesh position={[-ROOM.halfWidth, ROOM.height / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM.depth, ROOM.height]} />
        <meshStandardMaterial
          map={wallTexture}
          bumpMap={wallTexture}
          bumpScale={0.018}
          color="#ffffff"
          emissive="#e8e2d7"
          emissiveIntensity={0.58}
          roughness={0.96}
          metalness={0}
        />
      </mesh>

      {/* 壁と床の境界 */}
      <mesh position={[0, ROOM_EDGE_SIZE / 2, -edgeZ]}>
        <boxGeometry args={[ROOM.width, ROOM_EDGE_SIZE, ROOM_EDGE_SIZE]} />
        <meshBasicMaterial color={ROOM_EDGE_COLOR} />
      </mesh>
      <mesh position={[0, ROOM_EDGE_SIZE / 2, edgeZ]}>
        <boxGeometry args={[ROOM.width, ROOM_EDGE_SIZE, ROOM_EDGE_SIZE]} />
        <meshBasicMaterial color={ROOM_EDGE_COLOR} />
      </mesh>
      <mesh position={[-edgeX, ROOM_EDGE_SIZE / 2, 0]}>
        <boxGeometry args={[ROOM_EDGE_SIZE, ROOM_EDGE_SIZE, ROOM.depth]} />
        <meshBasicMaterial color={ROOM_EDGE_COLOR} />
      </mesh>
      <mesh position={[edgeX, ROOM_EDGE_SIZE / 2, 0]}>
        <boxGeometry args={[ROOM_EDGE_SIZE, ROOM_EDGE_SIZE, ROOM.depth]} />
        <meshBasicMaterial color={ROOM_EDGE_COLOR} />
      </mesh>

      {/* 壁同士の境界 */}
      {[
        [-edgeX, -edgeZ],
        [edgeX, -edgeZ],
        [-edgeX, edgeZ],
        [edgeX, edgeZ],
      ].map(([x, z]) => (
        <mesh key={`${x}-${z}`} position={[x, ROOM.height / 2, z]}>
          <boxGeometry args={[ROOM_EDGE_SIZE, ROOM.height, ROOM_EDGE_SIZE]} />
          <meshBasicMaterial color={ROOM_EDGE_COLOR} />
        </mesh>
      ))}
    </group>
  )
}

const GalleryScene = forwardRef(function GalleryScene({ artworks, onOpenArtwork, onFailedCountChange }, ref) {
  const { camera, gl, size } = useThree()
  const [imageSizeMap, setImageSizeMap] = useState({})
  const [failedIds, setFailedIds] = useState(() => new Set())
  const visibleArtworks = useMemo(
    () => artworks.filter((artwork) => !failedIds.has(String(artwork.id))),
    [artworks, failedIds],
  )

  useEffect(() => {
    onFailedCountChange?.(failedIds.size)
  }, [failedIds, onFailedCountChange])
  const layout = useMemo(
    () => createGalleryLayout(visibleArtworks, imageSizeMap, {
      fov: DEFAULT_FOV,
      // 縦長画面(スマホ)ほど横画角が狭く、横長作品が入りにくいので実アスペクトを渡す
      aspect: size.height > 0 ? size.width / size.height : undefined,
    }),
    [visibleArtworks, imageSizeMap, size.width, size.height],
  )
  const [activeViewpointId, setActiveViewpointId] = useState(layout.initialViewpoint.id)
  const [, setIsTeleporting] = useState(false)
  const cameraStateRef = useRef({
    position: new Vector3(...layout.initialViewpoint.position),
    targetPosition: new Vector3(...layout.initialViewpoint.position),
    yaw: layout.initialViewpoint.yaw,
    targetYaw: layout.initialViewpoint.yaw,
    pitch: layout.initialViewpoint.pitch ?? 0,
    targetPitch: layout.initialViewpoint.pitch ?? 0,
    fov: camera.fov,
    targetFov: camera.fov,
  })
  const pointerRef = useRef(null)
  const touchPointersRef = useRef(new Map())
  const pinchRef = useRef(null)
  const teleportRef = useRef(null)
  const ignoreNextClickRef = useRef(false)
  const renderedActiveViewpointId = layout.viewpoints.some((viewpoint) => viewpoint.id === activeViewpointId)
    ? activeViewpointId
    : layout.initialViewpoint.id
  const activeViewpoint = layout.viewpoints.find(
    (viewpoint) => viewpoint.id === renderedActiveViewpointId,
  ) || layout.initialViewpoint
  const [activeViewX, activeViewY, activeViewZ] = activeViewpoint.position
  const activeViewPitch = activeViewpoint.pitch ?? 0
  const highQualityArtworkIds = useMemo(
    () => new Set(activeViewpoint.artworkIds || []),
    [activeViewpoint],
  )

  useEffect(() => {
    if (teleportRef.current) return
    cameraStateRef.current.targetPosition.set(activeViewX, activeViewY, activeViewZ)
    cameraStateRef.current.targetPitch = activeViewPitch
  }, [activeViewX, activeViewY, activeViewZ, activeViewPitch])

  const handleAspectLoaded = useCallback((id, width, height) => {
    setImageSizeMap((prev) => {
      const current = prev[id]
      const currentAspect = current ? current.width / current.height : 0
      const nextAspect = width / height
      if (Math.abs(currentAspect - nextAspect) < 0.001) return prev
      return { ...prev, [id]: { width, height } }
    })
  }, [])

  const handleTextureError = useCallback((id) => {
    setFailedIds((prev) => {
      const key = String(id)
      if (prev.has(key)) return prev
      const next = new Set(prev)
      next.add(key)
      return next
    })
  }, [])

  const teleportTo = useCallback((viewpoint) => {
    if (teleportRef.current) return
    const state = cameraStateRef.current
    teleportRef.current = {
      elapsed: 0,
      duration: 0.9,
      fromPosition: state.position.clone(),
      toPosition: new Vector3(...viewpoint.position),
      fromYaw: state.yaw,
      yawDelta: shortestYawDelta(state.yaw, viewpoint.yaw),
      fromPitch: state.pitch,
      pitchDelta: (viewpoint.pitch ?? 0) - state.pitch,
    }
    setIsTeleporting(true)
    setActiveViewpointId(viewpoint.id)
  }, [])

  const handleArtworkSelect = useCallback((artwork) => {
    if (teleportRef.current) return
    const artworkId = String(artwork.id)
    const targetViewpoint = layout.viewpoints.find(
      (viewpoint) => viewpoint.artworkIds?.includes(artworkId),
    )

    if (targetViewpoint && targetViewpoint.id !== renderedActiveViewpointId) {
      teleportTo(targetViewpoint)
      return
    }

    onOpenArtwork?.(artwork)
  }, [layout.viewpoints, onOpenArtwork, renderedActiveViewpointId, teleportTo])

  const navigateBy = useCallback((offset) => {
    if (teleportRef.current || !layout.viewpoints.length) return
    const currentIndex = layout.viewpoints.findIndex((viewpoint) => viewpoint.id === renderedActiveViewpointId)
    const startIndex = currentIndex >= 0 ? currentIndex : 0
    const nextIndex = (startIndex + offset + layout.viewpoints.length) % layout.viewpoints.length
    teleportTo(layout.viewpoints[nextIndex])
  }, [layout.viewpoints, renderedActiveViewpointId, teleportTo])

  useImperativeHandle(ref, () => ({
    previous: () => navigateBy(-1),
    next: () => navigateBy(1),
  }), [navigateBy])

  useEffect(() => {
    const dom = gl.domElement
    const touchPointers = touchPointersRef.current

    const onPointerDown = (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return

      if (e.pointerType === 'touch') {
        touchPointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
        dom.setPointerCapture?.(e.pointerId)
        if (touchPointers.size >= 2) {
          const [first, second] = [...touchPointers.values()]
          pinchRef.current = {
            distance: Math.hypot(second.x - first.x, second.y - first.y),
            fov: cameraStateRef.current.targetFov,
          }
          pointerRef.current = null
          return
        }
      }

      if (!e.isPrimary) return
      pointerRef.current = {
        id: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        lastX: e.clientX,
        lastY: e.clientY,
        moved: false,
      }
      dom.setPointerCapture?.(e.pointerId)
    }

    const onPointerMove = (e) => {
      if (e.pointerType === 'touch' && touchPointers.has(e.pointerId)) {
        touchPointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
        if (pinchRef.current && touchPointers.size >= 2) {
          e.preventDefault()
          const [first, second] = [...touchPointers.values()]
          const distance = Math.hypot(second.x - first.x, second.y - first.y)
          const ratio = distance / Math.max(1, pinchRef.current.distance)
          cameraStateRef.current.targetFov = MathUtils.clamp(
            pinchRef.current.fov / Math.max(0.1, ratio),
            MIN_FOV,
            MAX_FOV,
          )
          return
        }
      }

      const pointer = pointerRef.current
      if (!pointer || pointer.id !== e.pointerId) return
      const dx = e.clientX - pointer.lastX
      const dy = e.clientY - pointer.lastY
      const total = Math.hypot(e.clientX - pointer.startX, e.clientY - pointer.startY)
      if (total > DRAG_THRESHOLD) pointer.moved = true
      pointer.lastX = e.clientX
      pointer.lastY = e.clientY
      const state = cameraStateRef.current
      state.targetYaw += dx * LOOK_SENSITIVITY
      state.targetPitch = MathUtils.clamp(state.targetPitch + dy * LOOK_SENSITIVITY, -PITCH_LIMIT, PITCH_LIMIT)
    }

    const onPointerUp = (e) => {
      if (e.pointerType === 'touch') {
        touchPointers.delete(e.pointerId)
        if (pinchRef.current) {
          pinchRef.current = null
          pointerRef.current = null
          ignoreNextClickRef.current = true
          window.setTimeout(() => {
            ignoreNextClickRef.current = false
          }, 0)
          return
        }
      }

      const pointer = pointerRef.current
      if (!pointer || pointer.id !== e.pointerId) return
      if (pointer.moved) {
        ignoreNextClickRef.current = true
        window.setTimeout(() => {
          ignoreNextClickRef.current = false
        }, 0)
      }
      pointerRef.current = null
    }

    const onWheel = (e) => {
      e.preventDefault()
      const state = cameraStateRef.current
      const sensitivity = e.ctrlKey ? 0.12 : WHEEL_ZOOM_SENSITIVITY
      state.targetFov = MathUtils.clamp(
        state.targetFov + e.deltaY * sensitivity,
        MIN_FOV,
        MAX_FOV,
      )
    }

    dom.addEventListener('pointerdown', onPointerDown)
    dom.addEventListener('pointermove', onPointerMove)
    dom.addEventListener('pointerup', onPointerUp)
    dom.addEventListener('pointercancel', onPointerUp)
    dom.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      dom.removeEventListener('pointerdown', onPointerDown)
      dom.removeEventListener('pointermove', onPointerMove)
      dom.removeEventListener('pointerup', onPointerUp)
      dom.removeEventListener('pointercancel', onPointerUp)
      dom.removeEventListener('wheel', onWheel)
      touchPointers.clear()
      pinchRef.current = null
    }
  }, [gl])

  useFrame((_, delta) => {
    const state = cameraStateRef.current
    const teleport = teleportRef.current
    if (teleport) {
      teleport.elapsed += delta
      const t = Math.min(1, teleport.elapsed / teleport.duration)
      const eased = easeOutCubic(t)
      state.position.lerpVectors(teleport.fromPosition, teleport.toPosition, eased)
      state.targetPosition.copy(state.position)
      state.yaw = teleport.fromYaw + teleport.yawDelta * eased
      state.targetYaw = state.yaw
      state.pitch = teleport.fromPitch + teleport.pitchDelta * eased
      state.targetPitch = state.pitch
      if (t >= 1) {
        teleportRef.current = null
        setIsTeleporting(false)
      }
    } else {
      state.position.lerp(state.targetPosition, 1 - Math.exp(-10 * delta))
      state.yaw += shortestYawDelta(state.yaw, state.targetYaw) * (1 - Math.exp(-12 * delta))
      state.pitch += (state.targetPitch - state.pitch) * (1 - Math.exp(-12 * delta))
    }

    state.fov += (state.targetFov - state.fov) * (1 - Math.exp(-12 * delta))
    camera.position.copy(state.position)
    camera.rotation.set(state.pitch, state.yaw, 0, 'YXZ')
    if (Math.abs(camera.fov - state.fov) > 0.001) {
      const focalLength = (0.5 * camera.getFilmHeight())
        / Math.tan(MathUtils.degToRad(state.fov * 0.5))
      camera.setFocalLength(focalLength)
    }
  })

  return (
    <>
      <color attach="background" args={['#f7f7f5']} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[0, 4, 3]} intensity={0.72} />
      <RoomShell />
      {layout.frames.map((frame) => (
        <ArtworkFrame
          key={frame.id}
          frame={frame}
          highQuality={highQualityArtworkIds.has(frame.id)}
          onOpenArtwork={handleArtworkSelect}
          onAspectLoaded={handleAspectLoaded}
          onTextureError={handleTextureError}
          ignoreNextClickRef={ignoreNextClickRef}
        />
      ))}
    </>
  )
})

export default GalleryScene
