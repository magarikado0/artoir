import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { DashField } from '../components/DashShell'
import { T } from '../lib/tokens'
import { useIsDesktop } from '../lib/useIsDesktop'

export default function AccountSetup() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // auto-generate slug from name
  useEffect(() => {
    if (!name) return
    const generated = name
      .toLowerCase()
      .replace(/[\s\u3000]+/g, '-')
      .replace(/[^\w-]/g, '')
      .replace(/--+/g, '-')
      .replace(/^-|-$/g, '')
    setSlug(generated)
  }, [name])

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
        onChange={setName}
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
        style={{ width: '100%', marginTop: 8, background: (saving || !name.trim() || !slug.trim()) ? T.inkMuted : T.ink, color: T.paper, border: 'none', padding: '16px', fontFamily: T.sans, fontSize: 13, fontWeight: 500, letterSpacing: '0.14em', cursor: (saving || !name.trim() || !slug.trim()) ? 'default' : 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <span>{saving ? '作成中...' : '作成する'}</span>
        {!saving && <span style={{ fontFamily: T.mono, fontSize: 12 }}>→</span>}
      </button>
    </form>
  )

  if (isDesktop) return (
    <div style={{ background: T.paper, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* header */}
      <div style={{ borderBottom: `1px solid ${T.ink}`, background: T.paper }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ fontFamily: T.serif, fontSize: 20, letterSpacing: '-0.01em', fontWeight: 500, color: T.ink, textDecoration: 'none' }}>
            Artoir<span style={{ color: T.accent }}>.</span>
          </Link>
          <Link to="/account" style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: '0.12em', color: T.inkMuted, textDecoration: 'none' }}>← BACK</Link>
        </div>
      </div>

      {/* content */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '60px 32px' }}>
        <div style={{ width: 480 }}>
          <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.inkMuted, marginBottom: 10 }}>SETUP / 01</div>
          <div style={{ fontFamily: T.serif, fontSize: 36, letterSpacing: '0.02em', color: T.ink, marginBottom: 8 }}>団体を作成する</div>
          <div style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.9, fontFamily: T.serifBody, marginBottom: 32 }}>
            Artoir に公開される団体ページを作成します。
          </div>
          {form}
        </div>
      </div>
    </div>
  )

  // mobile
  return (
    <div style={{ background: T.paper, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* header */}
      <div style={{ padding: '14px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${T.ink}`, background: T.paper }}>
        <Link to="/" style={{ fontFamily: T.serif, fontSize: 18, letterSpacing: '-0.01em', fontWeight: 500, color: T.ink, textDecoration: 'none' }}>
          Artoir<span style={{ color: T.accent }}>.</span>
        </Link>
        <Link to="/account" style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.12em', color: T.inkMuted, textDecoration: 'none' }}>← BACK</Link>
      </div>

      <div style={{ flex: 1, padding: '32px 16px' }}>
        <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.inkMuted, marginBottom: 10 }}>SETUP / 01</div>
        <div style={{ fontFamily: T.serif, fontSize: 28, letterSpacing: '0.02em', color: T.ink, lineHeight: 1.35, marginBottom: 8 }}>団体を作成する</div>
        <div style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.9, marginBottom: 28 }}>Artoir に公開される団体ページを作成します。</div>
        {form}
      </div>
    </div>
  )
}
