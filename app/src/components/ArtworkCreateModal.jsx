import { useCallback, useEffect, useMemo, useState } from 'react'
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
  const [cropIntent, setCropIntent] = useState('initial')
  const [provisionalImageIds, setProvisionalImageIds] = useState([])
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
      setCropIntent('initial')
      setProvisionalImageIds([])
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
    setCropIntent('initial')
    setProvisionalImageIds([])
    setPhase(initial.length ? 'crop' : 'details')
    return () => initial.forEach((image) => URL.revokeObjectURL(image.sourceUrl))
  }, [open, file, files, defaultCreatorKey])

  const cropImageId = cropQueue[cropIndex]
  const cropImage = useMemo(() => images.find((image) => image.id === cropImageId) || null, [cropImageId, images])

  function startCropQueue(ids, returnsToDetails = true, provisionalIds = [], intent = 'recrop') {
    if (!ids.length) return
    setCropQueue(ids)
    setCropIndex(0)
    setCropReturnsToDetails(returnsToDetails)
    setCropIntent(intent)
    setProvisionalImageIds(provisionalIds)
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
    const addedIds = added.map((image) => image.id)
    setImages(merged)
    startCropQueue(addedIds, true, addedIds, 'new-files')
  }

  function recrop(id) {
    startCropQueue([id], true, [], 'recrop')
  }

  function duplicateAndRecrop(id, intentOverride = '') {
    setLimitError('')
    if (images.length >= 5) {
      setLimitError('画像は最大5枚まで追加できます')
      return
    }
    const source = images.find((image) => image.id === id)
    if (!source) return
    // previewUrl はクロップ結果に置き換わるため、再クロップでは保持中の元画像を使う。
    const originalSourceUrl = source.sourceUrl
      || (source.file ? URL.createObjectURL(source.file) : source.previewUrl)
    const duplicate = {
      ...source,
      id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-duplicate`,
      sourceUrl: originalSourceUrl,
      previewUrl: originalSourceUrl,
      croppedBlob: null,
      progress: null,
      error: '',
    }
    setImages((prev) => [...prev, duplicate])
    startCropQueue(
      [duplicate.id],
      true,
      [duplicate.id],
      intentOverride || (id === images[0]?.id ? 'cover-detail' : 'duplicate'),
    )
  }

  function duplicateCoverAndRecrop(coverImageId) {
    const currentCoverImage = images[0]
    if (!currentCoverImage) return
    const resolvedCoverImageId = currentCoverImage.id === coverImageId
      ? coverImageId
      : currentCoverImage.id
    duplicateAndRecrop(resolvedCoverImageId, 'cover-detail')
  }

  async function confirmCrop(blob) {
    if (!cropImage) return
    const previewUrl = URL.createObjectURL(blob)
    setImages((prev) => prev.map((image) => image.id === cropImage.id ? { ...image, croppedBlob: blob, previewUrl } : image))
    if (cropIndex < cropQueue.length - 1) {
      setCropIndex((index) => index + 1)
      return
    }
    setCropQueue([])
    setCropIndex(0)
    setCropReturnsToDetails(false)
    setCropIntent('recrop')
    setProvisionalImageIds([])
    setPhase('details')
  }

  const hasUnsavedChanges = images.length > 0
    || Boolean(title.trim())
    || Boolean(description.trim())
    || selectedCreatorIds.join('|') !== defaultCreatorKey

  const requestClose = useCallback(() => {
    if (saving || confirming) return
    if (hasUnsavedChanges && !window.confirm('編集中の内容が失われます。閉じますか？')) return
    onClose()
  }, [confirming, hasUnsavedChanges, onClose, saving])

  const abandonCrop = useCallback(() => {
    if (!cropReturnsToDetails) {
      requestClose()
      return
    }
    const provisionalSet = new Set(provisionalImageIds)
    const abandonedIds = new Set(cropQueue.slice(cropIndex).filter((id) => provisionalSet.has(id)))
    if (abandonedIds.size > 0) {
      setImages((prev) => prev.filter((image) => !abandonedIds.has(image.id)))
    }
    setCropQueue([])
    setCropIndex(0)
    setCropReturnsToDetails(false)
    setCropIntent('recrop')
    setProvisionalImageIds([])
    setPhase('details')
  }, [cropIndex, cropQueue, cropReturnsToDetails, provisionalImageIds, requestClose])

  function cancelCrop() {
    if (cropIndex > 0) {
      setCropIndex((index) => index - 1)
      return
    }
    abandonCrop()
  }

  useEffect(() => {
    if (!open) return undefined
    const handler = (event) => {
      if (event.key !== 'Escape' || saving || confirming) return
      if (phase === 'crop') abandonCrop()
      else requestClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [abandonCrop, confirming, open, phase, requestClose, saving])

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
  const cropTitle = cropIntent === 'cover-detail' ? 'カバー画像から切り出す' : '画像を調整'
  const cropConfirmLabel = cropIndex < cropQueue.length - 1
    ? '保存して次へ'
    : cropIntent === 'cover-detail'
      ? '追加する'
      : '保存して作品情報へ'

  function toggleCreator(creatorProfileId) {
    setSelectedCreatorIds((prev) => prev.includes(creatorProfileId) ? prev.filter((id) => id !== creatorProfileId) : [...prev, creatorProfileId])
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="artwork-create-title" className="ui-artwork-create-modal">
      <div className="ui-app-card ui-artwork-create-card">
        <div className="ui-artwork-create-header">
          <div>
            <div id="artwork-create-title" className="ui-screen-title" style={{ fontSize: 22, marginTop: 6 }}>{phase === 'crop' ? cropTitle : '作品を追加'}</div>
          </div>
          {phase === 'crop' && <div className="ui-artwork-crop-position" aria-live="polite">{cropIndex + 1} / {cropQueue.length}</div>}
          <button onClick={requestClose} disabled={saving || confirming} className="ui-modal-close" type="button">×</button>
        </div>

        {phase === 'crop' && cropImage ? (
          <div className="ui-artwork-create-crop-step">
            <ArtworkImageAdjuster
              key={`${cropImage.id}-${cropImage.sourceUrl}`}
              sourceUrl={cropImage.sourceUrl}
              sourceType={cropImage.file.type}
              confirmLabel={cropConfirmLabel}
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
              onDuplicateCoverRecrop={duplicateCoverAndRecrop}
              disabled={saving}
              limitError={limitError}
            />

            <div className="ui-artwork-create-fields">
              <div className="ui-artwork-create-form">
                <div className="ui-form-label">タイトル</div>
                <div className="ui-input-wrap"><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="作品名を入力" style={{ fontFamily: T.sans }} /></div>
                <div className="ui-form-label">作品説明</div>
                <div className="ui-input-wrap" data-multiline="true"><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="説明文を入力" rows={4} style={{ fontFamily: T.sans }} /></div>
                {showCreatorPicker && <CreatorPicker creatorOptions={creatorOptions} selectedCreatorIds={selectedCreatorIds} onToggleCreator={toggleCreator} />}
                {error && <div className="ui-alert ui-alert--error">{error}</div>}
              </div>
              <div className="ui-btn-row ui-artwork-create-actions">
                <button onClick={requestClose} disabled={saving} className="ui-btn ui-btn--ghost">閉じる</button>
                <button onClick={handleSave} disabled={!canSave} className="ui-btn ui-btn--accent">{saving ? '保存中…' : '保存する'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
