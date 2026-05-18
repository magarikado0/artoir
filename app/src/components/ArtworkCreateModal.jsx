import { useEffect, useState } from 'react'
import Cropper from 'react-easy-crop'
import 'react-easy-crop/react-easy-crop.css'
import { supabase } from '../lib/supabase'
import { getCroppedBlob } from '../lib/imageCrop'
import { T } from '../lib/tokens'
import { DashField } from './DashShell'

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
const ASPECT_OPTIONS = [
  { label: '1:1', value: 1 },
  { label: '9:16', value: 9 / 16 },
  { label: '16:9', value: 16 / 9 },
]

function uploadToCloudinary(file, fileName, onProgress) {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', file, fileName || file.name || 'upload.jpg')
    formData.append('upload_preset', UPLOAD_PRESET)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
    }

    xhr.onload = () => {
      if (xhr.status === 200) {
        try {
          const data = JSON.parse(xhr.responseText)
          resolve(data.secure_url)
        } catch {
          reject(new Error('Cloudinary の応答を解析できませんでした'))
        }
        return
      }
      reject(new Error('アップロードに失敗しました'))
    }

    xhr.onerror = () => reject(new Error('ネットワークエラーが発生しました'))
    xhr.send(formData)
  })
}

function getDefaultCrop() {
  return { x: 0, y: 0 }
}

export default function ArtworkCreateModal({ open, file, exhibitionId, nextOrder, onClose, onCreated }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [crop, setCrop] = useState(getDefaultCrop)
  const [zoom, setZoom] = useState(1)
  const [aspect, setAspect] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')

  useEffect(() => {
    if (!open || !file) {
      setTitle('')
      setDescription('')
      setCrop(getDefaultCrop())
      setZoom(1)
      setAspect(1)
      setCroppedAreaPixels(null)
      setSaving(false)
      setProgress(null)
      setError('')
      setPreviewUrl('')
      return undefined
    }

    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [open, file])

  useEffect(() => {
    if (!open) return undefined
    const handler = (e) => { if (e.key === 'Escape' && !saving) onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose, saving])

  async function handleSave() {
    if (!open || !file || !previewUrl || !croppedAreaPixels) return
    if (!supabase) {
      setError('Supabase が未設定です')
      return
    }
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      setError('Cloudinary の設定が不足しています')
      return
    }

    setSaving(true)
    setError('')
    setProgress(0)

    try {
      const croppedBlob = await getCroppedBlob(previewUrl, croppedAreaPixels, file.type)
      const croppedName = file.name?.replace(/\.[^.]+$/, '') || 'artwork'
      const uploadName = `${croppedName}-crop.${croppedBlob.type === 'image/png' ? 'png' : croppedBlob.type === 'image/webp' ? 'webp' : 'jpg'}`
      const imageUrl = await uploadToCloudinary(croppedBlob, uploadName, setProgress)

      const payload = {
        exhibition_id: exhibitionId,
        image_url: imageUrl,
        title: title.trim(),
        description: description.trim() || null,
        order: nextOrder,
        file_name: file.name,
        file_size: file.size,
      }

      const { data: newWork, error: insertError } = await supabase.from('artworks').insert(payload).select().single()
      if (insertError) throw insertError

      onCreated?.(newWork)
      onClose()
    } catch (err) {
      setError(err?.message || '作品の作成に失敗しました')
    } finally {
      setSaving(false)
      setProgress(null)
    }
  }

  if (!open || !file) return null

  const canSave = Boolean(croppedAreaPixels) && !saving

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(17,17,16,0.6)', display: 'grid', placeItems: 'center', padding: 16 }}>
      <div className="ui-app-card" style={{ width: 'min(100%, 1080px)', maxHeight: 'calc(100vh - 32px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 18px 14px', borderBottom: `1px solid ${T.lineSoft}`, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <div>
            <div className="ui-kicker">NEW WORK</div>
            <div className="ui-screen-title" style={{ fontSize: 22, marginTop: 6 }}>作品を追加</div>
          </div>
          <button onClick={onClose} disabled={saving} className="ui-modal-close" type="button" style={{ minWidth: 44, minHeight: 44, padding: 0, borderRadius: 6, border: `1.5px solid ${T.ink}`, background: T.paper, color: T.ink, cursor: saving ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: T.mono, fontSize: 22, lineHeight: 1, fontWeight: 600 }}>
            ×
          </button>
        </div>

        <div className="ui-artwork-create-layout" style={{ gap: 16, padding: 18, overflow: 'auto' }}>
          <div style={{ minWidth: 0 }}>
            <div className="ui-artwork-create-cropbox" style={{ position: 'relative', width: '100%', minHeight: 380, height: 'min(62vh, 620px)', background: T.ink, borderRadius: 12, overflow: 'hidden' }}>
              <Cropper
                image={previewUrl}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
                cropShape="rect"
                showGrid
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels)}
              />
            </div>
            <div style={{ marginTop: 14 }}>
              <div className="ui-form-label">ASPECT</div>
              <div className="ui-segment" style={{ marginTop: 8, width: '100%', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                {ASPECT_OPTIONS.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => {
                      setAspect(option.value)
                      setCrop(getDefaultCrop())
                      setCroppedAreaPixels(null)
                    }}
                    className={aspect === option.value ? 'is-active' : ''}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <div className="ui-form-label">ZOOM</div>
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                style={{ width: '100%', marginTop: 8 }}
              />
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: T.inkMuted, lineHeight: 1.7 }}>
              画像をドラッグして位置を調整し、ズームで切り抜き範囲を決めます。
            </div>
          </div>

          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <DashField
              label="TITLE"
              value={title}
              onChange={setTitle}
              placeholder="作品名を入力"
            />
            <DashField
              label="DESCRIPTION"
              value={description}
              onChange={setDescription}
              placeholder="説明文を入力"
              multiline
            />

            {error && <div style={{ padding: '10px 12px', border: `1px solid ${T.accent}`, color: T.accent, background: 'rgba(190,85,61,0.06)', fontFamily: T.mono, fontSize: 11, letterSpacing: '0.06em' }}>{error}</div>}

            {progress !== null && (
              <div style={{ padding: '10px 12px', border: `1px solid ${T.lineSoft}`, background: T.card }}>
                <div style={{ height: 4, borderRadius: 999, background: T.paperAlt, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progress}%`, background: T.accent }} />
                </div>
                <div style={{ marginTop: 8, fontFamily: T.mono, fontSize: 10, color: T.inkMuted }}>{progress}%</div>
              </div>
            )}

            <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
              <button onClick={onClose} disabled={saving} className="ui-pill-action" style={{ flex: 1, background: T.paperAlt, color: T.ink }}>CANCEL</button>
              <button onClick={handleSave} disabled={!canSave} className="ui-pill-action" style={{ flex: 1, background: canSave ? T.accent : T.inkMuted }}>SAVE</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}