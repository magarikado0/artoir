import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { isConvexQuad, loadOrientedBitmap, warpQuadToBlob } from '../lib/perspectiveWarp'
import { T } from '../lib/tokens'

// クアッドの頂点順は [左上, 右上, 右下, 左下]（TL, TR, BR, BL）。
const HANDLE_LABELS = ['左上', '右上', '右下', '左下']
const LOUPE_SIZE = 132
const LOUPE_ZOOM = 2.5

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function getCornerQuad(width, height) {
  return [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ]
}

/** 元画像を時計回り rotation 度（0/90/180/270）回転した作業用 canvas を返す。0 のときは元のソースをそのまま返す。 */
function rotateToCanvas(source, rotation) {
  if (!rotation) return source
  const w = source.width || source.naturalWidth
  const h = source.height || source.naturalHeight
  const swap = rotation === 90 || rotation === 270
  const canvas = document.createElement('canvas')
  canvas.width = swap ? h : w
  canvas.height = swap ? w : h
  const ctx = canvas.getContext('2d')
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.drawImage(source, -w / 2, -h / 2)
  return canvas
}

/** ドラッグ中のハンドル周辺を拡大表示するルーペ。 */
function Loupe({ bitmap, point, exposure }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !bitmap || !point) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, LOUPE_SIZE, LOUPE_SIZE)
    const half = LOUPE_SIZE / (2 * LOUPE_ZOOM)
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(bitmap, point.x - half, point.y - half, half * 2, half * 2, 0, 0, LOUPE_SIZE, LOUPE_SIZE)
    ctx.strokeStyle = 'rgba(190,85,61,0.95)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(LOUPE_SIZE / 2, 0)
    ctx.lineTo(LOUPE_SIZE / 2, LOUPE_SIZE)
    ctx.moveTo(0, LOUPE_SIZE / 2)
    ctx.lineTo(LOUPE_SIZE, LOUPE_SIZE / 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(LOUPE_SIZE / 2, LOUPE_SIZE / 2, 7, 0, Math.PI * 2)
    ctx.stroke()
  }, [bitmap, point])

  return (
    <canvas
      ref={canvasRef}
      width={LOUPE_SIZE}
      height={LOUPE_SIZE}
      className="ui-quad-loupe"
      style={{ filter: `brightness(${2 ** exposure})` }}
    />
  )
}

/**
 * 4 隅を個別にドラッグして被写体に合わせるクロップ UI（controlled）。
 * Pointer Events でマウス・タッチ両対応。プレビューは縮小画像で行う。
 */
