import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getArtworkUploadConfigError, uploadArtworkImage } from '../lib/artworkUpload'
import { T } from '../lib/tokens'
import ArtworkImageAdjuster from './ArtworkImageAdjuster'

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

export default function ArtworkCreateModal({ open, file, exhibitionId, nextOrder, creatorOptions = [], defaultCreatorIds = [], showCreatorPicker = true, onClose, onCreated }) {
  const [step, setStep] = useState('crop')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedCreatorIds, setSelectedCreatorIds] = useState([])
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [confirmedBlob, setConfirmedBlob] = useState(null)
  const [confirmedPreviewUrl, setConfirmedPreviewUrl] = useState('')
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (!open || !file) {
      setStep('crop')
      setTitle('')
      setDescription('')
      setSelectedCreatorIds([])
      setSaving(false)
      setProgress(null)
      setError('')
      setPreviewUrl('')
      setConfirmedBlob(null)
      setConfirmedPreviewUrl('')
      setConfirming(false)
      return undefined
    }

    const url = URL.createObjectURL(file)
    setSelectedCreatorIds(defaultCreatorIds)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [open, file, defaultCreatorIds])

  useEffect(() => {
    if (!confirmedPreviewUrl) return undefined
    return () => URL.revokeObjectURL(confirmedPreviewUrl)
  }, [confirmedPreviewUrl])

  useEffect(() => {
    if (!open) return undefined
    const handler = (e) => { if (e.key === 'Escape' && !saving && !confirming) onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [confirming, open, onClose, saving])

  async function handleSave() {
    if (!open || !file || !confirmedBlob || saving) return
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
    setProgress(0)

    try {
      const croppedName = file.name?.replace(/\.[^.]+$/, '') || 'artwork'
      const uploadName = `${croppedName}-crop.${confirmedBlob.type === 'image/png' ? 'png' : 'jpg'}`
      const imageUrl = await uploadArtworkImage(confirmedBlob, uploadName, setProgress)

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
      setProgress(null)
    }
  }

  if (!open || !file) return null

  const canSave = Boolean(confirmedBlob) && !saving

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
          <button onClick={onClose} disabled={saving || confirming} className="ui-modal-close" type="button">
            ×
          </button>
        </div>

        <div className={`ui-artwork-create-layout ${step === 'crop' ? 'is-crop-step' : ''}`}>
          {step === 'crop' ? (
            <ArtworkImageAdjuster
              sourceUrl={previewUrl}
              sourceType={file.type}
              confirmLabel="画像を確定"
              confirmingLabel="確定中…"
              onBusyChange={setConfirming}
              onConfirm={(croppedBlob) => {
                setConfirmedBlob(croppedBlob)
                setConfirmedPreviewUrl(URL.createObjectURL(croppedBlob))
                setStep('details')
              }}
              secondaryAction={
                <button onClick={onClose} disabled={confirming} className="ui-btn ui-btn--ghost">閉じる</button>
              }
            />
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

                {showCreatorPicker && (
                  <CreatorPicker
                    creatorOptions={creatorOptions}
                    selectedCreatorIds={selectedCreatorIds}
                    onToggleCreator={toggleCreator}
                  />
                )}

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
