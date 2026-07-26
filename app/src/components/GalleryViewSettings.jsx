import { useEffect, useMemo, useState } from 'react'
import { GALLERY_VIEW_LABELS, GALLERY_VIEW_MODES, normalizeGalleryViewSettings } from '../lib/galleryViewSettings'

export default function GalleryViewSettings({
  exhibition,
  hasSavedLayout,
  savingLayout = false,
  supabase,
  onExhibitionChange,
  onDeleteSavedLayout,
}) {
  const normalized = useMemo(() => normalizeGalleryViewSettings(exhibition), [exhibition])
  const [modes, setModes] = useState(normalized.modes)
  const [defaultView, setDefaultView] = useState(normalized.defaultView)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    setModes(normalized.modes)
    setDefaultView(normalized.defaultView)
  }, [normalized])

  const selectableModes = GALLERY_VIEW_MODES.filter((mode) => mode !== 'curated' || hasSavedLayout)
  const effectiveModes = modes.filter((mode) => selectableModes.includes(mode))

  function toggleMode(mode) {
    const enabled = effectiveModes.includes(mode)
    if (enabled && effectiveModes.length === 1) {
      setMessage('公開する表示方法を1つ以上選択してください。')
      return
    }
    const next = enabled
      ? modes.filter((item) => item !== mode)
      : GALLERY_VIEW_MODES.filter((item) => [...modes, mode].includes(item))
    const nextEffective = next.filter((item) => selectableModes.includes(item))
    setModes(next)
    setDefaultView((current) => nextEffective.includes(current) ? current : nextEffective[0])
    setMessage('')
  }

  async function saveSettings() {
    if (!supabase || !exhibition?.id || effectiveModes.length === 0) return
    setSaving(true)
    setMessage('')
    const resolvedDefault = effectiveModes.includes(defaultView) ? defaultView : effectiveModes[0]
    const { error } = await supabase
      .from('exhibitions')
      .update({
        gallery_view_modes: effectiveModes,
        gallery_default_view: resolvedDefault,
      })
      .eq('id', exhibition.id)
    setSaving(false)
    if (error) {
      setMessage(`設定を保存できませんでした。SQLの適用を確認してください: ${error.message}`)
      return
    }
    const nextExhibition = {
      ...exhibition,
      gallery_view_modes: effectiveModes,
      gallery_default_view: resolvedDefault,
    }
    setModes(effectiveModes)
    setDefaultView(resolvedDefault)
    onExhibitionChange?.(nextExhibition)
    setMessage('公開ページの表示設定を保存しました。')
  }

  async function deleteLayout() {
    if (!onDeleteSavedLayout || deleting) return
    if (!window.confirm('保存した自由配置を削除しますか？この操作は元に戻せません。')) return
    setDeleting(true)
    setMessage('')
    const result = await onDeleteSavedLayout()
    setDeleting(false)
    if (result?.error) {
      setMessage(`自由配置を削除できませんでした: ${result.error.message || result.error}`)
      return
    }
    const nextModes = modes.filter((mode) => mode !== 'curated')
    const safeModes = nextModes.length > 0 ? nextModes : ['wall']
    const nextDefault = safeModes.includes(defaultView) ? defaultView : safeModes[0]
    setModes(safeModes)
    setDefaultView(nextDefault)
    setMessage('保存した自由配置を削除しました。')
  }

  return (
    <section className="ui-gallery-view-settings" aria-labelledby="gallery-view-settings-title">
      <div className="ui-gallery-view-settings-head">
        <div>
          <h2 id="gallery-view-settings-title">公開ページの表示</h2>
          <p>来場者が切り替えられる表示方法を選びます。</p>
        </div>
        <button type="button" className="ui-btn ui-btn--accent" disabled={saving || deleting || savingLayout} onClick={saveSettings}>
          {saving ? '保存中…' : '表示設定を保存'}
        </button>
      </div>

      <div className="ui-gallery-view-mode-list">
        {GALLERY_VIEW_MODES.map((mode) => {
          const unavailable = mode === 'curated' && !hasSavedLayout
          const checked = !unavailable && effectiveModes.includes(mode)
          return (
            <label key={mode} className={`ui-gallery-view-mode${checked ? ' is-selected' : ''}${unavailable ? ' is-disabled' : ''}`}>
              <input
                type="checkbox"
                checked={checked}
                disabled={unavailable || saving || deleting || savingLayout}
                onChange={() => toggleMode(mode)}
              />
              <span>{GALLERY_VIEW_LABELS[mode]}</span>
              {unavailable && <small>配置を保存すると選択できます</small>}
            </label>
          )
        })}
      </div>

      <label className="ui-gallery-default-view">
        <span>最初に表示する方法</span>
        <select
          value={effectiveModes.includes(defaultView) ? defaultView : effectiveModes[0]}
          disabled={saving || deleting || savingLayout || effectiveModes.length === 0}
          onChange={(event) => setDefaultView(event.target.value)}
        >
          {effectiveModes.map((mode) => <option key={mode} value={mode}>{GALLERY_VIEW_LABELS[mode]}</option>)}
        </select>
      </label>

      {message && <div className="ui-gallery-view-settings-message" role="status">{message}</div>}

      {hasSavedLayout && (
        <div className="ui-gallery-view-danger">
          <div>
            <strong>保存した自由配置を削除</strong>
            <span>配置データを消し、公開ページから自由配置を取り除きます。</span>
          </div>
          <button type="button" disabled={saving || deleting || savingLayout} onClick={deleteLayout}>
            {deleting ? '削除中…' : '自由配置を削除'}
          </button>
        </div>
      )}
    </section>
  )
}
