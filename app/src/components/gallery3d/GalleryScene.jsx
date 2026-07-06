import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CanvasTexture, MathUtils, RepeatWrapping, SRGBColorSpace, Vector3 } from 'three'
import { useCursor } from '@react-three/drei'
import ArtworkFrame from './ArtworkFrame'
import { ROOM, createGalleryLayout } from './layout'

const PITCH_LIMIT = MathUtils.degToRad(40)
const LOOK_SENSITIVITY = 0.005
const DRAG_THRESHOLD = 6
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
      const noise = ((x * 13 + y * 17 + (x * y) % 19) % 3) - 1
      image.data[index] = 251 + noise
      image.data[index + 1] = 250 + noise
      image.data[index + 2] = 247 + noise
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
        ? 'rgba(118, 109, 96, 0.014)'
        : 'rgba(255, 255, 255, 0.1)',
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
      ? 'rgba(126, 119, 108, 0.02)'
      : 'rgba(255, 255, 255, 0.1)'
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
        <meshBasicMaterial map={wallTexture} color="#ffffff" toneMapped={false} />
      </mesh>
      <mesh position={[ROOM.halfWidth, ROOM.height / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM.depth, ROOM.height]} />
        <meshBasicMaterial map={wallTexture} color="#ffffff" toneMapped={false} />
      </mesh>
      <mesh position={[0, ROOM.height / 2, ROOM.halfDepth]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[ROOM.width, ROOM.height]} />
        <meshBasicMaterial map={wallTexture} color="#ffffff" toneMapped={false} />
      </mesh>
      <mesh position={[-ROOM.halfWidth, ROOM.height / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM.depth, ROOM.height]} />
        <meshBasicMaterial map={wallTexture} color="#ffffff" toneMapped={false} />
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

function ViewMarker({ viewpoint, active, disabled, onClick, ignoreNextClickRef }) {
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)
  const [x, , z] = viewpoint.position

  return (
    <group
      position={[x, 0.012, z]}
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation()
        if (disabled || ignoreNextClickRef.current) return
        onClick(viewpoint)
      }}
    >
      <mesh>
        <circleGeometry args={[0.23, 36]} />
        <meshBasicMaterial color={active ? '#be553d' : '#ffffff'} transparent opacity={active ? 0.9 : 0.34} />
      </mesh>
      <mesh position={[0, 0, 0.003]}>
        <ringGeometry args={[0.28, 0.34, 36]} />
        <meshBasicMaterial color={active ? '#be553d' : '#ffffff'} transparent opacity={active ? 0.95 : 0.48} />
      </mesh>
    </group>
  )
}

const GalleryScene = forwardRef(function GalleryScene({ artworks, onOpenArtwork, onFailedCountChange }, ref) {
  const { camera, gl } = useThree()
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
    () => createGalleryLayout(visibleArtworks, imageSizeMap),
    [visibleArtworks, imageSizeMap],
  )
  const [activeViewpointId, setActiveViewpointId] = useState(layout.initialViewpoint.id)
  const [isTeleporting, setIsTeleporting] = useState(false)
  const cameraStateRef = useRef({
    position: new Vector3(...layout.initialViewpoint.position),
    targetPosition: new Vector3(...layout.initialViewpoint.position),
    yaw: layout.initialViewpoint.yaw,
    targetYaw: layout.initialViewpoint.yaw,
    pitch: 0,
    targetPitch: 0,
  })
  const pointerRef = useRef(null)
  const teleportRef = useRef(null)
  const ignoreNextClickRef = useRef(false)
  const renderedActiveViewpointId = layout.viewpoints.some((viewpoint) => viewpoint.id === activeViewpointId)
    ? activeViewpointId
    : layout.initialViewpoint.id
  const activeViewpoint = layout.viewpoints.find(
    (viewpoint) => viewpoint.id === renderedActiveViewpointId,
  ) || layout.initialViewpoint
  const highQualityArtworkIds = useMemo(
    () => new Set(activeViewpoint.artworkIds || []),
    [activeViewpoint],
  )

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
    }
    setIsTeleporting(true)
    setActiveViewpointId(viewpoint.id)
  }, [])

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

    const onPointerDown = (e) => {
      if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return
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

    dom.addEventListener('pointerdown', onPointerDown)
    dom.addEventListener('pointermove', onPointerMove)
    dom.addEventListener('pointerup', onPointerUp)
    dom.addEventListener('pointercancel', onPointerUp)
    return () => {
      dom.removeEventListener('pointerdown', onPointerDown)
      dom.removeEventListener('pointermove', onPointerMove)
      dom.removeEventListener('pointerup', onPointerUp)
      dom.removeEventListener('pointercancel', onPointerUp)
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
      if (t >= 1) {
        teleportRef.current = null
        setIsTeleporting(false)
      }
    } else {
      state.position.lerp(state.targetPosition, 1 - Math.exp(-10 * delta))
      state.yaw += shortestYawDelta(state.yaw, state.targetYaw) * (1 - Math.exp(-12 * delta))
      state.pitch += (state.targetPitch - state.pitch) * (1 - Math.exp(-12 * delta))
    }

    camera.position.copy(state.position)
    camera.rotation.set(state.pitch, state.yaw, 0, 'YXZ')
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
          onOpenArtwork={onOpenArtwork}
          onAspectLoaded={handleAspectLoaded}
          onTextureError={handleTextureError}
          ignoreNextClickRef={ignoreNextClickRef}
        />
      ))}
      {layout.viewpoints.map((viewpoint) => (
        <ViewMarker
          key={viewpoint.id}
          viewpoint={viewpoint}
          active={viewpoint.id === renderedActiveViewpointId}
          disabled={isTeleporting}
          onClick={teleportTo}
          ignoreNextClickRef={ignoreNextClickRef}
        />
      ))}
    </>
  )
})

export default GalleryScene
