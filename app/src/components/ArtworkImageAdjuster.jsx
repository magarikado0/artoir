import { useCallback, useEffect, useRef, useState } from 'react'
import ReactCrop, { convertToPixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { getCroppedBlob, getRotatedBlob, scaleCropToNaturalSize } from '../lib/imageCrop'
import { T } from '../lib/tokens'

function getInitialFreeCrop() {
  return { unit: '%', x: 0, y: 0, width: 100, height: 100 }
}

function FreeImageCrop({ imageUrl, containerRef, visualRotation = 0, onCropPixelsChange }) {
  const imgRef = useRef(null)
  const [crop, setCrop] = useState()
  const [naturalSize, setNaturalSize] = useState(null)
  const [displaySize, setDisplaySize] = useState(null)

  const getContainedSize = useCallback((naturalWidth, naturalHeight) => {
    const box = containerRef.current
    if (!box || !naturalWidth || !naturalHeight) return null
    const boxWidth = box.clientWidth
    const boxHeight = box.clientHeight
    if (!boxWidth || !boxHeight) return null
    const scale = Math.min(boxWidth / naturalWidth, boxHeight / naturalHeight)
    return {
      width: Math.max(1, Math.floor(naturalWidth * scale)),
      height: Math.max(1, Math.floor(naturalHeight * scale)),
    }
  }, [containerRef])

  const applyPixelCrop = useCallback((pixelCrop) => {
    const img = imgRef.current
    if (!img) {
      onCropPixelsChange(null)
      return
    }
    onCropPixelsChange(scaleCropToNaturalSize(pixelCrop, img))
  }, [onCropPixelsChange])

  useEffect(() => {
    if (!naturalSize || !containerRef.current) return undefined
    const updateSize = () => {
      const nextSize = getContainedSize(naturalSize.width, naturalSize.height)
      if (nextSize) setDisplaySize(nextSize)
    }
    updateSize()

    const observer = new ResizeObserver(updateSize)
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [containerRef, getContainedSize, naturalSize])

  useEffect(() => {
    if (!displaySize || !crop) return
    applyPixelCrop(convertToPixelCrop(crop, displaySize.width, displaySize.height))
  }, [applyPixelCrop, crop, displaySize])

  function handleImageLoad(e) {
    const { naturalWidth, naturalHeight } = e.currentTarget
    const initial = getInitialFreeCrop()
    const nextSize = getContainedSize(naturalWidth, naturalHeight)
    setNaturalSize({ width: naturalWidth, height: naturalHeight })
    if (nextSize) setDisplaySize(nextSize)
    setCrop(initial)
    onCropPixelsChange({ x: 0, y: 0, width: naturalWidth, height: naturalHeight })
  }

  const imageStyle = {
    ...(displaySize ? { width: displaySize.width, height: displaySize.height } : {}),
    ...(visualRotation ? { transform: `rotate(${visualRotation}deg)` } : {}),
  }

  return (
    <ReactCrop
      className="ui-artwork-crop-control"
      crop={crop}
      onChange={(_, percentCrop) => setCrop(percentCrop)}
      onComplete={applyPixelCrop}
      ruleOfThirds
    >
      <img
        ref={imgRef}
        src={imageUrl}
        alt=""
        onLoad={handleImageLoad}
        className="ui-artwork-create-crop-image"
        style={Object.keys(imageStyle).length ? imageStyle : undefined}
      />
    </ReactCrop>
  )
}

export default function ArtworkImageAdjuster({
  sourceUrl,
  sourceType = 'image/jpeg',
  disabled = false,
  confirmLabel = '画像を反映',
  confirmingLabel = '反映中…',
  helpText = 'そのまま進むと画像全体が使われます。切り抜く場合は、枠の角や辺をドラッグして調整します。',
  secondaryAction = null,
  onBusyChange,
  onConfirm,
}) {
  const cropboxRef = useRef(null)
  const [rotation, setRotation] = useState(0)
  const [quarterRotation, setQuarterRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [editPreviewUrl, setEditPreviewUrl] = useState(sourceUrl || '')
  const [previewRotation, setPreviewRotation] = useState(0)
  const [rotationPending, setRotationPending] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')
  const appliedRotation = quarterRotation + rotation

  useEffect(() => {
    setRotation(0)
    setQuarterRotation(0)
    setCroppedAreaPixels(null)
    setEditPreviewUrl(sourceUrl || '')
    setPreviewRotation(0)
    setRotationPending(false)
    setConfirming(false)
    setError('')
  }, [sourceUrl])

  useEffect(() => {
    onBusyChange?.(confirming || rotationPending)
  }, [confirming, onBusyChange, rotationPending])

  useEffect(() => (
    () => onBusyChange?.(false)
  ), [onBusyChange])

  useEffect(() => {
    if (!sourceUrl) return undefined
    if (appliedRotation === 0) {
      setEditPreviewUrl(sourceUrl)
      setPreviewRotation(0)
      setRotationPending(false)
      return undefined
    }

    let cancelled = false
    let rotatedUrl = ''
    setRotationPending(true)
    const timer = window.setTimeout(async () => {
      try {
        const blob = await getRotatedBlob(sourceUrl, appliedRotation, sourceType)
        if (cancelled) return
        rotatedUrl = URL.createObjectURL(blob)
        setEditPreviewUrl(rotatedUrl)
        setPreviewRotation(appliedRotation)
      } catch (err) {
        if (!cancelled) setError(err?.message || '画像の回転に失敗しました')
      } finally {
        if (!cancelled) setRotationPending(false)
      }
    }, 120)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      if (rotatedUrl) URL.revokeObjectURL(rotatedUrl)
    }
  }, [appliedRotation, sourceType, sourceUrl])

  function resetCropFrame() {
    setCroppedAreaPixels(null)
  }

  function rotateQuarter(degrees) {
    setQuarterRotation((current) => (current + degrees) % 360)
    resetCropFrame()
  }

  function handleRotationChange(e) {
    setRotation(Number(e.currentTarget.value))
    resetCropFrame()
  }

  async function handleConfirm() {
    if (!sourceUrl || !editPreviewUrl || !croppedAreaPixels || disabled || confirming || rotationPending) return
    setConfirming(true)
    setError('')

    try {
      const croppedBlob = await getCroppedBlob(editPreviewUrl, croppedAreaPixels, sourceType)
      await onConfirm?.(croppedBlob)
    } catch (err) {
      setError(err?.message || '画像の反映に失敗しました')
    } finally {
      setConfirming(false)
    }
  }

  const visualRotation = appliedRotation - previewRotation
  const canConfirm = Boolean(croppedAreaPixels) && !disabled && !confirming && !rotationPending

  return (
    <div style={{ minWidth: 0 }}>
      <div
        ref={cropboxRef}
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
        {editPreviewUrl && (
          <FreeImageCrop
            key={editPreviewUrl}
            imageUrl={editPreviewUrl}
            containerRef={cropboxRef}
            visualRotation={visualRotation}
            onCropPixelsChange={setCroppedAreaPixels}
          />
        )}
      </div>
      <div style={{ marginTop: 14 }}>
        <div className="ui-artwork-rotation-actions" aria-label="画像を90度回転">
          <button type="button" disabled={disabled || confirming} onClick={() => rotateQuarter(-90)}>
            <span aria-hidden="true">↶</span> 左へ90°
          </button>
          <button type="button" disabled={disabled || confirming} onClick={() => rotateQuarter(90)}>
            右へ90° <span aria-hidden="true">↷</span>
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div className="ui-form-label">傾き</div>
          <button
            type="button"
            className="ui-artwork-rotation-reset"
            disabled={rotation === 0 || disabled || confirming}
            onClick={() => {
              setRotation(0)
              resetCropFrame()
            }}
          >
            0°に戻す
          </button>
        </div>
        <div className="ui-artwork-rotation-control">
          <span>−15°</span>
          <input
            type="range"
            min="-15"
            max="15"
            step="0.1"
            value={rotation}
            disabled={disabled || confirming}
            aria-label="画像の傾き"
            onInput={handleRotationChange}
            onChange={handleRotationChange}
          />
          <span>+15°</span>
          <output>{rotation.toFixed(1)}°</output>
        </div>
        {rotationPending && <div className="ui-field-help" style={{ marginTop: 6 }}>傾きを反映しています…</div>}
      </div>
      <div style={{ marginTop: 10, fontSize: 12, color: T.inkMuted, lineHeight: 1.7 }}>
        {helpText}
      </div>
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
