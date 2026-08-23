import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getArtworkUploadConfigError, isMissingImageDimensionColumnError, omitImageDimensionFields, uploadArtworkImage } from '../lib/artworkUpload'
import { compressImageFile } from '../lib/imageCompress'
import { filesToArtworkImages } from '../lib/artworkImages'
import { T } from '../lib/tokens'
import ArtworkImageAdjuster from './ArtworkImageAdjuster'
import ArtworkImageField from './ArtworkImageField'

function CreatorPicker({ creatorOptions, selectedCreatorIds, onToggleCreator }) {
  if (!creatorOptions?.length) return <div className="ui-field-help">作者候補がありません。</div>
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
    </div>
  )
}

function blobAsFile(blob, originalFile) {
  const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg'
  const baseName = originalFile?.name?.replace(/\.[^.]+$/, '') || 'artwork'
  return new File([blob], `${baseName}-crop.${extension}`, { type: blob.type, lastModified: Date.now() })
}

export default function ArtworkCreateModal({ open, file, files, exhibitionId, profileId, nextOrder, creatorOptions = [], defaultCreatorIds = [], showCreatorPicker = true, onClose, onCreated }) {
  const defaultCreatorKey = defaultCreatorIds.join('|')
  const [phase, setPhase] = useState('crop')
  const [cropQueue, setCropQueue] = useState([])
  const [cropIndex, setCropIndex] = useState(0)
  const [cropReturnsToDetails, setCropReturnsToDetails] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedCreatorIds, setSelectedCreatorIds] = useState([])
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')
  const [limitError, setLimitError] = useState('')
  const [images, setImages] = useState([])
  const [galleryImageId, setGalleryImageId] = useState('')

  useEffect(() => {
    if (!open) {
      setPhase('crop')
      setCropQueue([])
      setCropIndex(0)
      setCropReturnsToDetails(false)
      setTitle('')
      setDescription('')
      setSelectedCreatorIds([])
      setSaving(false)
      setConfirming(false)
      setError('')
      setLimitError('')
      setImages([])
      setGalleryImageId('')
      return undefined
    }
    const initial = filesToArtworkImages(files || (file ? [file] : []))
    initial.forEach((image) => { image.sourceUrl = image.previewUrl })
    setSelectedCreatorIds(defaultCreatorKey ? defaultCreatorKey.split('|') : [])
    setImages(initial)
    setCropQueue(initial.map((image) => image.id))
    setCropIndex(0)
    setCropReturnsToDetails(false)
    setPhase(initial.length ? 'crop' : 'details')
    return () => initial.forEach((image) => URL.revokeObjectURL(image.sourceUrl))
  }, [open, file, files, defaultCreatorKey])

  useEffect(() => {
    if (!open) return undefined
    const handler = (event) => {
      if (event.key !== 'Escape' || saving || confirming) return
      if (phase === 'crop' && cropReturnsToDetails) setPhase('details')
      else onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [confirming, cropReturnsToDetails, onClose, open, phase, saving])

  const cropImageId = cropQueue[cropIndex]
  const cropImage = useMemo(() => images.find((image) => image.id === cropImageId) || null, [cropImageId, images])

  function startCropQueue(ids, returnsToDetails = true) {
    if (!ids.length) return
    setCropQueue(ids)
    setCropIndex(0)
    setCropReturnsToDetails(returnsToDetails)
    setPhase('crop')
    setError('')
  }

  function addFiles(nextFiles) {
    setLimitError('')
    if (images.length + nextFiles.length > 5) {
      setLimitError('画像は最大5枚まで追加できます')
      return
    }
    const next = filesToArtworkImages(nextFiles, images)
    const added = next.slice(images.length).map((image) => ({ ...image, sourceUrl: image.previewUrl }))
    const merged = [...images, ...added]
    setImages(merged)
    startCropQueue(added.map((image) => image.id), true)
  }

  function recrop(id) {
    startCropQueue([id], true)
  }

  function duplicateAndRecrop(id) {
    setLimitError('')
    if (images.length >= 5) {
      setLimitError('画像は最大5枚まで追加できます')
      return
    }
    const source = images.find((image) => image.id === id)
    if (!source) return
    const duplicate = {
      ...source,
      id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-duplicate`,
      previewUrl: source.sourceUrl,
      croppedBlob: null,
      progress: null,
      error: '',
    }
    setImages((prev) => [...prev, duplicate])
    startCropQueue([duplicate.id], true)
  }

  async function confirmCrop(blob) {
    if (!cropImage) return
    const previewUrl = URL.createObjectURL(blob)
    setImages((prev) => prev.map((image) => image.id === cropImage.id ? { ...image, croppedBlob: blob, previewUrl } : image))
    if (cropIndex < cropQueue.length - 1) {
      setCropIndex((index) => index + 1)
      return
    }
    setPhase('details')
  }

  function cancelCrop() {
    if (cropIndex > 0) {
      setCropIndex((index) => index - 1)
      return
    }
    if (cropReturnsToDetails) setPhase('details')
    else onClose()
  }

  async function handleSave() {
    if (!open || images.length === 0 || saving) return
    if (!supabase) { setError('Supabase が未設定です'); return }
    const configError = getArtworkUploadConfigError()
    if (configError) { setError(configError); return }
    setSaving(true)
    setError('')
    let createdArtworkId = null

    try {
      const uploadedImages = []
      for (const image of images) {
        setImages((prev) => prev.map((item) => item.id === image.id ? { ...item, progress: 0, error: '' } : item))
        try {
          const croppedFile = image.croppedBlob ? blobAsFile(image.croppedBlob, image.file) : image.file
          const compressed = await compressImageFile(croppedFile, { maxDimension: 1920 })
          const uploaded = await uploadArtworkImage(compressed, compressed.name, (progress) => {
            setImages((prev) => prev.map((item) => item.id === image.id ? { ...item, progress } : item))
          })
          uploadedImages.push({ ...uploaded, clientId: image.id, file: image.file, fileSize: compressed.size })
          setImages((prev) => prev.map((item) => item.id === image.id ? { ...item, progress: null } : item))
        } catch (uploadError) {
          setImages((prev) => prev.map((item) => item.id === image.id ? { ...item, progress: null, error: uploadError?.message || 'upload failed' } : item))
          throw uploadError
        }
      }

      const cover = uploadedImages[0]
      const payload = {
        exhibition_id: exhibitionId || null,
        profile_id: profileId || null,
        image_url: cover.url,
        title: title.trim(),
        description: description.trim() || null,
        order: nextOrder,
        file_name: cover.file.name,
        file_size: cover.fileSize,
        image_width: cover.width,
        image_height: cover.height,
      }

      let { data: newWork, error: insertError } = await supabase.from('artworks').insert(payload).select().single()
      if (insertError && isMissingImageDimensionColumnError(insertError)) {
        ;({ data: newWork, error: insertError } = await supabase.from('artworks').insert(omitImageDimensionFields(payload)).select().single())
      }
      if (insertError) throw insertError
      createdArtworkId = newWork.id

      const imagePayload = uploadedImages.map((image, index) => ({
        artwork_id: newWork.id,
        url: image.url,
        order: index + 1,
        type: null,
        caption: null,
        width: image.width,
        height: image.height,
        file_name: image.file.name,
        file_size: image.fileSize,
      }))
      const { data: imageRows, error: imageError } = await supabase.from('artwork_images').insert(imagePayload).select()
      if (imageError) throw imageError
      const coverImage = imageRows?.[0]
      const galleryIndex = images.findIndex((image) => image.id === galleryImageId)
      const galleryImage = galleryIndex >= 0 ? imageRows?.[galleryIndex] : null
      if (coverImage?.id) {
        const imageSelectionUpdates = {
          cover_image_id: coverImage.id,
          gallery_image_id: galleryImage?.id || null,
        }
        const { error: coverError } = await supabase.from('artworks').update(imageSelectionUpdates).eq('id', newWork.id)
        if (coverError) throw coverError
        newWork.cover_image_id = coverImage.id
        newWork.gallery_image_id = galleryImage?.id || null
      }
      newWork.artwork_images = imageRows || []

      const creatorRows = selectedCreatorIds.map((creatorProfileId, index) => ({ artwork_id: newWork.id, profile_id: creatorProfileId, display_order: index }))
      if (creatorRows.length > 0) {
        const { error: creatorError } = await supabase.from('artwork_creators').insert(creatorRows)
        if (creatorError) throw creatorError
      }
      const creators = selectedCreatorIds.map((creatorProfileId, index) => ({
        profile_id: creatorProfileId,
        display_order: index,
        profile: creatorOptions.find((profile) => profile.id === creatorProfileId),
      })).filter((creator) => creator.profile)

      createdArtworkId = null
      onCreated?.({ ...newWork, creators })
      onClose()
    } catch (saveError) {
      let message = saveError?.message || '作品の作成に失敗しました'
      if (createdArtworkId) {
        const { error: rollbackError } = await supabase.from('artworks').delete().eq('id', createdArtworkId)
        if (rollbackError) message += `（作成途中のデータ削除にも失敗しました: ${rollbackError.message}）`
      }
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null
  const canSave = images.length > 0 && images.length <= 5 && !saving && images.every((image) => !image.error)

  function toggleCreator(creatorProfileId) {
    setSelectedCreatorIds((prev) => prev.includes(creatorProfileId) ? prev.filter((id) => id !== creatorProfileId) : [...prev, creatorProfileId])
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="artwork-create-title" className="ui-artwork-create-modal">
      <div className="ui-app-card ui-artwork-create-card">
        <div className="ui-artwork-create-header">
          <div>
            <div id="artwork-create-title" className="ui-screen-title" style={{ fontSize: 22, marginTop: 6 }}>{phase === 'crop' ? '画像を調整' : '作品を追加'}</div>
          </div>
          {phase === 'crop' && <div className="ui-artwork-crop-position" aria-live="polite">{cropIndex + 1} / {cropQueue.length}</div>}
          <button onClick={onClose} disabled={saving || confirming} className="ui-modal-close" type="button">×</button>
        </div>

        {phase === 'crop' && cropImage ? (
          <div className="ui-artwork-create-crop-step">
            <ArtworkImageAdjuster
              key={`${cropImage.id}-${cropImage.sourceUrl}`}
              sourceUrl={cropImage.sourceUrl}
              sourceType={cropImage.file.type}
              confirmLabel={cropIndex < cropQueue.length - 1 ? '保存して次へ' : '保存して作品情報へ'}
              confirmingLabel="保存中…"
              onBusyChange={setConfirming}
              onConfirm={confirmCrop}
              secondaryAction={<button type="button" onClick={cancelCrop} disabled={confirming} className="ui-btn ui-btn--ghost">{cropIndex > 0 ? '前の画像へ' : cropReturnsToDetails ? '戻る' : 'キャンセル'}</button>}
            />
          </div>
        ) : (
          <div className="ui-artwork-create-details">
            <ArtworkImageField
              images={images}
              galleryImageId={galleryImageId}
              onGalleryImageChange={setGalleryImageId}
              onChange={setImages}
              onAddFiles={addFiles}
              onRecrop={recrop}
              onDuplicateRecrop={duplicateAndRecrop}
              disabled={saving}
              limitError={limitError}
            />

            <div className="ui-artwork-create-fields">
              <div className="ui-form-label">タイトル</div>
              <div className="ui-input-wrap"><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="作品名を入力" style={{ fontFamily: T.sans }} /></div>
              <div className="ui-form-label">作品説明</div>
              <div className="ui-input-wrap" data-multiline="true"><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="説明文を入力" rows={5} style={{ fontFamily: T.sans }} /></div>
              {showCreatorPicker && <CreatorPicker creatorOptions={creatorOptions} selectedCreatorIds={selectedCreatorIds} onToggleCreator={toggleCreator} />}
              {error && <div className="ui-alert ui-alert--error">{error}</div>}
              <div className="ui-btn-row ui-artwork-create-actions">
                <button onClick={onClose} disabled={saving} className="ui-btn ui-btn--ghost">閉じる</button>
                <button onClick={handleSave} disabled={!canSave} className="ui-btn ui-btn--accent">{saving ? '保存中…' : '保存する'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
