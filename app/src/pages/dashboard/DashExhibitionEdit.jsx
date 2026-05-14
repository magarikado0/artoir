import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import DashShell, { DashField, DashSectionLabel } from '../../components/DashShell'
import { T } from '../../lib/tokens'
import { useIsDesktop } from '../../lib/useIsDesktop'

const SWATCHES = ['#FAF8F3', '#E7E2D6', '#111110', '#2A2825', '#B4452C']

function slugifyAscii(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

function fallbackSlug() {
  return 'exh-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

async function generateUniqueSlug(orgId, title) {
  const base = slugifyAscii(title) || fallbackSlug()
  const { data, error } = await supabase
    .from('exhibitions')
    .select('slug')
    .eq('org_id', orgId)
    .like('slug', `${base}%`)
  if (error) throw error
  const existing = new Set((data || []).map((r) => r.slug))
  if (!existing.has(base)) return base
  let n = 2
  while (existing.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}

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

  function onStartDateChange(next) {
    setStartDate(next)
    if (next && endDate && endDate < next) setEndDate(next)
  }

  function onEndDateChange(next) {
    if (next && startDate && next < startDate) {
      setEndDate(startDate)
      return
    }
    setEndDate(next)
  }

  useEffect(() => {
    if (!supabase) { setLoading(false); return }
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
            const s = exh.start_date || ''
            let e = exh.end_date || ''
            if (s && e && e < s) e = s
            setStartDate(s)
            setEndDate(e)
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
    if (startDate && endDate && endDate < startDate) {
      window.alert('終了日は開始日以降である必要があります。')
      return
    }
    setSaving(true)
    let nextPath = null
    try {
      const finalSlug = (isNew || !slug) ? await generateUniqueSlug(org.id, title) : slug
      const payload = { title, slug: finalSlug, start_date: startDate || null, end_date: endDate || null, location, description, bg_color: bgColor, org_id: org.id }
      if (isNew) {
        const { data, error } = await supabase.from('exhibitions').insert(payload).select().single()
        if (error) {
          window.alert(error.message ? `保存に失敗しました: ${error.message}` : '保存に失敗しました。入力内容や接続状況をご確認ください。')
          return
        }
        if (data) {
          setSlug(data.slug)
          nextPath = `/${orgSlug}/dashboard/exhibitions/${data.id}/edit`
        }
      } else {
        const { error } = await supabase.from('exhibitions').update(payload).eq('id', exhibitionId)
        if (error) {
          window.alert(error.message ? `保存に失敗しました: ${error.message}` : '保存に失敗しました。入力内容や接続状況をご確認ください。')
          return
        }
        setSlug(finalSlug)
        nextPath = `/${orgSlug}/dashboard`
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
      <DashField label="タイトル" value={title} onChange={setTitle} placeholder="例: 静かな気配" />
      <DashField
        label="URL"
        prefix={`artoir.net/${orgSlug}/exhibition/`}
        value={isNew ? (slugifyAscii(title) || '(自動採番)') : slug}
        readOnly
        mono
        rightHint="保存時に自動生成"
        help="タイトルから自動生成されます。同じ名前の展覧会が既にある場合は連番（-2, -3 ...）が付きます。"
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <DashField label="START" value={startDate} onChange={onStartDateChange} placeholder="YYYY-MM-DD" mono type="date" />
        <DashField label="END" value={endDate} onChange={onEndDateChange} placeholder="YYYY-MM-DD" mono type="date" min={startDate || undefined} help={startDate ? '開始日以降のみ選択できます。' : undefined} />
      </div>
      <DashField label="会場" value={location} onChange={setLocation} placeholder="例: 東京都・表参道 GALLERY 360°" />
      <DashField
        label="説明文"
        value={description}
        onChange={setDescription}
        multiline
        placeholder={`展覧会の説明文を入力...\n公開ページのヒーロー下に表示されます。（最大400文字）`}
      />

      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '0.18em', color: T.inkMuted }}>背景色</div>
        </div>
        <div style={{ padding: 12, border: `1px solid ${T.ink}`, background: T.card }}>
        <div style={{ height: 90, marginBottom: 12, background: bgColor, border: `0.5px solid ${T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: T.serif, fontSize: 15, letterSpacing: '0.04em', color: isDark ? T.paper : T.ink }}>
            プレビュー — {title || '展覧会タイトル'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`背景色を${c}にする`}
              aria-pressed={bgColor === c}
              onClick={() => setBgColor(c)}
              className="ui-chip ui-swatch"
              style={{ ['--swatch-color']: c, ['--swatch-border']: bgColor === c ? T.ink : T.line, width: 34, height: 34, background: c, cursor: 'pointer', border: bgColor === c ? `2px solid ${T.ink}` : `0.5px solid ${T.line}`, position: 'relative', appearance: 'none', padding: 0 }}
            >
              {bgColor === c && <div style={{ position: 'absolute', inset: 2, border: `1px solid ${c === '#111110' || c === '#2A2825' ? T.paper : T.ink}` }} />}
            </button>
          ))}
        </div>
        </div>
      </div>

      <div style={{ marginTop: 28, display: 'flex', gap: 8 }}>
        {!isNew && (
          <button type="button" onClick={() => exhibitionId && exhibitionId !== 'undefined' && navigate(`/${orgSlug}/dashboard/exhibitions/${exhibitionId}/artworks`)} className="ui-icon-button" style={{ padding: '14px 18px', background: 'transparent', color: T.ink, border: `1px solid ${T.ink}`, fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em', cursor: 'pointer' }}>
            作品を管理 →
          </button>
        )}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button
            type="button"
            onClick={() => navigate(`/${orgSlug}/dashboard`)}
            className="ui-icon-button"
            style={{ width: '100%', padding: '14px 18px', background: 'transparent', color: T.ink, border: `1px solid ${T.ink}`, fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em', cursor: 'pointer' }}
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="ui-action"
            style={{ width: '100%', padding: '14px', background: T.accent, color: T.paper, border: `1px solid ${T.paper}`, fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
          >{saving ? 'SAVING...' : 'SAVE ↩'}</button>
        </div>
      </div>
      <div style={{ height: 40 }} />
    </div>
  )

  if (isDesktop) return (
    <DashShell orgSlug={orgSlug} active="exs">
      <div style={{ maxWidth: '80%', margin: '0 auto' }}>
        <div style={{ padding: '36px 0 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `1px solid ${T.ink}` }}>
          <div>
            <div style={{ fontFamily: T.serif, fontSize: 32, letterSpacing: '0.01em', color: T.ink }}>{isNew ? '新しい展覧会' : (title || '展覧会を編集')}</div>
          </div>
        </div>
        {formContent}
      </div>
    </DashShell>
  )

  return (
    <DashShell orgSlug={orgSlug} active="exs">
      <div style={{ padding: '20px 16px 8px' }}>
        <div style={{ marginTop: 6, fontFamily: T.serif, fontSize: 24, letterSpacing: '0.02em', color: T.ink }}>{isNew ? '新しい展覧会' : (title || '展覧会を編集')}</div>
        <div style={{ marginTop: 4, fontSize: 12, color: T.inkSoft, lineHeight: 1.7 }}>{isNew ? '下の項目を入力すると、公開ページが作成されます。' : '変更は「保存」で反映されます。'}</div>
      </div>
      {formContent}
    </DashShell>
  )
}
