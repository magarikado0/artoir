import { useEffect, useRef, useState } from 'react'
import ReactCrop, { convertToPixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { supabase } from '../lib/supabase'
import { getCroppedBlob, getRotatedBlob, scaleCropToNaturalSize } from '../lib/imageCrop'
import { T } from '../lib/tokens'

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
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

function getInitialFreeCrop() {
  return { unit: '%', x: 0, y: 0, width: 100, height: 100 }
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
    const initial = getInitialFreeCrop()
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
        className="ui-artwork-create-crop-image"
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
  const [step, setStep] = useState('crop')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedCreatorIds, setSelectedCreatorIds] = useState([])
  const [creatorsVisible, setCreatorsVisible] = useState(true)
  const [rotation, setRotation] = useState(0)
  const [quarterRotation, setQuarterRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [editPreviewUrl, setEditPreviewUrl] = useState('')
  const [confirmedBlob, setConfirmedBlob] = useState(null)
  const [confirmedPreviewUrl, setConfirmedPreviewUrl] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [rotationPending, setRotationPending] = useState(false)
  const appliedRotation = quarterRotation + rotation

  useEffect(() => {
    if (!open || !file) {
      setStep('crop')
      setTitle('')
      setDescription('')
      setSelectedCreatorIds([])
      setCreatorsVisible(true)
      setRotation(0)
      setQuarterRotation(0)
      setCroppedAreaPixels(null)
      setSaving(false)
      setProgress(null)
      setError('')
      setPreviewUrl('')
      setEditPreviewUrl('')
      setConfirmedBlob(null)
      setConfirmedPreviewUrl('')
      setConfirming(false)
      setRotationPending(false)
      return undefined
    }

    const url = URL.createObjectURL(file)
    setSelectedCreatorIds(defaultCreatorIds)
    setPreviewUrl(url)
    setEditPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [open, file, defaultCreatorIds])

  useEffect(() => {
    if (!confirmedPreviewUrl) return undefined
    return () => URL.revokeObjectURL(confirmedPreviewUrl)
  }, [confirmedPreviewUrl])

  useEffect(() => {
    if (!previewUrl || !file) return undefined
    if (appliedRotation === 0) {
      setEditPreviewUrl(previewUrl)
      setRotationPending(false)
      return undefined
    }

    let cancelled = false
    let rotatedUrl = ''
    setRotationPending(true)
    const timer = window.setTimeout(async () => {
      try {
        const blob = await getRotatedBlob(previewUrl, appliedRotation, file.type)
        if (cancelled) return
        rotatedUrl = URL.createObjectURL(blob)
        setEditPreviewUrl(rotatedUrl)
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
  }, [appliedRotation, file, previewUrl])

  useEffect(() => {
    if (!open) return undefined
    const handler = (e) => { if (e.key === 'Escape' && !saving && !confirming) onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [confirming, open, onClose, saving])

  async function handleConfirmImage() {
    if (!open || !file || !editPreviewUrl || !croppedAreaPixels || rotationPending || confirming) return

    setConfirming(true)
    setError('')

    try {
      const croppedBlob = await getCroppedBlob(editPreviewUrl, croppedAreaPixels, file.type)
      setConfirmedBlob(croppedBlob)
      setConfirmedPreviewUrl(URL.createObjectURL(croppedBlob))
      setStep('details')
    } catch (err) {
      setError(err?.message || '画像の確定に失敗しました')
    } finally {
      setConfirming(false)
    }
  }

  async function handleSave() {
    if (!open || !file || !confirmedBlob || saving) return
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
      const croppedName = file.name?.replace(/\.[^.]+$/, '') || 'artwork'
      const uploadName = `${croppedName}-crop.${confirmedBlob.type === 'image/png' ? 'png' : 'jpg'}`
      const imageUrl = await uploadToCloudinary(confirmedBlob, uploadName, setProgress)

      const payload = {
        exhibition_id: exhibitionId,
        image_url: imageUrl,
        title: title.trim(),
        description: description.trim() || null,
        order: nextOrder,
        file_name: file.name,
        file_size: confirmedBlob.size,
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

  const canConfirmImage = Boolean(croppedAreaPixels) && !confirming && !rotationPending
  const canSave = Boolean(confirmedBlob) && !saving

  function toggleCreator(profileId) {
    setSelectedCreatorIds((prev) => (
      prev.includes(profileId)
        ? prev.filter((id) => id !== profileId)
        : [...prev, profileId]
    ))
  }

  function resetCropFrame() {
    setCroppedAreaPixels(null)
    setConfirmedBlob(null)
    setConfirmedPreviewUrl('')
  }

  function rotateQuarter(degrees) {
    setQuarterRotation((current) => (current + degrees) % 360)
    resetCropFrame()
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="artwork-create-title" className="ui-artwork-create-modal">
      <div className="ui-app-card ui-artwork-create-card">
        <div style={{ padding: '18px 20px 16px', borderBottom: `1px solid ${T.lineSoft}`, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <div>
            <div className="ui-kicker">作品</div>
            <div id="artwork-create-title" className="ui-screen-title" style={{ fontSize: 22, marginTop: 6 }}>作品を追加</div>
          </div>
          <button onClick={onClose} disabled={saving || confirming} className="ui-modal-close" type="button">
            ×
          </button>
        </div>

        <div className={`ui-artwork-create-layout ${step === 'crop' ? 'is-crop-step' : ''}`}>
          {step === 'crop' ? (
            <div style={{ minWidth: 0 }}>
              <div
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
                <FreeImageCrop
                  key={editPreviewUrl}
                  imageUrl={editPreviewUrl}
                  onCropPixelsChange={setCroppedAreaPixels}
                />
              </div>
              <div style={{ marginTop: 14 }}>
                <div className="ui-artwork-rotation-actions" aria-label="画像を90度回転">
                  <button type="button" disabled={confirming} onClick={() => rotateQuarter(-90)}>
                    <span aria-hidden="true">↶</span> 左へ90°
                  </button>
                  <button type="button" disabled={confirming} onClick={() => rotateQuarter(90)}>
                    右へ90° <span aria-hidden="true">↷</span>
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div className="ui-form-label">傾き</div>
                  <button
                    type="button"
                    className="ui-artwork-rotation-reset"
                    disabled={rotation === 0 || confirming}
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
                    disabled={confirming}
                    aria-label="画像の傾き"
                    onChange={(e) => {
                      setRotation(Number(e.target.value))
                      resetCropFrame()
                    }}
                  />
                  <span>+15°</span>
                  <output>{rotation.toFixed(1)}°</output>
                </div>
                {rotationPending && <div className="ui-field-help" style={{ marginTop: 6 }}>傾きを反映しています…</div>}
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: T.inkMuted, lineHeight: 1.7 }}>
                そのまま進むと画像全体が使われます。切り抜く場合は、枠の角や辺をドラッグして調整します。
              </div>
              {error && <div className="ui-alert ui-alert--error" style={{ marginTop: 12 }}>{error}</div>}
              <div className="ui-btn-row ui-artwork-create-actions">
                <button onClick={onClose} disabled={confirming} className="ui-btn ui-btn--ghost">閉じる</button>
                <button onClick={handleConfirmImage} disabled={!canConfirmImage} className="ui-btn ui-btn--accent">
                  {confirming ? '確定中…' : '画像を確定'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ minWidth: 0 }}>
                <div className="ui-artwork-confirmed-preview">
                  <img src={confirmedPreviewUrl} alt="" />
                </div>
                <button
                  type="button"
                  className="ui-artwork-adjust-button"
                  disabled={saving}
                  onClick={() => {
                    setError('')
                    setProgress(null)
                    setStep('crop')
                  }}
                >
                  画像を調整し直す
                </button>
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

                <div className="ui-btn-row ui-artwork-create-actions" style={{ marginTop: 'auto' }}>
                  <button onClick={onClose} disabled={saving} className="ui-btn ui-btn--ghost">閉じる</button>
                  <button onClick={handleSave} disabled={!canSave} className="ui-btn ui-btn--accent">保存する</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
