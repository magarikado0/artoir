import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
    return value
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .replace(new RegExp(`^${host}/?`, 'i'), '')
      .replace(/^@/, '')
      .replace(/^\/+|\/+$/g, '')
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
        window.alert(error.message || '保存に失敗しました。')
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
      window.alert(error?.message || '保存に失敗しました。')
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
        prefix="artport.jp/"
        value={slug}
        onChange={(v) => { setSlug(v); setSlugChanged(v !== orgSlug) }}
        placeholder="org-slug"
        mono
        warning={slugChanged ? 'slug変更時は既存URLが無効になります。' : undefined}
      />

      <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button
          onClick={() => navigate(`/${orgSlug}/dashboard`)}
          style={{ padding: '14px', background: 'transparent', color: T.ink, border: `1px solid ${T.ink}`, fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em', cursor: 'pointer' }}
        >CANCEL</button>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ padding: '14px', background: T.ink, color: T.paper, border: 'none', fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
        >{saved ? 'SAVED ✓' : saving ? 'SAVING...' : 'SAVE ↩'}</button>
      </div>
      <div style={{ height: 40 }} />
    </div>
  )

  if (isDesktop) return (
    <DashShell orgSlug={orgSlug} active="set" crumbs={['DASHBOARD', 'SETTINGS']}>
      <div style={{ padding: '36px 0 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `1px solid ${T.ink}` }}>
        <div>
          <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.inkMuted, marginBottom: 8 }}>ORGANIZATION / SETTINGS</div>
          <div style={{ fontFamily: T.serif, fontSize: 32, letterSpacing: '0.01em', color: T.ink }}>団体設定</div>
        </div>
      </div>
      <div style={{ maxWidth: 640 }}>
        {formContent}
      </div>
    </DashShell>
  )

  return (
    <DashShell orgSlug={orgSlug} active="set" crumbs={['DASHBOARD', 'SETTINGS']}>
      <div style={{ padding: '24px 16px 8px' }}>
        <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.inkMuted, marginBottom: 10 }}>ORGANIZATION / 設定</div>
        <div style={{ fontFamily: T.serif, fontSize: 26, letterSpacing: '0.02em', color: T.ink }}>団体設定</div>
        <div style={{ marginTop: 6, fontSize: 12, color: T.inkSoft, lineHeight: 1.7 }}>公開ページに表示される情報を編集します。</div>
      </div>
      {formContent}
    </DashShell>
  )
}
