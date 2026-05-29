import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import DashShell, { DashField, DashSectionLabel } from '../components/DashShell'
import { T } from '../lib/tokens'
import { useIsDesktop } from '../lib/useIsDesktop'
import { PUBLISHER_KIND, getPublisherDescriptionPlaceholder, getPublisherNameLabel } from '../lib/publisher'

export default function AccountSetup() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isDesktop = useIsDesktop()
  const cancelTo = typeof location.state?.from === 'string' ? location.state.from : '/account'

  const [kind, setKind] = useState(PUBLISHER_KIND.PERSON)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function handleNameChange(value) {
    setName(value)
    if (!value) {
      setSlug('')
      return
    }
    const generated = value
      .toLowerCase()
      .replace(/[\s\u3000]+/g, '-')
      .replace(/[^\w-]/g, '')
      .replace(/--+/g, '-')
      .replace(/^-|-$/g, '')
    setSlug(generated)
  }

  if (!session) return <Navigate to="/login" state={{ from: '/account/setup' }} replace />

  async function handleSave(e) {
    e?.preventDefault()
    if (!name.trim() || !slug.trim()) return
    if (!supabase) { setError('Supabase が未設定です'); return }
    setSaving(true)
    setError('')
    const trimmedSlug = slug.trim()
    let nextPath = null
    try {
      const { data: newOrg, error: orgErr } = await supabase
        .from('organizations')
        .insert({ kind, name: name.trim(), slug: trimmedSlug, description: description.trim() || null })
        .select()
        .single()

      if (orgErr) {
        if (orgErr.code === '23505') {
          setError('このIDはすでに使われています。別のIDを入力してください。')
        } else {
          setError(orgErr.message)
        }
        return
      }

      let { error: linkErr } = await supabase
        .from('user_orgs')
        .insert({ user_id: session.user.id, org_id: newOrg.id, role: 'owner', member_email: session.user.email })

      if (linkErr) {
        const fallback = await supabase
          .from('user_orgs')
          .insert({ user_id: session.user.id, org_id: newOrg.id, role: 'owner' })
        linkErr = fallback.error
      }

      if (linkErr) {
        setError(linkErr.message)
        return
      }

      nextPath = `/${newOrg.slug || trimmedSlug}/dashboard`
    } catch {
      setError('通信に失敗しました。時間をおいて再度お試しください。')
    } finally {
      setSaving(false)
    }

    if (nextPath) navigate(nextPath, { replace: true })
  }

  const formContent = (
    <form onSubmit={handleSave}>
      <div style={{ padding: isDesktop ? '28px 0' : '16px 16px' }}>
        <DashSectionLabel>公開主体</DashSectionLabel>
        <div className="ui-publisher-kind-grid" role="radiogroup" aria-label="公開主体の種類">
          {[
            [PUBLISHER_KIND.PERSON, '個人', '作家・出展者として展覧会を公開する'],
            [PUBLISHER_KIND.ORGANIZATION, '団体', '学校・ギャラリー・サークルとして公開する'],
          ].map(([value, title, copy]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={kind === value}
              onClick={() => setKind(value)}
              className={`ui-publisher-kind-option ${kind === value ? 'is-active' : ''}`}
            >
              <span>{title}</span>
              <small>{copy}</small>
            </button>
          ))}
        </div>

        <DashSectionLabel>基本情報</DashSectionLabel>
        <DashField
          label={getPublisherNameLabel(kind)}
          value={name}
          onChange={handleNameChange}
          placeholder={kind === PUBLISHER_KIND.PERSON ? '例: 山田 花' : '例: 多摩美術大学 日本画研究室'}
        />
        <DashField
          label="ID"
          prefix="artoir.net/"
          value={slug}
          onChange={setSlug}
          placeholder="tamabi-nihonga"
          mono
          help="公開URLに使われます。英数字とハイフンのみ。"
        />
        <DashField
          label="説明文"
          value={description}
          onChange={setDescription}
          placeholder={getPublisherDescriptionPlaceholder(kind)}
          multiline
          help="任意。公開ページに表示されます。"
        />

        {error && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(180,69,44,0.06)', border: `0.5px solid ${T.accent}`, fontFamily: T.mono, fontSize: 11, color: T.accent, letterSpacing: '0.06em' }}>
            {error}
          </div>
        )}

        <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button
            type="button"
            onClick={() => navigate(cancelTo)}
            className="ui-icon-button"
            style={{ padding: '14px', background: 'transparent', color: T.ink, border: `1px solid ${T.ink}`, fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em', cursor: 'pointer' }}
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim() || !slug.trim()}
            className="ui-action"
            style={{ padding: '14px', background: T.accent, color: T.paper, border: 'none', fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em', cursor: 'pointer', opacity: (saving || !name.trim() || !slug.trim()) ? 0.6 : 1 }}
          >
            {saving ? '保存中...' : '保存する'}
          </button>
        </div>
        <div style={{ height: 40 }} />
      </div>
    </form>
  )

  const pageHeader = (
    <div className="ui-hero-screen-heading" style={{ marginBottom: isDesktop ? 14 : 0 }}>
      <div className="ui-kicker">NEW PAGE</div>
      <h1 className="ui-screen-title" style={{ marginTop: isDesktop ? 8 : 6 }}>公開ページを作成する</h1>
      <p className="ui-screen-subtitle">
        {isDesktop
          ? '個人または団体として、展覧会を公開するためのページを作成します。'
          : '下の項目を入力すると、公開ページが作成されます。'}
      </p>
    </div>
  )

  const crumbs = ['ACCOUNT', 'SETUP']

  if (isDesktop) {
    return (
      <DashShell crumbs={crumbs}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          {pageHeader}
          {formContent}
        </div>
      </DashShell>
    )
  }

  return (
    <DashShell crumbs={crumbs}>
      {pageHeader}
      {formContent}
    </DashShell>
  )
}
