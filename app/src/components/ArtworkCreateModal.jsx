import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getArtworkUploadConfigError, isMissingImageDimensionColumnError, omitImageDimensionFields, uploadArtworkImage } from '../lib/artworkUpload'
import { compressImageFile } from '../lib/imageCompress'
import { filesToArtworkImages } from '../lib/artworkImages'
import { T } from '../lib/tokens'
import ArtworkImageField from './ArtworkImageField'

function CreatorPicker({ creatorOptions, selectedCreatorIds, onToggleCreator }) {
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
    </div>
  )
}

export default function ArtworkCreateModal({ open, file, files, exhibitionId, profileId, nextOrder, creatorOptions = [], defaultCreatorIds = [], showCreatorPicker = true, onClose, onCreated }) {
  const defaultCreatorKey = defaultCreatorIds.join('|')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedCreatorIds, setSelectedCreatorIds] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [images, setImages] = useState([])
  const [coverId, setCoverId] = useState('')

  useEffect(() => {
    if (!open) {
      setTitle('')
      setDescription('')
      setSelectedCreatorIds([])
      setSaving(false)
      setError('')
      setImages([])
      setCoverId('')
      return undefined
    }
    const initial = filesToArtworkImages(files || (file ? [file] : []))
    setSelectedCreatorIds(defaultCreatorKey ? defaultCreatorKey.split('|') : [])
    setImages(initial)
    setCoverId(initial[0]?.id || '')
    return () => initial.forEach((image) => URL.revokeObjectURL(image.previewUrl))
  }, [open, file, files, defaultCreatorKey])

  useEffect(() => {
    if (!open) return undefined
    const handler = (e) => { if (e.key === 'Escape' && !saving) onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose, saving])

  async function handleSave() {
    if (!open || images.length === 0 || !coverId || saving) return
    if (!supabase) {
      setError('Supabase が未設定です')
      return
    }
    const configError = getArtworkUploadConfigError()
    if (configError) {
      setError(configError)
      return
    }

    setSaving(true)
    setError('')

    try {
      const uploadedImages = []
      for (const image of images) {
        setImages((prev) => prev.map((item) => item.id === image.id ? { ...item, progress: 0, error: '' } : item))
        try {
          const compressed = await compressImageFile(image.file, { maxDimension: 1920 })
          const baseName = image.file.name?.replace(/\.[^.]+$/, '') || 'artwork'
          const uploadName = `${baseName}.${compressed.type === 'image/png' ? 'png' : 'jpg'}`
          const uploaded = await uploadArtworkImage(compressed, uploadName, (progress) => {
            setImages((prev) => prev.map((item) => item.id === image.id ? { ...item, progress } : item))
          })
          uploadedImages.push({ ...uploaded, clientId: image.id, file: image.file, type: image.type || null, caption: image.caption || null, fileSize: compressed.size })
          setImages((prev) => prev.map((item) => item.id === image.id ? { ...item, progress: null } : item))
        } catch (uploadError) {
          setImages((prev) => prev.map((item) => item.id === image.id ? { ...item, progress: null, error: uploadError?.message || 'upload failed' } : item))
          throw uploadError
        }
      }
      const cover = uploadedImages.find((image) => image.clientId === coverId) || uploadedImages[0]

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
        // 寸法カラム未適用の DB 向けフォールバック（docs/sql/add-artwork-image-dimensions.sql 適用後に削除可）。
        ;({ data: newWork, error: insertError } = await supabase.from('artworks').insert(omitImageDimensionFields(payload)).select().single())
      }
      if (insertError) throw insertError

      const imagePayload = uploadedImages.map((image, index) => ({
        artwork_id: newWork.id,
        url: image.url,
        order: index + 1,
        type: image.type,
        caption: image.caption,
        width: image.width,
        height: image.height,
        file_name: image.file.name,
        file_size: image.fileSize,
      }))
      const { data: imageRows, error: imageError } = await supabase.from('artwork_images').insert(imagePayload).select()
      if (imageError) {
        await supabase.from('artworks').delete().eq('id', newWork.id)
        throw imageError
      }
      const coverIndex = uploadedImages.findIndex((image) => image.clientId === coverId)
      const coverImage = imageRows?.[coverIndex >= 0 ? coverIndex : 0]
      if (coverImage?.id) {
        const { error: coverError } = await supabase.from('artworks').update({ cover_image_id: coverImage.id }).eq('id', newWork.id)
        if (coverError) throw coverError
        newWork.cover_image_id = coverImage.id
      }
      newWork.artwork_images = imageRows || []

      const creatorRows = selectedCreatorIds.map((profileId, index) => ({
        artwork_id: newWork.id,
        profile_id: profileId,
        display_order: index,
      }))
      if (creatorRows.length > 0) {
        const { error: creatorError } = await supabase.from('artwork_creators').insert(creatorRows)
        if (creatorError) throw creatorError
      }

      const creators = selectedCreatorIds.map((profileId, index) => ({
        profile_id: profileId,
        display_order: index,
        profile: creatorOptions.find((profile) => profile.id === profileId),
      })).filter((creator) => creator.profile)

      onCreated?.({ ...newWork, creators })
      onClose()
    } catch (err) {
      setError(err?.message || '作品の作成に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const canSave = images.length > 0 && images.length <= 5 && Boolean(coverId) && !saving && images.every((image) => !image.error)

  function toggleCreator(profileId) {
    setSelectedCreatorIds((prev) => (
      prev.includes(profileId)
        ? prev.filter((id) => id !== profileId)
        : [...prev, profileId]
    ))
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="artwork-create-title" className="ui-artwork-create-modal">
      <div className="ui-app-card ui-artwork-create-card">
        <div style={{ padding: '18px 20px 16px', borderBottom: `1px solid ${T.lineSoft}`, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <div>
            <div className="ui-kicker">作品</div>
            <div id="artwork-create-title" className="ui-screen-title" style={{ fontSize: 22, marginTop: 6 }}>作品を追加</div>
          </div>
          <button onClick={onClose} disabled={saving} className="ui-modal-close" type="button">
            ×
          </button>
        </div>

        <div className="ui-artwork-create-layout">
            <>
              <ArtworkImageField images={images} coverId={coverId} onChange={setImages} onCoverChange={setCoverId} disabled={saving} />
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

                {showCreatorPicker && (
                  <CreatorPicker
                    creatorOptions={creatorOptions}
                    selectedCreatorIds={selectedCreatorIds}
                    onToggleCreator={toggleCreator}
                  />
                )}

                {error && <div className="ui-alert ui-alert--error">{error}</div>}

                <div className="ui-btn-row ui-artwork-create-actions" style={{ marginTop: 'auto' }}>
                  <button onClick={onClose} disabled={saving} className="ui-btn ui-btn--ghost">閉じる</button>
                  <button onClick={handleSave} disabled={!canSave} className="ui-btn ui-btn--accent">{saving ? '保存中…' : '保存する'}</button>
                </div>
              </div>
            </>
        </div>
      </div>
    </div>
  )
}
