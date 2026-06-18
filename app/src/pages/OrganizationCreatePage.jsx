import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import DashShell, { DashField, DashSectionLabel } from '../components/DashShell'
import LoadingFrames from '../components/LoadingFrames'
import { T } from '../lib/tokens'
import { useIsDesktop } from '../lib/useIsDesktop'
import { slugifyProfileId } from '../lib/profile'

export default function OrganizationCreatePage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!session || !supabase) {
      setLoading(false)
      return undefined
    }
    let cancelled = false
    async function loadProfile() {
      const { data } = await supabase.from('profiles').select('id').eq('id', session.user.id).maybeSingle()
      if (cancelled) return
      setProfile(data || null)
      setLoading(false)
    }
    loadProfile()
    return () => { cancelled = true }
  }, [session])

  function handleNameChange(value) {
    setName(value)
    if (!slug) setSlug(slugifyProfileId(value))
  }

  if (!session) return <Navigate to="/login" state={{ from: '/account/organizations/new' }} replace />
  if (!loading && !profile) return <Navigate to="/account/setup" state={{ from: '/account/organizations/new' }} replace />

  async function handleSave(e) {
    e?.preventDefault()
    if (!name.trim() || !slug.trim() || !profile) return
    if (!supabase) { setError('Supabase が未設定です'); return }
    setSaving(true)
    setError('')
    const finalSlug = slugifyProfileId(slug) || slug.trim()
    let nextPath = null
    try {
      const { data: newOrg, error: orgErr } = await supabase
        .from('organizations')
        .insert({
          name: name.trim(),
          slug: finalSlug,
          description: description.trim() || null,
          created_by: profile.id,
        })
        .select()
        .single()

      if (orgErr) {
        if (orgErr.code === '23505') setError('このIDはすでに使われています。別のIDを入力してください。')
        else setError(orgErr.message)
        return
      }

      const { error: memberErr } = await supabase
        .from('organization_members')
        .insert({ organization_id: newOrg.id, profile_id: profile.id, role: 'owner' })

      if (memberErr) {
        setError(memberErr.message)
        return
      }

      nextPath = `/${newOrg.slug || finalSlug}/dashboard`
    } catch {
      setError('通信に失敗しました。時間をおいて再度お試しください。')
    } finally {
      setSaving(false)
    }

    if (nextPath) navigate(nextPath, { replace: true })
  }

  if (loading) return (
    <div className="ui-page-shell" style={{ display: 'grid', placeItems: 'center' }}>
      <LoadingFrames />
    </div>
  )

  return (
    <DashShell crumbs={['アカウント', '団体']}>
      <div style={{ maxWidth: isDesktop ? 760 : undefined, margin: isDesktop ? '0 auto' : undefined }}>
        <div className="ui-hero-screen-heading" style={{ marginBottom: isDesktop ? 14 : 0 }}>
          <div className="ui-kicker">新しい団体</div>
          <h1 className="ui-screen-title" style={{ marginTop: isDesktop ? 8 : 6 }}>団体を作成</h1>
          <p className="ui-screen-subtitle">展示活動をまとめる団体ページを作成します。</p>
        </div>

        <form onSubmit={handleSave}>
          <div style={{ padding: isDesktop ? '28px 0' : '16px 16px' }}>
            <DashSectionLabel>基本情報</DashSectionLabel>
            <DashField label="団体名" value={name} onChange={handleNameChange} placeholder="例: 多摩美術大学 書道部" />
            <DashField
              label="ID"
              value={slug}
              onChange={(value) => setSlug(slugifyProfileId(value))}
              placeholder="tamabi-shodo"
              mono
              help="英数字・ハイフン・アンダースコアが使えます。"
            />
            <DashField label="説明文" value={description} onChange={setDescription} placeholder="団体の説明文を入力..." multiline help="任意。団体ページに表示されます。" />

            {error && (
              <div className="ui-alert ui-alert--error" style={{ marginBottom: 16 }}>
                {error}
              </div>
            )}

            <div className="ui-btn-row" style={{ marginTop: 28 }}>
              <button type="button" onClick={() => navigate('/account')} className="ui-btn ui-btn--ghost">
                キャンセル
              </button>
              <button type="submit" disabled={saving || !name.trim() || !slug.trim()} className="ui-btn ui-btn--accent">
                {saving ? '作成中…' : '作成する'}
              </button>
            </div>
            <div style={{ height: 40 }} />
          </div>
        </form>
      </div>
    </DashShell>
  )
}
