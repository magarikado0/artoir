import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import DashShell, { DashField, DashSectionLabel } from '../../components/DashShell'
import { T } from '../../lib/tokens'
import { useIsDesktop } from '../../lib/useIsDesktop'

const SWATCHES = ['#FAF8F3', '#F3F0E8', '#E7E2D6', '#111110', '#2A2825', '#B4452C']

export default function DashExhibitionEdit() {
  const { orgSlug, exhibitionId } = useParams()
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const isNew = !exhibitionId || exhibitionId === 'undefined'

  const [org, setOrg] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [bgColor, setBgColor] = useState('#FAF8F3')

  useEffect(() => {
    if (!supabase) return setLoading(false)
    async function load() {
      try {
        const { data: orgData } = await supabase.from('organizations').select('*').eq('slug', orgSlug).single()
        if (!orgData) return
        setOrg(orgData)
        if (!isNew && exhibitionId && exhibitionId !== 'undefined') {
          const { data: exh } = await supabase.from('exhibitions').select('*').eq('id', exhibitionId).single()
          if (exh) {
            setTitle(exh.title || '')
            setSlug(exh.slug || '')
            setStartDate(exh.start_date || '')
            setEndDate(exh.end_date || '')
            setLocation(exh.location || '')
            setDescription(exh.description || '')
            setBgColor(exh.bg_color || '#FAF8F3')
          }
        }
      } catch { /* unavailable */ } finally { setLoading(false) }
    }
    load()
  }, [orgSlug, exhibitionId, isNew])

  async function handleSave() {
    if (!supabase || !org) return
    if (!isNew && (!exhibitionId || exhibitionId === 'undefined')) return
    setSaving(true)
    const payload = { title, slug, start_date: startDate || null, end_date: endDate || null, location, description, bg_color: bgColor, org_id: org.id }
    let nextPath = null
    try {
      if (isNew) {
        const { data, error } = await supabase.from('exhibitions').insert(payload).select().single()
        if (error) {
          window.alert(error.message ? `保存に失敗しました: ${error.message}` : '保存に失敗しました。入力内容や接続状況をご確認ください。')
          return
        }
        if (data) nextPath = `/${orgSlug}/dashboard/exhibitions/${data.id}/edit`
      } else {
        const { error } = await supabase.from('exhibitions').update(payload).eq('id', exhibitionId)
        if (error) {
          window.alert(error.message ? `保存に失敗しました: ${error.message}` : '保存に失敗しました。入力内容や接続状況をご確認ください。')
          return
        }
        nextPath = `/${orgSlug}/dashboard/exhibitions`
      }
    } catch (error) {
      window.alert(error?.message ? `保存に失敗しました: ${error.message}` : '保存に失敗しました。入力内容や接続状況をご確認ください。')
    } finally {
      setSaving(false)
    }

    if (nextPath) navigate(nextPath)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.paper }}>
      <span style={{ fontFamily: T.mono, color: T.inkMuted, fontSize: 11 }}>...</span>
    </div>
  )

  const isDark = bgColor === '#111110' || bgColor === '#2A2825' || bgColor === '#B4452C'

  const formContent = (
    <div style={{ padding: isDesktop ? '28px 0' : '16px 16px' }}>
      <DashSectionLabel>基本情報</DashSectionLabel>
      <DashField label="タイトル" value={title} onChange={setTitle} placeholder="例: 静かな気配" />
      <DashField
        label="SLUG"
        prefix={`Artoir.jp/${orgSlug}/exhibition/`}
        value={slug}
        onChange={setSlug}
        placeholder="shizukana-kehai"
        mono
        rightHint="公開URL"
      />

      <DashSectionLabel>会期・会場</DashSectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <DashField label="START" value={startDate} onChange={setStartDate} placeholder="YYYY-MM-DD" mono type="date" />
        <DashField label="END" value={endDate} onChange={setEndDate} placeholder="YYYY-MM-DD" mono type="date" />
      </div>
      <DashField label="会場" value={location} onChange={setLocation} placeholder="例: 東京都・表参道 GALLERY 360°" />

      <DashSectionLabel>説明文</DashSectionLabel>
      <DashField
        label="DESCRIPTION"
        value={description}
        onChange={setDescription}
        multiline
        placeholder="展覧会の説明文を入力..."
        help="公開ページのヒーロー下に表示されます（最大 400 文字）。"
      />

      <DashSectionLabel>背景色</DashSectionLabel>
      <div style={{ padding: 12, border: `1px solid ${T.ink}`, background: T.card }}>
        <div style={{ height: 90, marginBottom: 12, background: bgColor, border: `0.5px solid ${T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: T.serif, fontSize: 15, letterSpacing: '0.04em', color: isDark ? T.paper : T.ink }}>
            プレビュー — {title || '展覧会タイトル'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {SWATCHES.map((c) => (
            <div key={c} onClick={() => setBgColor(c)} style={{ width: 30, height: 30, background: c, cursor: 'pointer', border: bgColor === c ? `2px solid ${T.ink}` : `0.5px solid ${T.line}`, position: 'relative' }}>
              {bgColor === c && <div style={{ position: 'absolute', inset: 2, border: `1px solid ${c === '#111110' || c === '#2A2825' ? T.paper : T.ink}` }} />}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, fontFamily: T.mono, fontSize: 10, letterSpacing: '0.12em', color: T.inkMuted }}>{bgColor.toUpperCase()}</div>
      </div>

      <div style={{ marginTop: 28, display: 'flex', gap: 8 }}>
        {!isNew && (
          <button onClick={() => exhibitionId && exhibitionId !== 'undefined' && navigate(`/${orgSlug}/dashboard/exhibitions/${exhibitionId}/artworks`)} style={{ padding: '14px 18px', background: 'transparent', color: T.ink, border: `1px solid ${T.ink}`, fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em', cursor: 'pointer' }}>
            作品を管理 →
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ flex: 1, padding: '14px', background: T.ink, color: T.paper, border: 'none', fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
        >{saving ? 'SAVING...' : 'SAVE ↩'}</button>
      </div>
      <div style={{ height: 40 }} />
    </div>
  )

  const crumbs = isNew ? ['DASHBOARD', 'EXHIBITIONS', 'NEW'] : ['DASHBOARD', 'EXHIBITIONS', 'EDIT']

  if (isDesktop) return (
    <DashShell orgSlug={orgSlug} active="exs" crumbs={crumbs}>
      <div style={{ padding: '36px 0 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `1px solid ${T.ink}` }}>
        <div>
          <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.inkMuted, marginBottom: 8 }}>{isNew ? 'NEW EXHIBITION' : 'EDIT EXHIBITION'}</div>
          <div style={{ fontFamily: T.serif, fontSize: 32, letterSpacing: '0.01em', color: T.ink }}>{isNew ? '新しい展覧会' : (title || '展覧会を編集')}</div>
        </div>
      </div>
      <div style={{ maxWidth: 640 }}>
        {formContent}
      </div>
    </DashShell>
  )

  return (
    <DashShell orgSlug={orgSlug} active="exs" crumbs={crumbs}>
      <div style={{ padding: '20px 16px 8px' }}>
        <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.inkMuted }}>{isNew ? 'NEW EXHIBITION' : 'EDIT EXHIBITION'}</div>
        <div style={{ marginTop: 6, fontFamily: T.serif, fontSize: 24, letterSpacing: '0.02em', color: T.ink }}>{isNew ? '新しい展覧会' : (title || '展覧会を編集')}</div>
        <div style={{ marginTop: 4, fontSize: 12, color: T.inkSoft, lineHeight: 1.7 }}>{isNew ? '下の項目を入力すると、公開ページが作成されます。' : '変更は「保存」で反映されます。'}</div>
      </div>
      {formContent}
    </DashShell>
  )
}
