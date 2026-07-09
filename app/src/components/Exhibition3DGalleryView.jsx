import { Component, Suspense, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import GalleryScene from './gallery3d/GalleryScene'
import './Exhibition3DGalleryView.css'

const REEL_CANVAS_WIDTH = 1080
const REEL_CANVAS_HEIGHT = 1920
const REEL_DPR = 2
const DEFAULT_REEL_SECONDS = 14

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

// リール撮影(?reel=1)のときだけ、Canvas を 1080x1920 固定の枠で包む。
// 通常時は素通し(枠で包むと .ui-3d-gallery-canvas の inset:0 が効かず表示が潰れる)。
function ReelCanvasFrame({ reelMode, children }) {
  if (!reelMode) return children
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: REEL_CANVAS_WIDTH, height: REEL_CANVAS_HEIGHT }}>
      {children}
    </div>
  )
}

export default function Exhibition3DGalleryView({ artworks, onClose, onOpenArtwork, hasOpenArtwork }) {
  const closeRef = useRef(null)
  const sceneRef = useRef(null)
  const autoRecordStartedRef = useRef(false)
  const [failedCount, setFailedCount] = useState(0)
  // ?reel=1 のときだけ、リール撮影用の縦動画モード(1080x1920 固定 + 録画API)を有効化
  const reelMode = typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('reel') === '1'
  const autoRecordMode = typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('record') === '1'

  useEffect(() => {
    if (!reelMode) return undefined
    const supported = typeof MediaRecorder !== 'undefined'
    document.documentElement.dataset.artoirReel = 'ready'
    document.documentElement.dataset.artoirReelRecorder = supported ? 'supported' : 'missing'
    window.__artoirReel = {
      supported,
      // MediaRecorder で録画(webm 自動DL)。使える環境向け。
      record: (opts) => (
        sceneRef.current?.startReel
          ? sceneRef.current.startReel(opts)
          : Promise.reject(new Error('3D scene not ready'))
      ),
      getCanvas: () => document.querySelector('.ui-3d-gallery-overlay canvas'),
      // 決定論フレーム取得 API。driver が seek→toDataURL でフレーム収集し ffmpeg 連結。
      beginCapture: () => sceneRef.current?.beginReelCapture?.() ?? { ok: false },
      seek: (progress) => sceneRef.current?.seekReel?.(progress),
      endCapture: () => sceneRef.current?.endReelCapture?.(),
    }
    return () => {
      delete window.__artoirReel
      delete document.documentElement.dataset.artoirReel
      delete document.documentElement.dataset.artoirReelRecorder
    }
  }, [reelMode])

  useEffect(() => {
    if (!reelMode || !autoRecordMode || autoRecordStartedRef.current) return undefined

    const params = new URLSearchParams(window.location.search)
    const seconds = Number(params.get('seconds')) || DEFAULT_REEL_SECONDS
    const fps = Number(params.get('fps')) || undefined
    const videoBitsPerSecond = Number(params.get('bitrate')) || undefined
    const textureTimeoutMs = Number(params.get('textureTimeoutMs')) || undefined
    let cancelled = false

    const startWhenReady = () => {
      if (cancelled || autoRecordStartedRef.current) return
      if (!sceneRef.current?.startReel) {
        window.setTimeout(startWhenReady, 150)
        return
      }
      autoRecordStartedRef.current = true
      document.documentElement.dataset.artoirReelRecording = 'started'
      sceneRef.current.startReel({ seconds, fps, videoBitsPerSecond, textureTimeoutMs })
        .then((result) => {
          document.documentElement.dataset.artoirReelRecording = result?.ok ? 'done' : 'failed'
        })
        .catch((err) => {
          console.error('[reel] auto recording failed:', err)
          document.documentElement.dataset.artoirReelRecording = 'failed'
        })
    }

    startWhenReady()
    return () => {
      cancelled = true
      delete document.documentElement.dataset.artoirReelRecording
    }
  }, [autoRecordMode, reelMode])

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
        <ReelCanvasFrame reelMode={reelMode}>
          <Canvas
            className={reelMode ? undefined : 'ui-3d-gallery-canvas'}
            style={reelMode ? { width: '100%', height: '100%' } : undefined}
            dpr={reelMode ? REEL_DPR : [1, 3]}
            gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: reelMode }}
            camera={{ fov: 55, near: 0.1, far: 50 }}
          >
            <Suspense fallback={null}>
              <GalleryScene
                ref={sceneRef}
                artworks={artworks}
                onOpenArtwork={onOpenArtwork}
                onFailedCountChange={setFailedCount}
                reelMode={reelMode}
              />
            </Suspense>
          </Canvas>
        </ReelCanvasFrame>
      </GalleryErrorBoundary>

      {reelMode ? null : (
      <>
      <div className="ui-3d-gallery-hud">
        <div className="ui-3d-gallery-pill">3D空間を巡る</div>
        {renderCloseButton(closeRef)}
      </div>
      <div className="ui-3d-gallery-help">
        ドラッグで見回す / ピンチ・ホイールで拡大 / ← →で移動 / 作品をクリックで詳細
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
      </>
      )}
    </div>
  )
}
