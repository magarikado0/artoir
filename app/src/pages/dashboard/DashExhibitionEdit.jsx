import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import DashShell, { DashField, DashSectionLabel } from '../../components/DashShell'
import LoadingFrames from '../../components/LoadingFrames'
import { useDelayedLoading } from '../../lib/useDelayedLoading'
import ImageUploader from '../../components/ImageUploader'
import ArtworkMedia from '../../components/ArtworkMedia'
import { T } from '../../lib/tokens'
import { useIsDesktop } from '../../lib/useIsDesktop'
import {
  getExhibitionPeriodText,
  getExhibitionThumbnailUrlFromRecord,
} from '../../lib/exhibition'
import { getThumbnailUrl } from '../../lib/imageUrl'
import { deleteExhibition } from '../../lib/deleteExhibition'

function slugifyAscii(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

function fallbackSlug() {
  return 'exh-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

async function generateUniqueSlug(orgId, title) {
  const base = slugifyAscii(title) || fallbackSlug()
  const { data, error } = await supabase
    .from('exhibitions')
    .select('slug')
    .eq('org_id', orgId)
    .like('slug', `${base}%`)
  if (error) throw error
  const existing = new Set((data || []).map((r) => r.slug))
  if (!existing.has(base)) return base
  let n = 2
  while (existing.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}

function fieldValue(value, fallback = '未設定') {
  return value || fallback
}

function ExhibitionSaveActions({ onCancel, onSave, saving, deleting }) {
  return (
    <div className="ui-settings-edit-actions">
      <button type="button" onClick={onCancel} disabled={saving} className="ui-settings-secondary-button">
        キャンセル
      </button>
      <button type="button" onClick={onSave} disabled={saving || deleting} className="ui-settings-primary-button">
        {saving ? '保存中...' : '保存'}
      </button>
    </div>
  )
}

function ExhibitionItem({ id, label, value, mono, editChildren, editSection, onBeginEdit }) {
  const editing = editSection === id
  return (
    <section className="ui-settings-item">
      <div className="ui-settings-item-head">
        <div className="ui-settings-item-label">{label}</div>
        {!editing && editChildren && (
          <button type="button" onClick={() => onBeginEdit(id)} className="ui-settings-edit-button">
            編集
          </button>
        )}
      </div>
      {editing ? editChildren : (
        <div className={`ui-settings-item-value ${mono ? 'is-mono' : ''}`}>{value}</div>
      )}
    </section>
  )
}

export default function DashExhibitionEdit() {
  const { orgSlug, exhibitionId } = useParams()
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const isNew = !exhibitionId || exhibitionId === 'undefined'

  const [org, setOrg] = useState(null)
  const [loading, setLoading] = useState(true)
  const showLoader = useDelayedLoading(loading)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [exhibition, setExhibition] = useState(null)
  const [editSection, setEditSection] = useState(null)

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState('')

  function onStartDateChange(next) {
    setStartDate(next)
    if (next && endDate && endDate < next) setEndDate(next)
  }

  function onEndDateChange(next) {
    if (next && startDate && next < startDate) {
      setEndDate(startDate)
      return
    }
    setEndDate(next)
  }

  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    async function load() {
      try {
        const { data: orgData } = await supabase.from('organizations').select('*').eq('slug', orgSlug).single()
        if (!orgData) return
        setOrg(orgData)
        if (!isNew && exhibitionId && exhibitionId !== 'undefined') {
          const { data: exh } = await supabase.from('exhibitions').select('*').eq('id', exhibitionId).single()
          if (exh) {
            setExhibition(exh)
            setTitle(exh.title || '')
            setSlug(exh.slug || '')
            const s = exh.start_date || ''
            let e = exh.end_date || ''
            if (s && e && e < s) e = s
            setStartDate(s)
            setStartTime(exh.start_time || '')
            setEndDate(e)
            setEndTime(exh.end_time || '')
            setLocation(exh.location || '')
            setDescription(exh.description || '')
            setThumbnailUrl(getExhibitionThumbnailUrlFromRecord(exh))
          }
        }
      } catch { /* unavailable */ } finally { setLoading(false) }
    }
    load()
  }, [orgSlug, exhibitionId, isNew])

  async function handleSave() {
    if (!supabase || !org) return
    if (!isNew && (!exhibitionId || exhibitionId === 'undefined')) return
    if (startDate && endDate && endDate < startDate) {
      window.alert('終了日は開始日以降である必要があります。')
      return
    }
    setSaving(true)
    let nextPath = null
    try {
      const finalSlug = (isNew || !slug) ? await generateUniqueSlug(org.id, title) : slug
      const payload = {
        title,
        slug: finalSlug,
        start_date: startDate || null,
        start_time: startTime || null,
        end_date: endDate || null,
        end_time: endTime || null,
        location,
        description,
        thumbnail_url: thumbnailUrl || null,
        org_id: org.id,
      }
      if (isNew) {
        const { data, error } = await supabase.from('exhibitions').insert(payload).select().single()
        if (error) {
          window.alert(error.message ? `保存に失敗しました: ${error.message}` : '保存に失敗しました。入力内容や接続状況をご確認ください。')
          return
        }
        if (data) {
          setSlug(data.slug)
          nextPath = `/${orgSlug}/dashboard/exhibitions/${data.id}/edit`
        }
      } else {
        const { error } = await supabase.from('exhibitions').update(payload).eq('id', exhibitionId)
        if (error) {
          window.alert(error.message ? `保存に失敗しました: ${error.message}` : '保存に失敗しました。入力内容や接続状況をご確認ください。')
          return
        }
        setSlug(finalSlug)
        setExhibition((prev) => prev ? { ...prev, ...payload } : payload)
        setEditSection(null)
      }
    } catch (error) {
      window.alert(error?.message ? `保存に失敗しました: ${error.message}` : '保存に失敗しました。入力内容や接続状況をご確認ください。')
    } finally {
      setSaving(false)
    }

    if (nextPath) navigate(nextPath)
  }

  function resetFieldsFromExhibition() {
    if (!exhibition) return
    setTitle(exhibition.title || '')
    setSlug(exhibition.slug || '')
    const s = exhibition.start_date || ''
    let e = exhibition.end_date || ''
    if (s && e && e < s) e = s
    setStartDate(s)
    setStartTime(exhibition.start_time || '')
    setEndDate(e)
    setEndTime(exhibition.end_time || '')
    setLocation(exhibition.location || '')
    setDescription(exhibition.description || '')
    setThumbnailUrl(getExhibitionThumbnailUrlFromRecord(exhibition))
  }

  function handleCancelEdit() {
    resetFieldsFromExhibition()
    setEditSection(null)
  }

  function beginEditSection(id) {
    resetFieldsFromExhibition()
    setEditSection(id)
  }

  async function handleDeleteExhibition() {
    if (!supabase || isNew || !exhibitionId || exhibitionId === 'undefined') return
    setDeleting(true)
    try {
      const { error } = await deleteExhibition(supabase, exhibitionId)
      if (error) {
        window.alert(error.message ? `削除に失敗しました: ${error.message}` : '削除に失敗しました。')
        return
      }
      navigate(`/${orgSlug}/dashboard`, { replace: true })
    } catch (error) {
      window.alert(error?.message ? `削除に失敗しました: ${error.message}` : '削除に失敗しました。')
    } finally {
      setDeleting(false)
      setDeleteConfirm(false)
    }
  }

  if (showLoader) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.paper }}>
      <LoadingFrames />
    </div>
  )

  const savedPublicUrl = `artoir.net/${orgSlug}/exhibition/${exhibition?.slug || '(未保存)'}`
  const savedPeriodText = getExhibitionPeriodText(exhibition)
  const savedThumbnailUrl = getExhibitionThumbnailUrlFromRecord(exhibition)

  const formContent = (
    <div style={{ padding: isDesktop ? '28px 0' : '16px 16px' }}>
      <DashSectionLabel>基本情報</DashSectionLabel>
      <DashField label="タイトル" value={title} onChange={setTitle} placeholder="" />
      <DashField
        label="URL"
        prefix={`artoir.net/${orgSlug}/exhibition/`}
        value={isNew ? (slugifyAscii(title) || '(自動採番)') : slug}
        readOnly
        mono
        rightHint="保存時に自動生成"
        help="タイトルから自動生成されます。同じ名前の展覧会が既にある場合は連番（-2, -3 ...）が付きます。"
      />

      <DashSectionLabel>会期・会場</DashSectionLabel>
      <div className="ui-exhibition-date-grid">
        <DashField label="START" value={startDate} onChange={onStartDateChange} placeholder="YYYY-MM-DD" mono type="date" />
        <DashField label="START TIME" value={startTime} onChange={setStartTime} placeholder="--:--" mono type="time" />
        <DashField label="END" value={endDate} onChange={onEndDateChange} placeholder="YYYY-MM-DD" mono type="date" min={startDate || undefined} />
        <DashField label="END TIME" value={endTime} onChange={setEndTime} placeholder="--:--" mono type="time" />
      </div>
      <DashField label="会場" value={location} onChange={setLocation} placeholder="美術館、ギャラリー名等" />

      <DashSectionLabel>説明文</DashSectionLabel>
      <DashField
        label="説明文"
        value={description}
        onChange={setDescription}
        multiline
        placeholder="展覧会の説明文を入力..."
        help="公開ページのヒーロー下に表示されます（最大 400 文字）。"
      />

      <DashSectionLabel>サムネイル</DashSectionLabel>
      <div style={{ display: 'grid', gap: 10 }}>
        {thumbnailUrl ? (
          <div style={{ display: 'grid', gap: 8 }}>
            <ArtworkMedia
              src={getThumbnailUrl(thumbnailUrl, 220)}
              alt={title || '展覧会サムネイル'}
              label={title || '展覧会サムネイル'}
              loading="eager"
              fit="contain"
              aspectRatio="1 / 1"
              wrapperStyle={{ width: 'min(220px, 100%)', borderRadius: 7 }}
              imageStyle={{ borderRadius: 7 }}
            />
            <button type="button" onClick={() => setThumbnailUrl('')} className="ui-icon-button" style={{ width: 'fit-content', padding: '10px 14px', background: 'transparent', color: T.ink, border: `1px solid ${T.ink}`, fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em', cursor: 'pointer' }}>
              サムネイルを削除
            </button>
          </div>
        ) : (
          <>
            <div className="ui-field-help">公開ページと一覧の先頭で使う画像です。設定しない場合は作品画像の先頭を使います。</div>
            <ImageUploader compressMaxDimension={1200} onUploaded={(url) => setThumbnailUrl(url)}>
              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ fontFamily: T.serif, fontSize: 14, color: T.ink }}>画像をアップロード</div>
                <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.08em', color: T.inkMuted }}>クリックまたはドラッグ&ドロップ</div>
              </div>
            </ImageUploader>
          </>
        )}
      </div>

      <div style={{ marginTop: 28, display: 'flex', gap: 8 }}>
        {!isNew && (
          <button type="button" onClick={() => exhibitionId && exhibitionId !== 'undefined' && navigate(`/${orgSlug}/dashboard/exhibitions/${exhibitionId}/artworks`)} className="ui-icon-button" style={{ padding: '14px 18px', background: 'transparent', color: T.ink, border: `1px solid ${T.ink}`, fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em', cursor: 'pointer' }}>
            作品を管理 →
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || deleting}
          className="ui-action"
          style={{ flex: 1, padding: '14px', background: T.accent, color: T.paper, border: `1px solid ${T.paper}`, fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em', cursor: 'pointer', opacity: saving || deleting ? 0.6 : 1 }}
        >{saving ? 'SAVING...' : 'SAVE ↩'}</button>
      </div>

      {!isNew && (
        <div style={{ marginTop: 36, paddingTop: 24, borderTop: `1px solid ${T.ink}` }}>
          <p style={{ margin: '0 0 14px', fontSize: 12, color: T.inkSoft, lineHeight: 1.7 }}>
            この展覧会と登録済みの作品をすべて削除します。公開 URL は無効になります。
          </p>
          {deleteConfirm ? (
            <div className="ui-app-card" style={{ padding: 14, borderColor: T.accent }}>
              <div className="ui-kicker">CONFIRM DELETE</div>
              <div style={{ marginTop: 8, fontSize: 13 }}>「{exhibition?.title || '（タイトルなし）'}」を削除します。</div>
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => setDeleteConfirm(false)} disabled={deleting} className="ui-pill-action" style={{ flex: 1, background: T.paperAlt, color: T.ink }}>CANCEL</button>
                <button type="button" onClick={handleDeleteExhibition} disabled={deleting} className="ui-pill-action" style={{ flex: 1, background: T.accent, opacity: deleting ? 0.6 : 1 }}>{deleting ? 'DELETING...' : 'DELETE'}</button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setDeleteConfirm(true)}
              className="ui-icon-button"
              style={{ padding: '12px 16px', background: 'transparent', color: T.accent, border: `1px solid ${T.accent}`, fontFamily: T.mono, fontSize: 11, letterSpacing: '0.12em', cursor: 'pointer' }}
            >
              展覧会を削除
            </button>
          )}
        </div>
      )}

      <div style={{ height: 40 }} />
    </div>
  )

  const existingContent = (
    <div className="ui-settings-page">
      <div className="ui-dashboard-list-head" style={{ marginBottom: 12 }}>
        <div className="ui-dashboard-list-head-copy">
          <div className="ui-dashboard-list-count">{exhibition?.title || '展覧会情報'}</div>
        </div>
        <button
          type="button"
          onClick={() => exhibitionId && exhibitionId !== 'undefined' && navigate(`/${orgSlug}/dashboard/exhibitions/${exhibitionId}/artworks`)}
          className="ui-pill-action"
        >
          作品を管理
        </button>
      </div>

      <ExhibitionItem
        editSection={editSection}
        onBeginEdit={beginEditSection}
        id="title"
        label="タイトル"
        value={fieldValue(exhibition?.title)}
        editChildren={(
          <>
            <DashField label="タイトル" value={title} onChange={setTitle} placeholder="例: 静かな気配" />
            <ExhibitionSaveActions onCancel={handleCancelEdit} onSave={handleSave} saving={saving} deleting={deleting} />
          </>
        )}
      />

      <ExhibitionItem
        editSection={editSection}
        onBeginEdit={beginEditSection}
        id="period"
        label="会期"
        value={savedPeriodText}
        mono
        editChildren={(
          <>
            <div className="ui-exhibition-date-grid">
              <DashField label="START" value={startDate} onChange={onStartDateChange} placeholder="YYYY-MM-DD" mono type="date" />
              <DashField label="START TIME" value={startTime} onChange={setStartTime} placeholder="--:--" mono type="time" />
              <DashField label="END" value={endDate} onChange={onEndDateChange} placeholder="YYYY-MM-DD" mono type="date" min={startDate || undefined} />
              <DashField label="END TIME" value={endTime} onChange={setEndTime} placeholder="--:--" mono type="time" />
            </div>
            <ExhibitionSaveActions onCancel={handleCancelEdit} onSave={handleSave} saving={saving} deleting={deleting} />
          </>
        )}
      />

      <ExhibitionItem
        editSection={editSection}
        onBeginEdit={beginEditSection}
        id="location"
        label="会場"
        value={fieldValue(exhibition?.location)}
        editChildren={(
          <>
            <DashField label="会場" value={location} onChange={setLocation} placeholder="例: 東京都・表参道 GALLERY 360°" />
            <ExhibitionSaveActions onCancel={handleCancelEdit} onSave={handleSave} saving={saving} deleting={deleting} />
          </>
        )}
      />

      <ExhibitionItem
        editSection={editSection}
        onBeginEdit={beginEditSection}
        id="description"
        label="説明文"
        value={fieldValue(exhibition?.description)}
        editChildren={(
          <>
            <DashField
              label="説明文"
              value={description}
              onChange={setDescription}
              multiline
              placeholder="展覧会の説明文を入力..."
            />
            <ExhibitionSaveActions onCancel={handleCancelEdit} onSave={handleSave} saving={saving} deleting={deleting} />
          </>
        )}
      />

      <ExhibitionItem
        editSection={editSection}
        onBeginEdit={beginEditSection}
        id="thumbnail"
        label="サムネイル"
        value={savedThumbnailUrl ? (
          <ArtworkMedia
            src={getThumbnailUrl(savedThumbnailUrl, 220)}
            alt={exhibition?.title || '展覧会サムネイル'}
            label={exhibition?.title || '展覧会サムネイル'}
            loading="eager"
            fit="contain"
            aspectRatio="1 / 1"
            wrapperStyle={{ width: 'min(180px, 100%)', borderRadius: 7 }}
            imageStyle={{ borderRadius: 7 }}
          />
        ) : '未設定'}
        editChildren={(
          <div style={{ display: 'grid', gap: 10 }}>
            {thumbnailUrl ? (
              <>
                <ArtworkMedia
                  src={getThumbnailUrl(thumbnailUrl, 220)}
                  alt={title || '展覧会サムネイル'}
                  label={title || '展覧会サムネイル'}
                  loading="eager"
                  fit="contain"
                  aspectRatio="1 / 1"
                  wrapperStyle={{ width: 'min(220px, 100%)', borderRadius: 7 }}
                  imageStyle={{ borderRadius: 7 }}
                />
                <button type="button" onClick={() => setThumbnailUrl('')} className="ui-settings-secondary-button" style={{ width: 'fit-content' }}>
                  サムネイルを削除
                </button>
              </>
            ) : (
              <>
                <div className="ui-field-help">公開ページと一覧の先頭で使う画像です。設定しない場合は作品画像の先頭を使います。</div>
                <ImageUploader compressMaxDimension={1200} onUploaded={(url) => setThumbnailUrl(url)}>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <div style={{ fontFamily: T.serif, fontSize: 14, color: T.ink }}>画像をアップロード</div>
                    <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.08em', color: T.inkMuted }}>クリックまたはドラッグ&ドロップ</div>
                  </div>
                </ImageUploader>
              </>
            )}
            <ExhibitionSaveActions onCancel={handleCancelEdit} onSave={handleSave} saving={saving} deleting={deleting} />
          </div>
        )}
      />

      <ExhibitionItem id="url" label="公開URL" value={savedPublicUrl} mono />

      <section className="ui-settings-section is-danger">
        <div className="ui-settings-section-head">
        </div>
        <p className="ui-settings-danger-copy">
          この展覧会と登録済みの作品をすべて削除します。公開 URL は無効になります。
        </p>
        {deleteConfirm ? (
          <div className="ui-app-card" style={{ padding: 14, borderColor: T.accent }}>
            <div className="ui-kicker">CONFIRM DELETE</div>
            <div style={{ marginTop: 8, fontSize: 13 }}>「{exhibition?.title || '（タイトルなし）'}」を削除します。</div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setDeleteConfirm(false)} disabled={deleting} className="ui-pill-action" style={{ flex: 1, background: T.paperAlt, color: T.ink }}>キャンセル</button>
              <button type="button" onClick={handleDeleteExhibition} disabled={deleting} className="ui-pill-action" style={{ flex: 1, background: T.accent, opacity: deleting ? 0.6 : 1 }}>{deleting ? '削除中...' : '削除する'}</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setDeleteConfirm(true)} className="ui-settings-danger-button">
            展覧会を削除
          </button>
        )}
      </section>
    </div>
  )

  if (isDesktop) return (
    <DashShell orgSlug={orgSlug}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        {isNew ? (
          <>
            <div className="ui-hero-screen-heading" style={{ marginBottom: 14 }}>
              <h1 className="ui-screen-title" style={{ marginTop: 8 }}>新しい展覧会</h1>
              <p className="ui-screen-subtitle">基本情報を入れると、公開ページが作成されます。</p>
            </div>
            {formContent}
          </>
        ) : existingContent}
      </div>
    </DashShell>
  )

  return (
    <DashShell orgSlug={orgSlug}>
      {isNew ? (
        <>
          <div className="ui-hero-screen-heading" style={{ marginBottom: 14 }}>
            <h1 className="ui-screen-title" style={{ marginTop: 6 }}>新しい展覧会</h1>
            <p className="ui-screen-subtitle">下の項目を入力すると、公開ページが作成されます。</p>
          </div>
          {formContent}
        </>
      ) : existingContent}
    </DashShell>
  )
}
