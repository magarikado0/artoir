import { useRef, useState } from 'react'
import { ARTWORK_IMAGE_TYPES, filesToArtworkImages } from '../lib/artworkImages'

const MAX_IMAGES = 5
const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export default function ArtworkImageField({ images, coverId, onChange, onCoverChange, disabled = false }) {
  const [dragging, setDragging] = useState(false)
  const [draggedId, setDraggedId] = useState(null)
  const inputRef = useRef(null)

  function addFiles(files) {
    const candidates = Array.from(files || [])
    const invalid = candidates.find((file) => !ALLOWED_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE)
    if (invalid) {
      window.alert(!ALLOWED_TYPES.includes(invalid.type) ? '対応していない画像形式です。' : '画像サイズは10MB以下にしてください。')
      return
    }
    const next = filesToArtworkImages(candidates, images)
    onChange(next)
    if (!coverId && next[0]) onCoverChange(next[0].id)
  }

  function removeImage(id) {
    if (!window.confirm('この画像を削除しますか？')) return
    const removedIndex = images.findIndex((image) => image.id === id)
    const next = images.filter((image) => image.id !== id)
    onChange(next)
    if (id === coverId) onCoverChange(next[Math.min(removedIndex, Math.max(0, next.length - 1))]?.id || '')
  }

  function move(id, delta) {
    const index = images.findIndex((image) => image.id === id)
    const target = index + delta
    if (index < 0 || target < 0 || target >= images.length) return
    const next = images.slice()
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  function dropOn(targetId) {
    if (!draggedId || draggedId === targetId) return
    const from = images.findIndex((image) => image.id === draggedId)
    const to = images.findIndex((image) => image.id === targetId)
    const next = images.slice()
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onChange(next)
    setDraggedId(null)
  }

  return (
    <div className="ui-multi-image-field">
      <div className="ui-multi-image-heading">
        <div className="ui-form-label">作品画像</div>
        <span>{images.length} / {MAX_IMAGES}枚</span>
      </div>

      {images.length === 0 && (
        <button
          type="button"
          className={`ui-multi-image-dropzone${dragging ? ' is-dragging' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files) }}
          disabled={disabled}
        >
          <strong>画像をドラッグ＆ドロップ</strong>
          <span>またはファイルを選択</span>
          <small>最大5枚まで</small>
        </button>
      )}

      {images.length > 0 && (
        <div className="ui-multi-image-grid">
          {images.map((image, index) => {
            const isCover = image.id === coverId
            return (
              <article
                key={image.id}
                className={`ui-multi-image-card${isCover ? ' is-cover' : ''}`}
                draggable={!disabled}
                onDragStart={() => setDraggedId(image.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => dropOn(image.id)}
              >
                <div className="ui-multi-image-preview">
                  <img src={image.previewUrl} alt={`作品画像 ${index + 1}`} />
                  <span className="ui-multi-image-order" aria-label={`順番 ${index + 1}`}>{index + 1}</span>
                  {isCover && <span className="ui-multi-image-cover">★ カバー画像</span>}
                </div>
                <div className="ui-multi-image-controls">
                  <select
                    aria-label={`画像${index + 1}の種別`}
                    value={image.type || ''}
                    onChange={(event) => onChange(images.map((item) => item.id === image.id ? { ...item, type: event.target.value } : item))}
                    disabled={disabled}
                  >
                    <option value="">種別なし</option>
                    {ARTWORK_IMAGE_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  <details className="ui-multi-image-menu">
                    <summary aria-label={`画像${index + 1}の操作`}>⋮</summary>
                    <div>
                      <button type="button" onClick={() => onCoverChange(image.id)} disabled={isCover || disabled}>カバー画像に設定</button>
                      <label>
                        画像を差し替える
                        <input type="file" accept="image/*" hidden onChange={(event) => {
                          const file = event.target.files?.[0]
                          if (!file) return
                          const replacement = filesToArtworkImages([file], [])?.[0]
                          if (replacement) onChange(images.map((item) => item.id === image.id ? { ...replacement, id: image.id, type: image.type } : item))
                        }} />
                      </label>
                      <button type="button" onClick={() => removeImage(image.id)} disabled={disabled}>削除</button>
                    </div>
                  </details>
                </div>
                <div className="ui-multi-image-move" aria-label={`画像${index + 1}の並び替え`}>
                  <span aria-hidden="true">⋮⋮ ドラッグ</span>
                  <button type="button" onClick={() => move(image.id, -1)} disabled={index === 0 || disabled} aria-label="前へ移動">←</button>
                  <button type="button" onClick={() => move(image.id, 1)} disabled={index === images.length - 1 || disabled} aria-label="後ろへ移動">→</button>
                </div>
                {image.progress !== null && <div className="ui-multi-image-status">アップロード中… {image.progress}%</div>}
                {image.error && (
                  <div className="ui-multi-image-error">
                    アップロードに失敗しました
                    <button type="button" onClick={() => onChange(images.map((item) => item.id === image.id ? { ...item, error: '' } : item))}>再試行</button>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      {images.length > 0 && images.length < MAX_IMAGES && (
        <button type="button" className="ui-btn ui-btn--ghost ui-multi-image-add" onClick={() => inputRef.current?.click()} disabled={disabled}>＋ 画像を追加</button>
      )}
      {images.length >= MAX_IMAGES && <p className="ui-field-help">最大5枚まで登録できます</p>}
      <p className="ui-field-help">1枚目には作品全体が分かる画像をおすすめします。<br />2枚目以降には、細部や質感、側面、展示風景などを追加できます。</p>
      {coverId && <p className="ui-field-help">★ カバー画像は一覧や展覧会で最初に表示される画像です。</p>}
      <input ref={inputRef} type="file" multiple accept="image/*" hidden onChange={(event) => { addFiles(event.target.files); event.target.value = '' }} />
    </div>
  )
}
