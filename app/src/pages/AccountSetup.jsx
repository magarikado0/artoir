import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import DashShell, { DashField, DashSectionLabel } from '../components/DashShell'
import LoadingFrames from '../components/LoadingFrames'
import { T } from '../lib/tokens'
import { useIsDesktop } from '../lib/useIsDesktop'
import { normalizeProfile, slugifyProfileId } from '../lib/profile'

export default function AccountSetup() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isDesktop = useIsDesktop()
  const cancelTo = typeof location.state?.from === 'string' ? location.state.from : '/account'

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [displayName, setDisplayName] = useState('')
  const [slug, setSlug] = useState('')
  const [bio, setBio] = useState('')
  const [instagram, setInstagram] = useState('')
  const [twitter, setTwitter] = useState('')
  const [homepageUrl, setHomepageUrl] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

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
    if (!session || !supabase) {
      setLoading(false)
      return undefined
    }
    let cancelled = false
    async function loadProfile() {
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
      if (cancelled) return
      const nextProfile = normalizeProfile(data)
      setProfile(nextProfile)
      setDisplayName(nextProfile?.display_name || '')
      setSlug(nextProfile?.slug || '')
      setBio(nextProfile?.bio || '')
      setInstagram(normalizeSnsValue(nextProfile?.sns_links?.instagram || '', 'instagram.com'))
      setTwitter(normalizeSnsValue(nextProfile?.sns_links?.x || '', 'x.com'))
      setHomepageUrl(nextProfile?.homepage_url || '')
      setLoading(false)
    }
    loadProfile()
    return () => { cancelled = true }
  }, [session])

  function handleDisplayNameChange(value) {
    setDisplayName(value)
    if (!profile && !slug) setSlug(slugifyProfileId(value))
  }

  if (!session) return <Navigate to="/login" state={{ from: '/account/setup' }} replace />

  async function handleSave(e) {
    e?.preventDefault()
    if (!displayName.trim() || !slug.trim()) return
    if (!supabase) { setError('Supabase が未設定です'); return }
    setSaving(true)
    setError('')
    try {
      const payload = {
        id: session.user.id,
        display_name: displayName.trim(),
        slug: slugifyProfileId(slug) || slug.trim(),
        bio: bio.trim() || null,
        sns_links: {
          instagram: buildSnsUrl(instagram, 'instagram.com'),
          x: buildSnsUrl(twitter, 'x.com'),
        },
        homepage_url: homepageUrl.trim() || null,
      }
      const { error: saveError } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' })
      if (saveError) {
        if (saveError.code === '23505') {
          setError('このIDはすでに使われています。別のIDを入力してください。')
        } else {
          setError(saveError.message)
        }
        return
      }
      navigate(cancelTo || '/account', { replace: true })
    } catch {
      setError('通信に失敗しました。時間をおいて再度お試しください。')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="ui-page-shell" style={{ display: 'grid', placeItems: 'center' }}>
      <LoadingFrames />
    </div>
  )

  const formContent = (
    <form onSubmit={handleSave}>
      <div style={{ padding: isDesktop ? '28px 0' : '16px 16px' }}>
        <DashSectionLabel>プロフィール</DashSectionLabel>
        <DashField
          label="表示名"
          value={displayName}
          onChange={handleDisplayNameChange}
          placeholder="例: 山田 花"
        />
        <DashField
          label="ID"
          value={slug}
          onChange={(value) => setSlug(slugifyProfileId(value))}
          placeholder="hanayamada"
          mono
          help="英数字・ハイフン・アンダースコアが使えます。"
        />
        <DashField
          label="自己紹介"
          value={bio}
          onChange={setBio}
          placeholder="活動や作品について入力..."
          multiline
          help="任意。作品の作者表示や将来のプロフィール公開で使います。"
        />
        <DashSectionLabel>各種リンク</DashSectionLabel>
        <DashField
          label="Instagram"
          prefix="instagram.com/"
          value={instagram}
          onChange={setInstagram}
          placeholder="username"
          mono
        />
        <DashField
          label="X"
          prefix="x.com/"
          value={twitter}
          onChange={setTwitter}
          placeholder="username"
          mono
        />
        <DashField
          label="Webサイト"
          value={homepageUrl}
          onChange={setHomepageUrl}
          placeholder="https://example.com"
          mono
        />

        {error && (
          <div className="ui-alert ui-alert--error" style={{ marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div className="ui-btn-row" style={{ marginTop: 28 }}>
          <button
            type="button"
            onClick={() => navigate(cancelTo)}
            className="ui-btn ui-btn--ghost"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={saving || !displayName.trim() || !slug.trim()}
            className="ui-btn ui-btn--accent"
          >
            {saving ? '保存中…' : '保存する'}
          </button>
        </div>
        <div style={{ height: 40 }} />
      </div>
    </form>
  )

  const pageHeader = (
    <div className="ui-hero-screen-heading" style={{ marginBottom: isDesktop ? 14 : 0 }}>
      <div className="ui-kicker">{profile ? 'プロフィール' : 'はじめる'}</div>
      <h1 className="ui-screen-title" style={{ marginTop: isDesktop ? 8 : 6 }}>プロフィールを設定</h1>
      <p className="ui-screen-subtitle">
        表示名とIDを決めて、artoirを始めます。
      </p>
    </div>
  )

  return (
    <DashShell crumbs={['アカウント', 'プロフィール']}>
      <div style={{ maxWidth: isDesktop ? 760 : undefined, margin: isDesktop ? '0 auto' : undefined }}>
        {pageHeader}
        {formContent}
      </div>
    </DashShell>
  )
}
