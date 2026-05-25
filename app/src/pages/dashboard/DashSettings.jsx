import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import DashShell, { DashField, DashSectionLabel } from '../../components/DashShell'
import { T } from '../../lib/tokens'
import { useIsDesktop } from '../../lib/useIsDesktop'

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

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.paper }}>
      <span style={{ fontFamily: T.mono, color: T.inkMuted, fontSize: 11 }}>...</span>
    </div>
  )

  const formContent = (
    <div style={{ padding: isDesktop ? '28px 0' : '18px 16px' }}>
      <DashField label="団体名" value={name} onChange={setName} placeholder="例: 多摩美術大学 日本画研究室" />
      <DashField label="説明文" value={description} onChange={setDescription} placeholder="団体の説明文を入力..." multiline />

      <DashSectionLabel>SNS · WEB</DashSectionLabel>
      <DashField label="INSTAGRAM" prefix="instagram.com/" value={instagram} onChange={setInstagram} placeholder="username" mono />
      <DashField label="X (TWITTER)" prefix="x.com/" value={twitter} onChange={setTwitter} placeholder="username" mono />
      <DashField label="WEBSITE" value={homepageUrl} onChange={setHomepageUrl} placeholder="https://example.com" mono />

      <DashSectionLabel>URL · SLUG</DashSectionLabel>
      <DashField
        label="SLUG"
        prefix="artoir.net/"
        value={slug}
        onChange={(v) => { setSlug(v); setSlugChanged(v !== orgSlug) }}
        placeholder="org-slug"
        mono
        warning={slugChanged ? 'slug変更時は既存URLが無効になります。' : undefined}
      />

      <DashSectionLabel>別の団体</DashSectionLabel>
      <div style={{ marginBottom: 18, fontSize: 12, color: T.inkSoft, lineHeight: 1.7 }}>ほかの活動単位を Artoir に追加する場合は、新しい団体を作成できます。</div>
      <Link to="/account/setup" state={{ from: `/${orgSlug}/dashboard/settings` }} className="ui-icon-button" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 16px', border: `1px solid ${T.ink}`, fontFamily: T.mono, fontSize: 11, letterSpacing: '0.12em', color: T.ink, textDecoration: 'none' }}>
        ＋ 新しい団体を作成 →
      </Link>

      <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button
          onClick={() => navigate(`/${orgSlug}/dashboard`)}
          className="ui-icon-button"
          style={{ padding: '14px', background: 'transparent', color: T.ink, border: `1px solid ${T.ink}`, fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em', cursor: 'pointer' }}
        >CANCEL</button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="ui-action"
          style={{ padding: '14px', background: T.accent, color: T.paper, border: 'none', fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
        >{saved ? 'SAVED ✓' : saving ? 'SAVING...' : 'SAVE ↩'}</button>
      </div>
      <div style={{ height: 40 }} />
    </div>
  )

  if (isDesktop) return (
    <DashShell orgSlug={orgSlug} active="set" crumbs={['DASHBOARD', 'SETTINGS']}>
      <div style={{ maxWidth: '80%', margin: '0 auto' }}>
        <div className="ui-hero-screen-heading" style={{ marginBottom: 14 }}>
          <div className="ui-kicker">ORGANIZATION / SETTINGS</div>
          <h1 className="ui-screen-title" style={{ marginTop: 8 }}>団体設定</h1>
        </div>
        {formContent}
      </div>
    </DashShell>
  )

  return (
    <DashShell orgSlug={orgSlug} active="set" crumbs={['DASHBOARD', 'SETTINGS']}>
      <div className="ui-hero-screen-heading" style={{ marginBottom: 14 }}>
        <div className="ui-kicker">ORGANIZATION / 設定</div>
        <h1 className="ui-screen-title" style={{ marginTop: 6 }}>団体設定</h1>
        <p className="ui-screen-subtitle">公開ページに表示される情報を編集します。</p>
      </div>
      {formContent}
    </DashShell>
  )
}
