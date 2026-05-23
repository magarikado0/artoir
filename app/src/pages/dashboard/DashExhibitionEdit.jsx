import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import DashShell, { DashField, DashSectionLabel } from '../../components/DashShell'
import ImageUploader from '../../components/ImageUploader'
import ArtworkMedia from '../../components/ArtworkMedia'
import { T } from '../../lib/tokens'
import { useIsDesktop } from '../../lib/useIsDesktop'
import { getExhibitionFeeType, getExhibitionThumbnailUrl } from '../../lib/exhibition'
import { getThumbnailUrl } from '../../lib/imageUrl'

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
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [feeType, setFeeType] = useState('free')
  const [feeDetail, setFeeDetail] = useState('')

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
            setStartTime(exh.start_time || '')
            setEndDate(e)
            setEndTime(exh.end_time || '')
            setLocation(exh.location || '')
            setDescription(exh.description || '')
            setThumbnailUrl(getExhibitionThumbnailUrl(exh))
            setFeeType(getExhibitionFeeType(exh))
            setFeeDetail(exh.fee_detail || '')
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
    if (feeType === 'paid' && !feeDetail.trim()) {
      window.alert('有料の場合は料金詳細を入力してください。')
      return
    }
    setSaving(true)
    let nextPath = null
    try {
      const finalSlug = (isNew || !slug) ? await generateUniqueSlug(org.id, title) : slug
      const payload = {
        title,
        slug: finalSlug,
        start_date: startDate || null,
        start_time: startTime || null,
        end_date: endDate || null,
        end_time: endTime || null,
        location,
        description,
        thumbnail_url: thumbnailUrl || null,
        fee_type: feeType,
        fee_detail: feeType === 'paid' ? feeDetail.trim() : null,
        org_id: org.id,
      }
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

  const formContent = (
    <div style={{ padding: isDesktop ? '28px 0' : '16px 16px' }}>
      <DashSectionLabel>基本情報</DashSectionLabel>
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

      <DashSectionLabel>会期・会場</DashSectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
        <DashField label="START" value={startDate} onChange={onStartDateChange} placeholder="YYYY-MM-DD" mono type="date" />
        <DashField label="START TIME" value={startTime} onChange={setStartTime} placeholder="--:--" mono type="time" />
        <DashField label="END" value={endDate} onChange={onEndDateChange} placeholder="YYYY-MM-DD" mono type="date" min={startDate || undefined} />
        <DashField label="END TIME" value={endTime} onChange={setEndTime} placeholder="--:--" mono type="time" />
      </div>
      <DashField label="会場" value={location} onChange={setLocation} placeholder="例: 東京都・表参道 GALLERY 360°" />

      <DashSectionLabel>料金</DashSectionLabel>
      <div style={{ display: 'grid', gap: 10 }}>
        <div className="ui-segment" style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
          <button type="button" onClick={() => setFeeType('free')} className={feeType === 'free' ? 'is-active' : ''}>無料</button>
          <button type="button" onClick={() => setFeeType('paid')} className={feeType === 'paid' ? 'is-active' : ''}>有料</button>
        </div>
        {feeType === 'paid' ? (
          <DashField
            label="料金詳細"
            value={feeDetail}
            onChange={setFeeDetail}
            multiline
            placeholder="例: 一般 500円 / 学生 300円 / 中学生以下無料"
            help="有料の場合は、公開ページに表示する料金情報を自由記述で入力してください。"
          />
        ) : (
          <div className="ui-field-help">無料の展覧会として表示されます。</div>
        )}
      </div>

      <DashSectionLabel>説明文</DashSectionLabel>
      <DashField
        label="DESCRIPTION"
        value={description}
        onChange={setDescription}
        multiline
        placeholder="展覧会の説明文を入力..."
        help="公開ページのヒーロー下に表示されます（最大 400 文字）。"
      />

      <DashSectionLabel>サムネイル</DashSectionLabel>
      <div style={{ display: 'grid', gap: 10 }}>
        {thumbnailUrl ? (
          <div style={{ display: 'grid', gap: 8 }}>
            <ArtworkMedia
              src={getThumbnailUrl(thumbnailUrl, 220)}
              alt={title || '展覧会サムネイル'}
              label={title || '展覧会サムネイル'}
              loading="eager"
              fit="cover"
              aspectRatio="1 / 1"
              wrapperStyle={{ width: 'min(220px, 100%)', borderRadius: 7 }}
              imageStyle={{ borderRadius: 7 }}
            />
            <button type="button" onClick={() => setThumbnailUrl('')} className="ui-icon-button" style={{ width: 'fit-content', padding: '10px 14px', background: 'transparent', color: T.ink, border: `1px solid ${T.ink}`, fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em', cursor: 'pointer' }}>
              サムネイルを削除
            </button>
          </div>
        ) : (
          <>
            <div className="ui-field-help">公開ページと一覧の先頭で使う画像です。設定しない場合は作品画像の先頭を使います。</div>
            <ImageUploader onUploaded={(url) => setThumbnailUrl(url)}>
              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ fontFamily: T.serif, fontSize: 14, color: T.ink }}>画像をアップロード</div>
                <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.08em', color: T.inkMuted }}>クリックまたはドラッグ&ドロップ</div>
              </div>
            </ImageUploader>
          </>
        )}
      </div>

      <div style={{ marginTop: 28, display: 'flex', gap: 8 }}>
        {!isNew && (
          <button type="button" onClick={() => exhibitionId && exhibitionId !== 'undefined' && navigate(`/${orgSlug}/dashboard/exhibitions/${exhibitionId}/artworks`)} className="ui-icon-button" style={{ padding: '14px 18px', background: 'transparent', color: T.ink, border: `1px solid ${T.ink}`, fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em', cursor: 'pointer' }}>
            作品を管理 →
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="ui-action"
          style={{ flex: 1, padding: '14px', background: T.accent, color: T.paper, border: `1px solid ${T.paper}`, fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
        >{saving ? 'SAVING...' : 'SAVE ↩'}</button>
      </div>
      <div style={{ height: 40 }} />
    </div>
  )

  const crumbs = isNew ? ['DASHBOARD', 'EXHIBITIONS', 'NEW'] : ['DASHBOARD', 'EXHIBITIONS', 'EDIT']

  if (isDesktop) return (
    <DashShell orgSlug={orgSlug} active="exs" crumbs={crumbs}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div className="ui-app-card" style={{ padding: 18, marginBottom: 14 }}>
          <div>
            <div className="ui-kicker">{isNew ? 'NEW EXHIBITION' : 'EDIT EXHIBITION'}</div>
            <div className="ui-screen-title" style={{ marginTop: 8 }}>{isNew ? '新しい展覧会' : (title || '展覧会を編集')}</div>
            <p className="ui-screen-subtitle">{isNew ? '基本情報を入れると、公開ページが作成されます。' : '変更内容は保存後に公開ページへ反映されます。'}</p>
          </div>
        </div>
        {formContent}
      </div>
    </DashShell>
  )

  return (
    <DashShell orgSlug={orgSlug} active="exs" crumbs={crumbs}>
      <div className="ui-app-card" style={{ padding: 16, margin: '14px 14px 0' }}>
        <div className="ui-kicker">{isNew ? 'NEW EXHIBITION' : 'EDIT EXHIBITION'}</div>
        <div className="ui-screen-title" style={{ marginTop: 6 }}>{isNew ? '新しい展覧会' : (title || '展覧会を編集')}</div>
        <div className="ui-screen-subtitle">{isNew ? '下の項目を入力すると、公開ページが作成されます。' : '変更は保存で反映されます。'}</div>
      </div>
      {formContent}
    </DashShell>
  )
}