function QuadCropper({ bitmap, quad, onQuadChange, busy, exposure }) {
  const containerRef = useRef(null)
  const overlayRef = useRef(null)
  const canvasRef = useRef(null)
  const [displaySize, setDisplaySize] = useState(null)
  const [activeHandle, setActiveHandle] = useState(null)

  const bw = bitmap ? (bitmap.width || bitmap.naturalWidth) : 0
  const bh = bitmap ? (bitmap.height || bitmap.naturalHeight) : 0

  const getContainedSize = useCallback(() => {
    const box = containerRef.current
    if (!box || !bw || !bh) return null
    const boxWidth = box.clientWidth
    const boxHeight = box.clientHeight
    if (!boxWidth || !boxHeight) return null
    const scale = Math.min(boxWidth / bw, boxHeight / bh)
    return {
      width: Math.max(1, Math.floor(bw * scale)),
      height: Math.max(1, Math.floor(bh * scale)),
    }
  }, [bw, bh])

  // コンテナサイズに追従して表示サイズを更新
  useEffect(() => {
    if (!containerRef.current) return undefined
    const update = () => {
      const next = getContainedSize()
      if (next) setDisplaySize(next)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [getContainedSize])

  // プレビュー（縮小画像）を canvas に描画
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !bitmap || !displaySize) return
    canvas.width = displaySize.width
    canvas.height = displaySize.height
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, displaySize.width, displaySize.height)
    ctx.drawImage(bitmap, 0, 0, displaySize.width, displaySize.height)
  }, [bitmap, displaySize])

  const scale = displaySize && bw ? displaySize.width / bw : 1

  const clientToSource = useCallback((e) => {
    const rect = overlayRef.current.getBoundingClientRect()
    return {
      x: clamp((e.clientX - rect.left) / scale, 0, bw),
      y: clamp((e.clientY - rect.top) / scale, 0, bh),
    }
  }, [scale, bw, bh])

  function moveHandleTo(index, point) {
    onQuadChange(quad.map((p, i) => (i === index ? point : p)))
  }

  function startDrag(index, e) {
    if (busy) return
    e.preventDefault()
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* noop */ }
    setActiveHandle(index)
    moveHandleTo(index, clientToSource(e))
  }

  function moveDrag(index, e) {
    // ポインタキャプチャ中（＝ドラッグ中）のみ反応し、ホバーは無視する
    if (!e.currentTarget.hasPointerCapture?.(e.pointerId)) return
    moveHandleTo(index, clientToSource(e))
  }

  function endDrag(index, e) {
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch { /* noop */ }
    setActiveHandle((current) => (current === index ? null : current))
  }

  const ready = Boolean(bitmap && quad && displaySize)
  const convex = quad ? isConvexQuad(quad) : true

  let loupeStyle = null
  if (activeHandle != null && quad && displaySize) {
    const p = quad[activeHandle]
    const dx = p.x * scale
    const dy = p.y * scale
    loupeStyle = {
      left: clamp(dx - LOUPE_SIZE / 2, 0, Math.max(0, displaySize.width - LOUPE_SIZE)),
      top: dy < displaySize.height / 2 ? displaySize.height - LOUPE_SIZE - 10 : 10,
    }
  }

  return (
    <div
      ref={containerRef}
      className="ui-artwork-create-cropbox"
      style={{
        position: 'relative',
        width: '100%',
        background: T.ink,
        borderRadius: 12,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {ready && (
        <div
          ref={overlayRef}
          style={{ position: 'relative', width: displaySize.width, height: displaySize.height, touchAction: 'none' }}
        >
          <canvas
            ref={canvasRef}
            style={{
              display: 'block',
              width: displaySize.width,
              height: displaySize.height,
              filter: `brightness(${2 ** exposure})`,
            }}
          />
          <svg
            width={displaySize.width}
            height={displaySize.height}
            viewBox={`0 0 ${displaySize.width} ${displaySize.height}`}
            style={{ position: 'absolute', inset: 0, overflow: 'visible' }}
          >
            <polygon
              points={quad.map((p) => `${p.x * scale},${p.y * scale}`).join(' ')}
              fill={convex ? 'rgba(190,85,61,0.12)' : 'rgba(193,62,49,0.18)'}
              stroke={convex ? T.accent : T.warning}
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {quad.map((p, index) => {
              const cx = p.x * scale
              const cy = p.y * scale
              const isActive = activeHandle === index
              return (
                <g
                  key={index}
                  role="slider"
                  aria-label={`${HANDLE_LABELS[index]}の角`}
                  style={{ cursor: 'grab', touchAction: 'none' }}
                  onPointerDown={(e) => startDrag(index, e)}
                  onPointerMove={(e) => moveDrag(index, e)}
                  onPointerUp={(e) => endDrag(index, e)}
                  onPointerCancel={(e) => endDrag(index, e)}
                >
                  {/* 見た目より大きいタッチ判定領域 */}
                  <circle cx={cx} cy={cy} r={22} fill="transparent" />
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isActive ? 13 : 11}
                    fill="rgba(255,255,255,0.18)"
                    stroke="#fff"
                    strokeWidth="2.5"
                  />
                  <circle cx={cx} cy={cy} r={3} fill={T.accent} />
                </g>
              )
            })}
          </svg>
          {loupeStyle && (
            <div className="ui-quad-loupe-wrap" style={loupeStyle}>
              <Loupe bitmap={bitmap} point={quad[activeHandle]} exposure={exposure} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * 作品画像のクロップ＋透視補正 UI。
 * 元画像を EXIF 正規化して読み込み、4 隅を合わせて確定すると、
 * 透視変換で長方形に補正した Blob を `onConfirm` に渡す（確定時のみ原寸で変換）。
 * props は従来の矩形クロップ版と互換のため、呼び出し側（作成/編集モーダル）は変更不要。
 */
export default function ArtworkImageAdjuster({
  sourceUrl,
  sourceType = 'image/jpeg',
  disabled = false,
  confirmLabel = '画像を反映',
  confirmingLabel = '反映中…',
  secondaryAction = null,
  onBusyChange,
  onConfirm,
}) {
  const [bitmap, setBitmap] = useState(null)
  const [rotation, setRotation] = useState(0)
  const [quad, setQuad] = useState(null)
  const [exposure, setExposure] = useState(0)
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setBitmap(null)
    setRotation(0)
    setQuad(null)
    setExposure(0)
    setConfirming(false)
    setError('')
    if (!sourceUrl) return undefined

    let cancelled = false
    setLoading(true)
    loadOrientedBitmap(sourceUrl)
      .then((bmp) => {
        if (cancelled) { bmp.close?.(); return }
        setBitmap(bmp)
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || '画像の読み込みに失敗しました')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [sourceUrl])

  // ImageBitmap の破棄（メモリ解放）
  useEffect(() => () => bitmap?.close?.(), [bitmap])

  // 元画像＋回転から作業用ビットマップを生成し、変わるたびクアッドを四隅にリセットする
  const workBitmap = useMemo(() => (bitmap ? rotateToCanvas(bitmap, rotation) : null), [bitmap, rotation])

  useEffect(() => {
    if (!workBitmap) return
    const w = workBitmap.width || workBitmap.naturalWidth
    const h = workBitmap.height || workBitmap.naturalHeight
    setQuad(getCornerQuad(w, h))
  }, [workBitmap])

  useEffect(() => {
    onBusyChange?.(confirming)
  }, [confirming, onBusyChange])

  useEffect(() => (
    () => onBusyChange?.(false)
  ), [onBusyChange])

  function handleReset() {
    if (!workBitmap) return
    const w = workBitmap.width || workBitmap.naturalWidth
    const h = workBitmap.height || workBitmap.naturalHeight
    setQuad(getCornerQuad(w, h))
  }

  function rotateClockwise() {
    setRotation((current) => (current + 90) % 360)
  }

  async function handleConfirm() {
    if (!workBitmap || !quad || disabled || confirming) return
    setConfirming(true)
    setError('')
    try {
      const blob = await warpQuadToBlob(workBitmap, quad, { mimeType: sourceType, exposure })
      await onConfirm?.(blob)
    } catch (err) {
      setError(err?.message || '画像の反映に失敗しました')
    } finally {
      setConfirming(false)
    }
  }

  const convex = quad ? isConvexQuad(quad) : false
  const busy = disabled || confirming
  const canConfirm = Boolean(workBitmap && quad) && convex && !busy

  return (
    <div style={{ minWidth: 0 }}>
      <QuadCropper bitmap={workBitmap} quad={quad} onQuadChange={setQuad} busy={busy} exposure={exposure} />

      <div className="ui-exposure-control">
        <div className="ui-exposure-heading">
          <label htmlFor="artwork-image-exposure">明るさ</label>
          <output htmlFor="artwork-image-exposure" aria-live="polite">
            {exposure === 0 ? '0.0' : `${exposure > 0 ? '+' : ''}${exposure.toFixed(1)}`} EV
          </output>
        </div>
        <div className="ui-exposure-slider-row">
          <span aria-hidden="true">−</span>
          <input
            id="artwork-image-exposure"
            type="range"
            min="-2"
            max="2"
            step="0.1"
            value={exposure}
            disabled={!workBitmap || busy}
            onChange={(event) => setExposure(Number(event.target.value))}
            aria-label="写真の明るさ"
            aria-valuetext={`${exposure > 0 ? '+' : ''}${exposure.toFixed(1)} EV`}
          />
          <span aria-hidden="true">＋</span>
        </div>
      </div>

      <div className="ui-quad-toolbar">
        <button
          type="button"
          className="ui-quad-rotate"
          disabled={!workBitmap || busy}
          onClick={rotateClockwise}
          title="時計回りに90°回転"
          aria-label="時計回りに90°回転"
        >
          <span aria-hidden="true">↻</span> 90°
        </button>
        <button
          type="button"
          className="ui-quad-reset"
          disabled={!workBitmap || busy}
          onClick={handleReset}
        >
          四隅にリセット
        </button>
      </div>

      {loading && (
        <div style={{ marginTop: 10, fontSize: 12, color: T.inkMuted, lineHeight: 1.7 }}>
          画像を読み込んでいます…
        </div>
      )}

      {quad && !convex && (
        <div className="ui-alert ui-alert--error" style={{ marginTop: 12 }}>
          角が交差しています。四隅が四角形になるように調整してください。
        </div>
      )}
      {error && <div className="ui-alert ui-alert--error" style={{ marginTop: 12 }}>{error}</div>}

      <div className="ui-btn-row ui-artwork-create-actions">
        {secondaryAction}
        <button type="button" onClick={handleConfirm} disabled={!canConfirm} className="ui-btn ui-btn--accent">
          {confirming ? confirmingLabel : confirmLabel}
        </button>
      </div>
    </div>
  )
}
