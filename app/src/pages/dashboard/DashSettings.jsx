import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import DashShell, { DashField } from '../../components/DashShell'
import { T } from '../../lib/tokens'
import { useIsDesktop } from '../../lib/useIsDesktop'
import { deleteOrganization } from '../../lib/deleteOrganization'
import { getPublisherDescriptionPlaceholder, getPublisherNameLabel, isPersonPublisher } from '../../lib/publisher'

function fieldValue(value, fallback = '未設定') {
  return value || fallback
}

function SettingsSaveActions({ onCancel, onSave, saving, deleting, saved }) {
  return (
    <div className="ui-settings-edit-actions">
      <button type="button" onClick={onCancel} disabled={saving} className="ui-settings-secondary-button">
        キャンセル
      </button>
      <button type="button" onClick={onSave} disabled={saving || deleting} className="ui-settings-primary-button">
        {saved ? '保存済み' : saving ? '保存中...' : '保存'}
      </button>
    </div>
  )
}

function SettingsItem({ id, label, value, mono, editChildren, editSection, onBeginEdit }) {
  const editing = editSection === id
  const editable = Boolean(editChildren)
  return (
    <section className="ui-settings-item">
      <div className="ui-settings-item-head">
        <div className="ui-settings-item-label">{label}</div>
        {editable && !editing && (
          <button type="button" onClick={() => onBeginEdit(id)} className="ui-settings-edit-button">
            編集
          </button>
        )}
      </div>
      {editing && editable ? editChildren : (
        <div className={`ui-settings-item-value ${mono ? 'is-mono' : ''}`}>{value}</div>
      )}
    </section>
  )
}

function LinkValue({ label, value }) {
  return (
    <div className="ui-settings-link-value">
      <span>{label}</span>
      <strong>{fieldValue(value)}</strong>
    </div>
  )
}

