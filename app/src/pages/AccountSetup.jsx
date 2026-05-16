import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { DashField } from '../components/DashShell'
import { T } from '../lib/tokens'

export default function AccountSetup() {
  const { session } = useAuth()
  const navigate = useNavigate()

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

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim() || !slug.trim()) return
    if (!supabase) { setError('Supabase が未設定です'); return }
    setSaving(true)
    setError('')
    try {
      // create org
      const { data: newOrg, error: orgErr } = await supabase
        .from('organizations')
        .insert({ name: name.trim(), slug: slug.trim(), description: description.trim() || null })
        .select()
        .single()

      if (orgErr) {
        if (orgErr.code === '23505') {
          setError('このSLUGはすでに使われています。別のSLUGを入力してください。')
        } else {
          setError(orgErr.message)
        }
        setSaving(false)
        return
      }

      // link user to org
      const { error: linkErr } = await supabase
        .from('user_orgs')
        .insert({ user_id: session.user.id, org_id: newOrg.id, role: 'owner' })

      if (linkErr) { setError(linkErr.message); setSaving(false); return }

      navigate(`/${newOrg.slug}/dashboard`, { replace: true })
    } catch {
      setError('通信に失敗しました。時間をおいて再度お試しください。')
      setSaving(false)
    }
  }

  const form = (
    <form onSubmit={handleSubmit}>
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
        help="公開URLに使われます。英数字とハイフンのみ。"
      />
      <DashField
        label="説明文（任意）"
        value={description}
        onChange={setDescription}
        placeholder="団体の紹介文を入力..."
        multiline
      />

      {error && (
        <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(180,69,44,0.06)', border: `0.5px solid ${T.accent}`, fontFamily: T.mono, fontSize: 11, color: T.accent, letterSpacing: '0.06em' }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={saving || !name.trim() || !slug.trim()}
        className="ui-pill-action"
        style={{ width: '100%', marginTop: 8, background: (saving || !name.trim() || !slug.trim()) ? T.inkMuted : T.accent, justifyContent: 'space-between', cursor: (saving || !name.trim() || !slug.trim()) ? 'default' : 'pointer' }}
      >
        <span>{saving ? '作成中...' : '作成する'}</span>
        {!saving && <span style={{ fontFamily: T.mono, fontSize: 12 }}>→</span>}
      </button>
    </form>
  )

  return (
    <div className="ui-page-shell ui-auth-shell">
      <section className="ui-auth-card">
        <div className="ui-auth-masthead">
          <Link to="/" className="ui-auth-mark" style={{ textDecoration: 'none' }}>A</Link>
          <div>
            <div className="ui-auth-masthead-title">団体ページを作る</div>
          </div>
          <Link to="/account" style={{ color: 'rgba(255,253,247,0.72)', textDecoration: 'none', fontFamily: T.mono, fontSize: 11 }}>BACK</Link>
        </div>
          <div className="ui-kicker">ORGANIZATION</div>
          <div className="ui-screen-title" style={{ marginTop: 8 }}>団体を作成する</div>
          <div className="ui-screen-subtitle" style={{ fontFamily: T.serifBody, marginBottom: 24 }}>
            Artoir に公開される団体ページを作成します。
          </div>
          {form}
      </section>
    </div>
  )
}
