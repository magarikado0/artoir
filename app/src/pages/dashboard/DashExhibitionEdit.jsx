import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import DashShell, { DashField, DashSectionLabel } from '../../components/DashShell'
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
import { legacyProfileSlugFromOwnerSlug, profilePath } from '../../lib/profileRoutes'

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

async function generateUniqueSlug(ownerColumn, ownerId, title) {
  const base = slugifyAscii(title) || fallbackSlug()
  const { data, error } = await supabase
    .from('exhibitions')
    .select('slug')
    .eq(ownerColumn, ownerId)
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
  const { orgSlug: routeOrgSlug, profileSlug: routeProfileSlug, exhibitionId } = useParams()
  const navigate = useNavigate()
  const { session } = useAuth()
  const isDesktop = useIsDesktop()
  const isNew = !exhibitionId || exhibitionId === 'undefined'
  const profileSlug = routeProfileSlug || legacyProfileSlugFromOwnerSlug(routeOrgSlug)
  const orgSlug = profileSlug ? undefined : routeOrgSlug

  const [owner, setOwner] = useState(null)
  const [forbidden, setForbidden] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [loading, setLoading] = useState(true)
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
        const ownerQuery = profileSlug
          ? supabase.from('profiles').select('*').eq('slug', profileSlug).maybeSingle()
          : supabase.from('organizations').select('*').eq('slug', orgSlug).maybeSingle()
        const { data: ownerData, error: ownerError } = await ownerQuery
        if (ownerError) {
          setLoadError(ownerError.message || '管理対象の読み込みに失敗しました。')
          return
        }
        if (!ownerData) {
          setLoadError(profileSlug ? 'プロフィールが見つかりません。' : '団体が見つかりません。')
          return
        }
        if (profileSlug && ownerData.id !== session?.user?.id) {
          setForbidden(true)
          return
        }
        setOwner(ownerData)
        if (!isNew && exhibitionId && exhibitionId !== 'undefined') {
          const { data: exh, error: exhError } = await supabase.from('exhibitions').select('*').eq('id', exhibitionId).maybeSingle()
          if (exhError) {
            setLoadError(exhError.message || '展覧会の読み込みに失敗しました。')
            return
          }
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
      } catch (error) {
        setLoadError(error?.message || '読み込みに失敗しました。')
      } finally { setLoading(false) }
    }
    load()
  }, [orgSlug, profileSlug, exhibitionId, isNew, session])

  async function handleSave() {
    setSaveError('')
    if (!supabase) {
      setSaveError('Supabase が未設定です。')
      return
    }
    if (!owner) {
      setSaveError(loadError || '管理対象を読み込めていないため保存できません。')
      return
    }
    if (!isNew && (!exhibitionId || exhibitionId === 'undefined')) {
      setSaveError('展覧会IDが不正です。')
      return
    }
    if (startDate && endDate && endDate < startDate) {
      window.alert('終了日は開始日以降である必要があります。')
      return
    }
    setSaving(true)
    let nextPath = null
    const ownerColumn = profileSlug ? 'profile_id' : 'organization_id'
    const dashboardBase = profileSlug ? profilePath(profileSlug) : `/${orgSlug}`
    try {
      const finalSlug = (isNew || !slug) ? await generateUniqueSlug(ownerColumn, owner.id, title) : slug
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
        organization_id: profileSlug ? null : owner.id,
        profile_id: profileSlug ? owner.id : null,
      }
      if (isNew) {
        const { data, error } = await supabase.from('exhibitions').insert(payload).select().single()
        if (error) {
          setSaveError(error.message || '保存に失敗しました。入力内容や接続状況をご確認ください。')
          return
        }
        if (data) {
          setSlug(data.slug)
          nextPath = `${dashboardBase}/dashboard/exhibitions/${data.id}/edit`
        }
      } else {
        const { error } = await supabase.from('exhibitions').update(payload).eq('id', exhibitionId)
        if (error) {
          setSaveError(error.message || '保存に失敗しました。入力内容や接続状況をご確認ください。')
          return
        }
        setSlug(finalSlug)
        setExhibition((prev) => prev ? { ...prev, ...payload } : payload)
        setEditSection(null)
      }
    } catch (error) {
      setSaveError(error?.message || '保存に失敗しました。入力内容や接続状況をご確認ください。')
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
      navigate(`${profileSlug ? profilePath(profileSlug) : `/${orgSlug}`}/dashboard`, { replace: true })
    } catch (error) {
      window.alert(error?.message ? `削除に失敗しました: ${error.message}` : '削除に失敗しました。')
    } finally {
      setDeleting(false)
      setDeleteConfirm(false)
    }
  }

  if (loading) return (
    <DashShell orgSlug={orgSlug} profileSlug={profileSlug} />
  )

  if (forbidden) return (
    <div className="ui-page-shell" style={{ display: 'grid', placeItems: 'center' }}>
      <p style={{ color: T.inkMuted, fontSize: 14 }}>このプロフィールの展示は管理できません</p>
    </div>
  )

  if (loadError && !owner) return (
    <DashShell orgSlug={orgSlug} profileSlug={profileSlug}>
      <div className="ui-alert ui-alert--error">
        <div className="ui-kicker">読み込みエラー</div>
        <div className="ui-confirm-msg">{loadError}</div>
      </div>
    </DashShell>
  )

  const dashboardBase = profileSlug ? profilePath(profileSlug) : `/${orgSlug}`
  const publicBase = profileSlug ? `artoir.net/profile/${profileSlug}` : `artoir.net/${orgSlug}`
  const savedPublicUrl = `${publicBase}/exhibition/${exhibition?.slug || '(未保存)'}`
  const savedPeriodText = getExhibitionPeriodText(exhibition)
  const savedThumbnailUrl = getExhibitionThumbnailUrlFromRecord(exhibition)

  const formContent = (
    <div style={{ padding: isDesktop ? '28px 0' : '16px 16px' }}>
      <DashSectionLabel>基本情報</DashSectionLabel>
      {saveError && (
        <div className="ui-alert ui-alert--error" style={{ marginBottom: 16 }}>
          {saveError}
        </div>
      )}
      <DashField label="タイトル" value={title} onChange={setTitle} placeholder="例: 静かな気配" />
      <DashField
        label="URL"
        prefix={`${publicBase}/exhibition/`}
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
      <div style={{ display: 'grid', gap: 12 }}>
        {thumbnailUrl ? (
          <div style={{ display: 'grid', gap: 10 }}>
            <ArtworkMedia
              src={getThumbnailUrl(thumbnailUrl, 220)}
              alt={title || '展覧会サムネイル'}
              label={title || '展覧会サムネイル'}
              loading="eager"
              fit="contain"
              aspectRatio="1 / 1"
              wrapperStyle={{ width: 'min(220px, 100%)', borderRadius: 6 }}
              imageStyle={{ borderRadius: 6 }}
            />
            <button type="button" onClick={() => setThumbnailUrl('')} className="ui-btn ui-btn--ghost" style={{ width: 'fit-content' }}>
              サムネイルを削除
            </button>
          </div>
        ) : (
          <>
            <div className="ui-field-help">公開ページと一覧の先頭で使う画像です。設定しない場合は作品画像の先頭を使います。</div>
            <ImageUploader compressMaxDimension={1200} onUploaded={(url) => setThumbnailUrl(url)}>
              <div style={{ display: 'grid', gap: 4 }}>
                <div style={{ fontSize: 14, color: T.ink }}>画像をアップロード</div>
                <div style={{ fontSize: 12, color: T.inkMuted }}>クリックまたはドラッグ&ドロップ</div>
              </div>
            </ImageUploader>
          </>
        )}
      </div>

      <div className="ui-btn-row" style={{ marginTop: 32 }}>
        {!isNew && (
          <button type="button" onClick={() => exhibitionId && exhibitionId !== 'undefined' && navigate(`${dashboardBase}/dashboard/exhibitions/${exhibitionId}/artworks`)} className="ui-btn ui-btn--ghost">
            作品を管理 →
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || deleting}
          className="ui-btn ui-btn--accent"
          style={{ flex: 1 }}
        >{saving ? '保存中…' : '保存'}</button>
      </div>

      {!isNew && (
        <div style={{ marginTop: 40, paddingTop: 28, borderTop: '1px solid #E4DDD2' }}>
          <DashSectionLabel>危険な操作</DashSectionLabel>
          <p className="ui-settings-danger-copy">
            この展覧会と登録済みの作品をすべて削除します。公開 URL は無効になります。
          </p>
          {deleteConfirm ? (
            <div className="ui-confirm">
              <div className="ui-kicker">削除の確認</div>
              <div className="ui-confirm-msg">{exhibition?.title?.trim() ? `「${exhibition.title}」を削除します。` : 'この展覧会を削除します。'}</div>
              <div className="ui-btn-row" style={{ marginTop: 16 }}>
                <button type="button" onClick={() => setDeleteConfirm(false)} disabled={deleting} className="ui-btn ui-btn--ghost">キャンセル</button>
                <button type="button" onClick={handleDeleteExhibition} disabled={deleting} className="ui-btn ui-btn--danger">{deleting ? '削除中…' : '削除する'}</button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setDeleteConfirm(true)}
              className="ui-btn ui-btn--danger"
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
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => exhibitionId && exhibitionId !== 'undefined' && navigate(`${dashboardBase}/dashboard/exhibitions/${exhibitionId}/artworks`)}
            className="ui-pill-action"
          >
            作品を管理
          </button>
        </div>
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
                <div className="ui-settings-edit-actions" style={{ justifyContent: 'flex-start' }}>
                  <ImageUploader
                    compressMaxDimension={1200}
                    onUploaded={(url) => setThumbnailUrl(url)}
                    variant="button"
                    buttonLabel="サムネイル画像を変更"
                  >
                    画像を変更
                  </ImageUploader>
                  <button type="button" onClick={() => setThumbnailUrl('')} className="ui-settings-secondary-button">
                    削除
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="ui-field-help">公開ページと一覧の先頭で使う画像です。設定しない場合は作品画像の先頭を使います。</div>
                <ImageUploader compressMaxDimension={1200} onUploaded={(url) => setThumbnailUrl(url)}>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <div style={{ fontFamily: T.serif, fontSize: 14, color: T.ink }}>画像をアップロード</div>
                    <div style={{ fontSize: 12, color: T.inkMuted }}>クリックまたはドラッグ&ドロップ</div>
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
          <div className="ui-confirm">
            <div className="ui-kicker">削除の確認</div>
            <div className="ui-confirm-msg">{exhibition?.title?.trim() ? `「${exhibition.title}」を削除します。` : 'この展覧会を削除します。'}</div>
            <div className="ui-btn-row" style={{ marginTop: 16 }}>
              <button type="button" onClick={() => setDeleteConfirm(false)} disabled={deleting} className="ui-btn ui-btn--ghost">キャンセル</button>
              <button type="button" onClick={handleDeleteExhibition} disabled={deleting} className="ui-btn ui-btn--danger">{deleting ? '削除中…' : '削除する'}</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setDeleteConfirm(true)} className="ui-btn ui-btn--danger">
            展覧会を削除
          </button>
        )}
      </section>
    </div>
  )

  if (isDesktop) return (
    <DashShell orgSlug={orgSlug} profileSlug={profileSlug}>
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
    <DashShell orgSlug={orgSlug} profileSlug={profileSlug}>
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
