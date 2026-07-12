import { useRef, useState } from 'react'

const MAX_IMAGES = 5
const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export default function ArtworkImageField({ images, onChange, onAddFiles, onRecrop, onDuplicateRecrop, disabled = false, limitError = '' }) {
  const [draggedId, setDraggedId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)
  const inputRef = useRef(null)
  const longPressTimerRef = useRef(null)
  const touchDragIdRef = useRef(null)
  const touchStartRef = useRef(null)

  function validateAndAdd(files) {
    const candidates = Array.from(files || [])
    if (!candidates.length) return
    const invalid = candidates.find((file) => !ALLOWED_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE)
    if (invalid) {
      window.alert(!ALLOWED_TYPES.includes(invalid.type) ? '対応していない画像形式です。' : '画像サイズは10MB以下にしてください。')
      return
    }
    onAddFiles(candidates)
  }

  function removeImage(id) {
    if (!window.confirm('この画像を削除しますか？')) return
    onChange(images.filter((image) => image.id !== id))
  }

  function dropOn(targetId, sourceId = draggedId) {
    if (!sourceId || sourceId === targetId) {
      setDraggedId(null)
      setDragOverId(null)
      return
    }
    const from = images.findIndex((image) => image.id === sourceId)
    const to = images.findIndex((image) => image.id === targetId)
    if (from < 0 || to < 0) return
    const next = images.slice()
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onChange(next)
    setDraggedId(null)
    setDragOverId(null)
  }

  function startTouchReorder(event, id) {
    if (event.pointerType === 'mouse' || disabled) return
    touchStartRef.current = { x: event.clientX, y: event.clientY }
    clearTimeout(longPressTimerRef.current)
    longPressTimerRef.current = setTimeout(() => {
      touchDragIdRef.current = id
      setDraggedId(id)
      setDragOverId(id)
      try { event.currentTarget.setPointerCapture(event.pointerId) } catch { /* noop */ }
    }, 360)
  }

  function moveTouchReorder(event) {
    if (!touchDragIdRef.current) {
      const start = touchStartRef.current
      if (start && (Math.abs(event.clientX - start.x) > 8 || Math.abs(event.clientY - start.y) > 8)) clearTimeout(longPressTimerRef.current)
      return
    }
    event.preventDefault()
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-artwork-image-id]')
    if (target?.dataset?.artworkImageId) setDragOverId(target.dataset.artworkImageId)
  }

  function endTouchReorder() {
    clearTimeout(longPressTimerRef.current)
    const sourceId = touchDragIdRef.current
    touchDragIdRef.current = null
    touchStartRef.current = null
    if (sourceId && dragOverId) dropOn(dragOverId, sourceId)
  }

  return (
    <div className="ui-multi-image-field">
      <div className="ui-multi-image-heading">
        <div className="ui-form-label">画像</div>
        <span>{images.length} / {MAX_IMAGES}</span>
      </div>

      <div
        className="ui-multi-image-grid"
        onDragOver={(event) => {
          if (Array.from(event.dataTransfer.types || []).includes('Files')) event.preventDefault()
        }}
        onDrop={(event) => {
          if (!event.dataTransfer.files?.length) return
          event.preventDefault()
          validateAndAdd(event.dataTransfer.files)
        }}
      >
        {images.map((image, index) => (
          <article
            key={image.id}
            data-artwork-image-id={image.id}
            className={['ui-multi-image-card', index === 0 && 'is-cover', dragOverId === image.id && draggedId !== image.id && 'is-drag-over'].filter(Boolean).join(' ')}
            draggable={!disabled}
            onDragStart={() => setDraggedId(image.id)}
            onDragEnd={() => { setDraggedId(null); setDragOverId(null) }}
            onDragOver={(event) => { event.preventDefault(); setDragOverId(image.id) }}
            onDrop={(event) => {
              event.stopPropagation()
              if (event.dataTransfer.files?.length) validateAndAdd(event.dataTransfer.files)
              else dropOn(image.id)
            }}
            onPointerDown={(event) => startTouchReorder(event, image.id)}
            onPointerMove={moveTouchReorder}
            onPointerUp={endTouchReorder}
            onPointerCancel={endTouchReorder}
          >
            <div className="ui-multi-image-preview">
              <img src={image.previewUrl} alt={`作品画像 ${index + 1}`} />
              <span className="ui-multi-image-order" aria-label={`順番 ${index + 1}`}>{index + 1}</span>
              {index === 0 && <span className="ui-multi-image-cover">カバー</span>}
            </div>
            <div className="ui-multi-image-card-footer">
              <span className="ui-multi-image-drag-label" aria-hidden="true">⋮⋮ ドラッグ</span>
              <details className="ui-multi-image-menu">
                <summary aria-label={`画像${index + 1}の操作`}>⋮</summary>
                <div>
                  <button type="button" onClick={() => onRecrop(image.id)} disabled={disabled}>再クロップ</button>
                  <button type="button" onClick={() => onDuplicateRecrop(image.id)} disabled={disabled || images.length >= MAX_IMAGES}>複製して再クロップ</button>
                  <button type="button" onClick={() => removeImage(image.id)} disabled={disabled}>削除</button>
                </div>
              </details>
            </div>
            {image.progress !== null && <div className="ui-multi-image-status">アップロード中… {image.progress}%</div>}
            {image.error && (
              <div className="ui-multi-image-error">
                アップロードに失敗しました
                <button type="button" onClick={() => onChange(images.map((item) => item.id === image.id ? { ...item, error: '' } : item))}>再試行</button>
              </div>
            )}
          </article>
        ))}

        {images.length < MAX_IMAGES && (
          <button type="button" className="ui-multi-image-add-card" onClick={() => inputRef.current?.click()} disabled={disabled}>
            <span aria-hidden="true">＋</span>
            <span>追加</span>
          </button>
        )}
      </div>

      {limitError && <p className="ui-multi-image-limit-error" role="alert">{limitError}</p>}
      <input ref={inputRef} type="file" multiple accept="image/*" hidden onChange={(event) => { validateAndAdd(event.target.files); event.target.value = '' }} />
    </div>
  )
}
