import { Component, Suspense, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import GalleryScene from './gallery3d/GalleryScene'
import './Exhibition3DGalleryView.css'

class GalleryErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}

export default function Exhibition3DGalleryView({ artworks, onClose, onOpenArtwork, hasOpenArtwork }) {
  const closeRef = useRef(null)
  const sceneRef = useRef(null)
  const [failedCount, setFailedCount] = useState(0)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (e.key !== 'Escape') return
      if (hasOpenArtwork) return
      e.preventDefault()
      onClose?.()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [hasOpenArtwork, onClose])

  useEffect(() => {
    const handler = (e) => {
      if (hasOpenArtwork) return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        sceneRef.current?.previous()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        sceneRef.current?.next()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [hasOpenArtwork])

  const renderCloseButton = (ref) => (
    <button
      ref={ref}
      type="button"
      className="ui-3d-gallery-close"
      onClick={onClose}
      aria-label="3Dギャラリービューを閉じる"
    >
      ×
    </button>
  )

  return (
    <div role="dialog" aria-modal="true" aria-label="3Dギャラリービュー" className="ui-3d-gallery-overlay">
      <GalleryErrorBoundary
        fallback={(
          <div className="ui-3d-gallery-fallback">
            <div className="ui-3d-gallery-fallback-panel">
              <p>お使いの環境では3D表示を利用できません</p>
              {renderCloseButton(null)}
            </div>
          </div>
        )}
      >
        <Canvas
          className="ui-3d-gallery-canvas"
          dpr={[1, 3]}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          camera={{ fov: 55, near: 0.1, far: 50 }}
        >
          <Suspense fallback={null}>
            <GalleryScene
              ref={sceneRef}
              artworks={artworks}
              onOpenArtwork={onOpenArtwork}
              onFailedCountChange={setFailedCount}
            />
          </Suspense>
        </Canvas>
      </GalleryErrorBoundary>

      <div className="ui-3d-gallery-hud">
        <div className="ui-3d-gallery-pill">3D空間を巡る</div>
        {renderCloseButton(closeRef)}
      </div>
      <div className="ui-3d-gallery-help">
        ドラッグで見回す / ← →で移動 / 作品をクリックで詳細
      </div>
      <nav className="ui-3d-gallery-navigation" aria-label="3D空間の視点移動">
        <button
          type="button"
          className="ui-3d-gallery-navigation-button"
          onClick={() => sceneRef.current?.previous()}
          aria-label="前の視点へ移動"
        >
          ←
        </button>
        <button
          type="button"
          className="ui-3d-gallery-navigation-button"
          onClick={() => sceneRef.current?.next()}
          aria-label="次の視点へ移動"
        >
          →
        </button>
      </nav>
      {failedCount > 0 && (
        <div className="ui-3d-gallery-load-warning" role="status">
          {failedCount}点の作品画像を読み込めませんでした(ページを再読み込みすると再試行します)
        </div>
      )}
    </div>
  )
}
