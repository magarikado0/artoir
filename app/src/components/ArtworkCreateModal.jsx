import { useEffect, useRef, useState } from 'react'
import Cropper from 'react-easy-crop'
import 'react-easy-crop/react-easy-crop.css'
import ReactCrop, { centerCrop, convertToPixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { supabase } from '../lib/supabase'
import { getCroppedBlob, scaleCropToNaturalSize } from '../lib/imageCrop'
import { T } from '../lib/tokens'

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
const ASPECT_OPTIONS = [
  { label: '1:1', value: 1 },
  { label: '9:16', value: 9 / 16 },
  { label: '16:9', value: 16 / 9 },
  { label: 'カスタム', value: null },
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

function getInitialFreeCrop(width, height) {
  return centerCrop({ unit: '%', width: 80, height: 80 }, width, height)
}

function FreeImageCrop({ imageUrl, onCropPixelsChange }) {
  const imgRef = useRef(null)
  const [crop, setCrop] = useState()

  function applyPixelCrop(pixelCrop) {
    const img = imgRef.current
    if (!img) {
      onCropPixelsChange(null)
      return
    }
    onCropPixelsChange(scaleCropToNaturalSize(pixelCrop, img))
  }

  function handleImageLoad(e) {
    const { width, height } = e.currentTarget
    const initial = getInitialFreeCrop(width, height)
    setCrop(initial)
    applyPixelCrop(convertToPixelCrop(initial, width, height))
  }

  return (
    <ReactCrop
      crop={crop}
      onChange={(_, percentCrop) => setCrop(percentCrop)}
      onComplete={applyPixelCrop}
      ruleOfThirds
      style={{ maxHeight: '100%', maxWidth: '100%' }}
    >
      <img
        ref={imgRef}
        src={imageUrl}
        alt=""
        onLoad={handleImageLoad}
        style={{ display: 'block', maxHeight: 'min(62vh, 620px)', maxWidth: '100%', width: 'auto', height: 'auto' }}
      />
    </ReactCrop>
  )
}

function CreatorPicker({ creatorOptions, selectedCreatorIds, onToggleCreator, creatorsVisible, onVisibleChange }) {
  if (!creatorOptions?.length) {
    return <div className="ui-field-help">作者候補がありません。</div>
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div className="ui-form-label">作者</div>
      <div className="ui-creator-choice-list">
        {creatorOptions.map((profile) => {
          const checked = selectedCreatorIds.includes(profile.id)
          return (
            <label key={profile.id} className={`ui-creator-choice ${checked ? 'is-selected' : ''}`}>
              <input type="checkbox" checked={checked} onChange={() => onToggleCreator(profile.id)} />
              <span>{profile.display_name}</span>
              <small>@{profile.slug}</small>
            </label>
          )
        })}
      </div>
      <label className="ui-creator-visible-toggle">
        <input type="checkbox" checked={creatorsVisible} onChange={(e) => onVisibleChange(e.target.checked)} />
        <span>公開画面に作者を表示する</span>
      </label>
    </div>
  )
}

export default function ArtworkCreateModal({ open, file, exhibitionId, nextOrder, creatorOptions = [], defaultCreatorIds = [], onClose, onCreated }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedCreatorIds, setSelectedCreatorIds] = useState([])
  const [creatorsVisible, setCreatorsVisible] = useState(true)
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
      setSelectedCreatorIds([])
      setCreatorsVisible(true)
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
    setSelectedCreatorIds(defaultCreatorIds)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [open, file, defaultCreatorIds])

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
      const uploadName = `${croppedName}-crop.${croppedBlob.type === 'image/png' ? 'png' : 'jpg'}`
      const imageUrl = await uploadToCloudinary(croppedBlob, uploadName, setProgress)

      const payload = {
        exhibition_id: exhibitionId,
        image_url: imageUrl,
        title: title.trim(),
        description: description.trim() || null,
        order: nextOrder,
        file_name: file.name,
        file_size: croppedBlob.size,
      }

      const { data: newWork, error: insertError } = await supabase.from('artworks').insert(payload).select().single()
      if (insertError) throw insertError

      const creatorRows = selectedCreatorIds.map((profileId, index) => ({
        artwork_id: newWork.id,
        profile_id: profileId,
        display_order: index,
        is_visible: creatorsVisible,
      }))
      if (creatorRows.length > 0) {
        const { error: creatorError } = await supabase.from('artwork_creators').insert(creatorRows)
        if (creatorError) throw creatorError
      }

      const creators = selectedCreatorIds.map((profileId, index) => ({
        profile_id: profileId,
        display_order: index,
        is_visible: creatorsVisible,
        profile: creatorOptions.find((profile) => profile.id === profileId),
      })).filter((creator) => creator.profile)

      onCreated?.({ ...newWork, creators })
      onClose()
    } catch (err) {
      setError(err?.message || '作品の作成に失敗しました')
    } finally {
      setSaving(false)
      setProgress(null)
    }
  }

  if (!open || !file) return null

  const isFreeAspect = aspect === null
  const canSave = Boolean(croppedAreaPixels) && !saving

  function toggleCreator(profileId) {
    setSelectedCreatorIds((prev) => (
      prev.includes(profileId)
        ? prev.filter((id) => id !== profileId)
        : [...prev, profileId]
    ))
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="artwork-create-title" style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(17,17,16,0.6)', display: 'grid', placeItems: 'center', padding: 16 }}>
      <div className="ui-app-card" style={{ width: 'min(100%, 1080px)', maxHeight: 'calc(100vh - 32px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '18px 20px 16px', borderBottom: `1px solid ${T.lineSoft}`, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <div>
            <div className="ui-kicker">作品</div>
            <div id="artwork-create-title" className="ui-screen-title" style={{ fontSize: 22, marginTop: 6 }}>作品を追加</div>
          </div>
          <button onClick={onClose} disabled={saving} className="ui-modal-close" type="button">
            ×
          </button>
        </div>

        <div className="ui-artwork-create-layout" style={{ gap: 16, padding: 18, overflow: 'auto' }}>
          <div style={{ minWidth: 0 }}>
            <div
              className="ui-artwork-create-cropbox"
              style={{
                position: 'relative',
                width: '100%',
                minHeight: 380,
                height: 'min(62vh, 620px)',
                background: T.ink,
                borderRadius: 12,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isFreeAspect ? (
                <FreeImageCrop
                  key={previewUrl}
                  imageUrl={previewUrl}
                  onCropPixelsChange={setCroppedAreaPixels}
                />
              ) : (
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
              )}
            </div>
            <div style={{ marginTop: 14 }}>
              <div className="ui-form-label">ASPECT</div>
              <div className="ui-segment" style={{ marginTop: 8, width: '100%', display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
                {ASPECT_OPTIONS.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => {
                      setAspect(option.value)
                      setCrop(getDefaultCrop())
                      setZoom(1)
                      setCroppedAreaPixels(null)
                    }}
                    className={aspect === option.value ? 'is-active' : ''}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            {!isFreeAspect && (
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
            )}
            <div style={{ marginTop: 10, fontSize: 12, color: T.inkMuted, lineHeight: 1.7 }}>
              {isFreeAspect
                ? '切り抜き枠をドラッグして移動し、角や辺をドラッグしてサイズを調整します。'
                : '画像をドラッグして位置を調整し、ズームで切り抜き範囲を決めます。'}
            </div>
          </div>

          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="ui-input-wrap">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="作品名を入力"
                style={{ fontFamily: T.sans }}
              />
            </div>
            <div className="ui-input-wrap" data-multiline="true">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="説明文を入力"
                rows={4}
                style={{ fontFamily: T.sans }}
              />
            </div>

            <CreatorPicker
              creatorOptions={creatorOptions}
              selectedCreatorIds={selectedCreatorIds}
              onToggleCreator={toggleCreator}
              creatorsVisible={creatorsVisible}
              onVisibleChange={setCreatorsVisible}
            />

            {error && <div className="ui-alert ui-alert--error">{error}</div>}

            {progress !== null && (
              <div style={{ padding: '10px 12px', border: `1px solid ${T.lineSoft}`, background: T.card }}>
                <div style={{ height: 4, borderRadius: 999, background: T.paperAlt, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progress}%`, background: T.accent }} />
                </div>
                <div style={{ marginTop: 8, fontSize: 12, color: T.inkMuted }}>{progress}%</div>
              </div>
            )}

            <div className="ui-btn-row" style={{ marginTop: 'auto' }}>
              <button onClick={onClose} disabled={saving} className="ui-btn ui-btn--ghost">閉じる</button>
              <button onClick={handleSave} disabled={!canSave} className="ui-btn ui-btn--accent">保存する</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