export default function DashSettings() {
  const { orgSlug } = useParams()
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const [org, setOrg] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [instagram, setInstagram] = useState('')
  const [twitter, setTwitter] = useState('')
  const [homepageUrl, setHomepageUrl] = useState('')
  const [slug, setSlug] = useState('')
  const [slugChanged, setSlugChanged] = useState(false)
  const [editSection, setEditSection] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteSlugInput, setDeleteSlugInput] = useState('')
  const [deleting, setDeleting] = useState(false)
  const savedResetTimerRef = useRef(null)

  function normalizeSnsValue(value, host) {
    if (!value) return ''
    let normalized = value
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .replace(/^@/, '')
      .replace(/^\/+|\/+$/g, '')
    const hostPrefix = `${host.toLowerCase()}/`
    const lower = normalized.toLowerCase()
    if (lower.startsWith(hostPrefix)) normalized = normalized.slice(host.length + 1)
    else if (lower === host.toLowerCase()) normalized = ''
    return normalized
  }

  function buildSnsUrl(value, host) {
    const normalized = normalizeSnsValue(value, host)
    return normalized ? `https://${host}/${normalized}` : ''
  }

  useEffect(() => {
    if (!supabase) {
      Promise.resolve().then(() => setLoading(false))
      return
    }
    supabase.from('organizations').select('*').eq('slug', orgSlug).single()
      .then(({ data }) => {
        if (data) {
          setOrg(data)
          setName(data.name || '')
          setDescription(data.description || '')
          setInstagram(normalizeSnsValue(data.sns_links?.instagram || '', 'instagram.com'))
          setTwitter(normalizeSnsValue(data.sns_links?.x || '', 'x.com'))
          setHomepageUrl(data.homepage_url || '')
          setSlug(data.slug || '')
        }
        setLoading(false)
      }).catch(() => setLoading(false))
  }, [orgSlug])

  useEffect(() => () => {
    if (savedResetTimerRef.current) clearTimeout(savedResetTimerRef.current)
  }, [])

  function resetFieldsFromOrg() {
    if (!org) return
    setName(org.name || '')
    setDescription(org.description || '')
    setInstagram(normalizeSnsValue(org.sns_links?.instagram || '', 'instagram.com'))
    setTwitter(normalizeSnsValue(org.sns_links?.x || '', 'x.com'))
    setHomepageUrl(org.homepage_url || '')
    setSlug(org.slug || '')
    setSlugChanged(false)
  }

  function handleCancelEdit() {
    resetFieldsFromOrg()
    setEditSection(null)
  }

  function beginEditSection(id) {
    resetFieldsFromOrg()
    setEditSection(id)
  }

  async function handleSave() {
    if (!supabase || !org) return
    setSaving(true)
    const updates = {
      name,
      description,
      sns_links: {
        instagram: buildSnsUrl(instagram, 'instagram.com'),
        x: buildSnsUrl(twitter, 'x.com'),
      },
      homepage_url: homepageUrl,
      slug,
    }
    try {
      const { error } = await supabase.from('organizations').update(updates).eq('id', org.id)
      if (error) {
        window.alert(error.message ? `保存に失敗しました: ${error.message}` : '保存に失敗しました。入力内容や接続状況をご確認ください。')
        return
      }
      setOrg((prev) => prev ? { ...prev, ...updates } : prev)
      setEditSection(null)
      setSlugChanged(false)
      setSaved(true)
      if (slug !== orgSlug) {
        navigate(`/${slug}/dashboard/settings`)
        return
      }
      if (savedResetTimerRef.current) clearTimeout(savedResetTimerRef.current)
      savedResetTimerRef.current = setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      window.alert(error?.message ? `保存に失敗しました: ${error.message}` : '保存に失敗しました。入力内容や接続状況をご確認ください。')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteOrganization() {
    if (!supabase || !org) return
    if (deleteSlugInput.trim() !== (org.slug || orgSlug)) {
      window.alert('確認のため、正しいIDを入力してください。')
      return
    }
    setDeleting(true)
    try {
      const { error } = await deleteOrganization(supabase, org.id)
      if (error) {
        window.alert(error.message ? `削除に失敗しました: ${error.message}` : '削除に失敗しました。')
        return
      }
      navigate('/account', { replace: true })
    } catch (error) {
      window.alert(error?.message ? `削除に失敗しました: ${error.message}` : '削除に失敗しました。')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.paper }}>
      <span style={{ fontFamily: T.mono, color: T.inkMuted, fontSize: 11 }}>...</span>
    </div>
  )

  const publicUrl = `artoir.net/${org?.slug || orgSlug}`
  const nameLabel = getPublisherNameLabel(org)
  const deleteLabel = isPersonPublisher(org) ? '公開ページ' : '団体'

  const settingsContent = (
    <div className="ui-settings-page">
      <SettingsItem
        editSection={editSection}
        onBeginEdit={beginEditSection}
        id="basic"
        label={nameLabel}
        value={fieldValue(org?.name)}
        editChildren={(
          <>
            <DashField label={nameLabel} value={name} onChange={setName} placeholder={isPersonPublisher(org) ? '例: 山田 花' : '例: 多摩美術大学 日本画研究室'} />
            <SettingsSaveActions onCancel={handleCancelEdit} onSave={handleSave} saving={saving} deleting={deleting} saved={saved} />
          </>
        )}
      />

      <SettingsItem
        editSection={editSection}
        onBeginEdit={beginEditSection}
        id="description"
        label="説明文"
        value={fieldValue(org?.description)}
        editChildren={(
          <>
            <DashField label="説明文" value={description} onChange={setDescription} placeholder={getPublisherDescriptionPlaceholder(org)} multiline />
            <SettingsSaveActions onCancel={handleCancelEdit} onSave={handleSave} saving={saving} deleting={deleting} saved={saved} />
          </>
        )}
      />

      <SettingsItem
        editSection={editSection}
        onBeginEdit={beginEditSection}
        id="links"
        label="各種リンク"
        value={(
          <div className="ui-settings-link-list">
            <LinkValue label="Instagram" value={org?.sns_links?.instagram} />
            <LinkValue label="X" value={org?.sns_links?.x} />
            <LinkValue label="Website" value={org?.homepage_url} />
          </div>
        )}
        editChildren={(
          <>
            <DashField label="INSTAGRAM" prefix="instagram.com/" value={instagram} onChange={setInstagram} placeholder="username" mono />
            <DashField label="X (TWITTER)" prefix="x.com/" value={twitter} onChange={setTwitter} placeholder="username" mono />
            <DashField label="WEBSITE" value={homepageUrl} onChange={setHomepageUrl} placeholder="https://example.com" mono />
            <SettingsSaveActions onCancel={handleCancelEdit} onSave={handleSave} saving={saving} deleting={deleting} saved={saved} />
          </>
        )}
      />

      <SettingsItem
        editSection={editSection}
        onBeginEdit={beginEditSection}
        id="url"
        label="公開URL"
        value={publicUrl}
        mono
        editChildren={(
          <>
            <DashField
              label="ID"
              prefix="artoir.net/"
              value={slug}
              onChange={(v) => { setSlug(v); setSlugChanged(v !== orgSlug) }}
              placeholder="tamabi-nihonga"
              mono
              warning={slugChanged ? 'ID変更時は既存URLが無効になります。' : undefined}
            />
            <SettingsSaveActions onCancel={handleCancelEdit} onSave={handleSave} saving={saving} deleting={deleting} saved={saved} />
          </>
        )}
      />

      <section className="ui-settings-section is-danger">
        <div className="ui-settings-section-head">
        </div>
        <p className="ui-settings-danger-copy">
          「{org?.name || orgSlug}」と配下の展覧会・作品をすべて削除します。復元できません。
        </p>
        {deleteConfirm ? (
          <div className="ui-app-card" style={{ padding: 14, borderColor: T.accent }}>
            <div className="ui-kicker">CONFIRM DELETE</div>
            <div style={{ marginTop: 8, fontSize: 13 }}>続行するにはID「{org?.slug || orgSlug}」を入力してください。</div>
            <div style={{ marginTop: 12 }}>
              <div className="ui-form-label">ID</div>
              <div className="ui-input-wrap">
                <input
                  value={deleteSlugInput}
                  onChange={(e) => setDeleteSlugInput(e.target.value)}
                  placeholder={org?.slug || orgSlug}
                  autoComplete="off"
                />
              </div>
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => { setDeleteConfirm(false); setDeleteSlugInput('') }}
                disabled={deleting}
                className="ui-pill-action"
                style={{ flex: 1, background: T.paperAlt, color: T.ink }}
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleDeleteOrganization}
                disabled={deleting || deleteSlugInput.trim() !== (org?.slug || orgSlug)}
                className="ui-pill-action"
                style={{ flex: 1, background: T.accent, opacity: deleting || deleteSlugInput.trim() !== (org?.slug || orgSlug) ? 0.5 : 1 }}
              >
                {deleting ? '削除中...' : '削除する'}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setDeleteConfirm(true)} className="ui-settings-danger-button">
            {deleteLabel}を削除
          </button>
        )}
      </section>
    </div>
  )

  if (isDesktop) return (
    <DashShell orgSlug={orgSlug}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        {settingsContent}
      </div>
    </DashShell>
  )

  return (
    <DashShell orgSlug={orgSlug}>
      {settingsContent}
    </DashShell>
  )
}
