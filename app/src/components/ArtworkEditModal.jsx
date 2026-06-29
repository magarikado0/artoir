import { useEffect, useState } from 'react'
import ArtworkImageAdjuster from './ArtworkImageAdjuster'
import ArtworkMedia from './ArtworkMedia'
import { T } from '../lib/tokens'

export default function ArtworkEditModal({
  artwork,
  title,
  description,
  saving,
  deleting = false,
  error,
  children,
  onTitleChange,
  onDescriptionChange,
  onSave,
  onDelete,
  onClose,
}) {
  const [adjusting, setAdjusting] = useState(false)
  const [imageBusy, setImageBusy] = useState(false)
  const [pendingImageBlob, setPendingImageBlob] = useState(null)
  const [pendingImagePreviewUrl, setPendingImagePreviewUrl] = useState('')

  useEffect(() => {
    if (!pendingImagePreviewUrl) return undefined
    return () => URL.revokeObjectURL(pendingImagePreviewUrl)
  }, [pendingImagePreviewUrl])

  if (!artwork) return null

  const disabled = saving || deleting || imageBusy
  const previewUrl = pendingImagePreviewUrl || artwork.image_url

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="artwork-edit-title" className="ui-artwork-create-modal">
      <div className="ui-app-card ui-artwork-edit-card">
        <div style={{ padding: '18px 20px 16px', borderBottom: `1px solid ${T.lineSoft}`, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <div>
            <div className="ui-kicker">作品</div>
            <div id="artwork-edit-title" className="ui-screen-title" style={{ fontSize: 22, marginTop: 6 }}>作品を編集</div>
          </div>
          <button onClick={onClose} disabled={disabled} className="ui-modal-close" type="button">
            ×
          </button>
        </div>

        <div className={`ui-artwork-create-layout ${adjusting ? 'is-crop-step' : ''}`}>
          {adjusting ? (
            <ArtworkImageAdjuster
              sourceUrl={previewUrl}
              sourceType="image/jpeg"
              disabled={saving || deleting}
              confirmLabel="画像を反映"
              confirmingLabel="反映中…"
              onBusyChange={setImageBusy}
              onConfirm={(croppedBlob) => {
                setPendingImageBlob(croppedBlob)
                setPendingImagePreviewUrl(URL.createObjectURL(croppedBlob))
                setAdjusting(false)
              }}
              secondaryAction={
                <button type="button" onClick={() => setAdjusting(false)} disabled={disabled} className="ui-btn ui-btn--ghost">
                  戻る
                </button>
              }
            />
          ) : (
            <>
              <div style={{ minWidth: 0 }}>
                <div className="ui-artwork-confirmed-preview">
                  <ArtworkMedia
                    src={previewUrl}
                    alt=""
                    decorative
                    loading="eager"
                    fit="contain"
                    fillHeight
                    wrapperStyle={{ width: '100%', height: '100%', borderRadius: 12, background: 'transparent' }}
                    imageStyle={{ borderRadius: 12, objectFit: 'contain' }}
                  />
                </div>
                {pendingImageBlob && (
                  <div className="ui-field-help" style={{ marginTop: 8 }}>
                    調整後の画像です。保存するとこの画像に更新されます。
                  </div>
                )}
                <button
                  type="button"
                  className="ui-artwork-adjust-button"
                  disabled={disabled}
                  onClick={() => setAdjusting(true)}
                >
                  画像を調整
                </button>
              </div>

              <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="ui-input-wrap">
                  <input value={title} onChange={(e) => onTitleChange(e.target.value)} placeholder="作品名を入力" />
                </div>
                <div className="ui-input-wrap" data-multiline="true">
                  <textarea value={description} onChange={(e) => onDescriptionChange(e.target.value)} rows={4} placeholder="説明文を入力" />
                </div>
                {children}
                {error && <div className="ui-alert ui-alert--error">{error}</div>}
                <div className="ui-btn-row ui-artwork-create-actions" style={{ marginTop: 'auto' }}>
                  <button type="button" onClick={onClose} disabled={disabled} className="ui-btn ui-btn--ghost">閉じる</button>
                  <button type="button" onClick={() => onSave(pendingImageBlob)} disabled={disabled} className="ui-btn ui-btn--accent">
                    {saving ? '保存中…' : '保存する'}
                  </button>
                </div>
                {onDelete && (
                  <button type="button" onClick={onDelete} disabled={disabled} className="ui-btn ui-btn--danger ui-btn-block">
                    {deleting ? '削除中…' : '作品を削除'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
