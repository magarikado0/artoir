import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import DashShell, { DashField, DashSectionLabel } from '../components/DashShell'
import { T } from '../lib/tokens'
import { useIsDesktop } from '../lib/useIsDesktop'

export default function AccountSetup() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isDesktop = useIsDesktop()
  const cancelTo = typeof location.state?.from === 'string' ? location.state.from : '/account'

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
        .insert({ name: name.trim(), slug: trimmedSlug, description: description.trim() || null })
        .select()
        .single()

      if (orgErr) {
        if (orgErr.code === '23505') {
          setError('この SLUG はすでに使われています。別の SLUG を入力してください。')
        } else {
          setError(orgErr.message)
        }
        return
      }

      const { error: linkErr } = await supabase
        .from('user_orgs')
        .insert({ user_id: session.user.id, org_id: newOrg.id, role: 'owner' })

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
        <DashSectionLabel>基本情報</DashSectionLabel>
        <DashField
          label="団体名"
          value={name}
          onChange={handleNameChange}
          placeholder="例: 多摩美術大学 日本画研究室"
        />
        <DashField
          label="SLUG"
          prefix="artoir.net/"
          value={slug}
          onChange={setSlug}
          placeholder="tamabi-nihonga"
          mono
          help="公開 URL に使われます。英数字とハイフンのみ。"
        />
        <DashField
          label="説明文"
          value={description}
          onChange={setDescription}
          placeholder="団体の紹介文を入力..."
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
            CANCEL
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim() || !slug.trim()}
            className="ui-action"
            style={{ padding: '14px', background: T.accent, color: T.paper, border: 'none', fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em', cursor: 'pointer', opacity: (saving || !name.trim() || !slug.trim()) ? 0.6 : 1 }}
          >
            {saving ? 'SAVING...' : 'SAVE ↩'}
          </button>
        </div>
        <div style={{ height: 40 }} />
      </div>
    </form>
  )

  const pageHeader = (
    <div className="ui-hero-screen-heading" style={{ marginBottom: isDesktop ? 14 : 0 }}>
      <div className="ui-kicker">NEW ORGANIZATION</div>
      <h1 className="ui-screen-title" style={{ marginTop: isDesktop ? 8 : 6 }}>団体を作成する</h1>
      <p className="ui-screen-subtitle">
        {isDesktop
          ? '基本情報を入力すると、公開用の団体ページが作成されます。'
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
