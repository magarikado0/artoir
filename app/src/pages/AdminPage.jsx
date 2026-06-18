import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Header from '../components/Header'
import ImageUploader from '../components/ImageUploader'
import LoadingFrames from '../components/LoadingFrames'
import { useDelayedLoading } from '../lib/useDelayedLoading'
import ArtworkMedia from '../components/ArtworkMedia'
import { T } from '../lib/tokens'
import { getThumbnailUrl } from '../lib/imageUrl'

export default function AdminPage() {
  const { orgSlug } = useParams()
  const [org, setOrg] = useState(null)
  const [exhibitions, setExhibitions] = useState([])
  const [selectedExhId, setSelectedExhId] = useState('')
  const [artworks, setArtworks] = useState([])
  const [form, setForm] = useState({ title: '', description: '', image_url: '' })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const showLoader = useDelayedLoading(loading)
  const [loadError, setLoadError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let isCancelled = false
    async function load() {
      setLoading(true)
      setLoadError('')
      if (!supabase) {
        if (isCancelled) return
        setOrg(null)
        setExhibitions([])
        setSelectedExhId('')
        setArtworks([])
        setLoadError('Supabase が未設定です')
        setLoading(false)
        return
      }

      try {
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('slug', orgSlug)
          .single()
        if (orgError) throw orgError

        if (!orgData) {
          if (isCancelled) return
          setOrg(null)
          setExhibitions([])
          setSelectedExhId('')
          setArtworks([])
          return
        }

        if (isCancelled) return
        setOrg(orgData)

        const { data: exhData, error: exhError } = await supabase
          .from('exhibitions')
          .select('*')
          .eq('organization_id', orgData.id)
          .order('start_date', { ascending: false })
        if (exhError) throw exhError
        if (isCancelled) return
        setExhibitions(exhData || [])
        if (exhData?.length > 0) {
          setSelectedExhId(exhData[0].id)
        } else {
          setSelectedExhId('')
          setArtworks([])
        }
      } catch (error) {
        if (isCancelled) return
        setOrg(null)
        setExhibitions([])
        setSelectedExhId('')
        setArtworks([])
        setLoadError(error?.message || 'データの取得に失敗しました')
      } finally {
        if (!isCancelled) setLoading(false)
      }
    }
    load()
    return () => {
      isCancelled = true
    }
  }, [orgSlug])

  useEffect(() => {
    if (!selectedExhId) {
      setArtworks([])
      return
    }

    let isCancelled = false
    async function loadArtworks() {
      if (!supabase) {
        if (!isCancelled) {
          setArtworks([])
          setLoadError('Supabase が未設定です')
        }
        return
      }

      try {
        const { data, error } = await supabase
          .from('artworks')
          .select('*')
          .eq('exhibition_id', selectedExhId)
          .order('order')

        if (error) throw error
        if (isCancelled) return
        setArtworks(data || [])
        setLoadError('')
        setMessage('')
      } catch (error) {
        if (isCancelled) return
        setArtworks([])
        setMessage('作品一覧の取得に失敗しました: ' + (error?.message || '不明なエラー'))
      }
    }

    loadArtworks()
    return () => {
      isCancelled = true
    }
  }, [selectedExhId])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!selectedExhId) return
    if (!supabase) {
      setMessage('Supabase が未設定です')
      return
    }

    setSaving(true)
    setMessage('')
    try {
      const maxOrder = artworks.reduce((max, artwork) => {
        const current = Number(artwork.order)
        return Number.isFinite(current) ? Math.max(max, current) : max
      }, -1)

      const { error } = await supabase.from('artworks').insert({
        exhibition_id: selectedExhId,
        title: form.title,
        description: form.description,
        image_url: form.image_url,
        order: maxOrder + 1,
      })
      if (error) {
        setMessage('保存に失敗しました: ' + error.message)
      } else {
        setMessage('保存しました')
        setForm({ title: '', description: '', image_url: '' })
        const { data, error: fetchError } = await supabase
          .from('artworks')
          .select('*')
          .eq('exhibition_id', selectedExhId)
          .order('order')

        if (fetchError) {
          setMessage('保存後の再取得に失敗しました: ' + fetchError.message)
        } else {
          setArtworks(data || [])
        }
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!supabase) {
      setMessage('Supabase が未設定です')
      return
    }

    setMessage('')
    const { error } = await supabase.from('artworks').delete().eq('id', id)
    if (error) {
      setMessage('削除に失敗しました: ' + error.message)
      return
    }

    setArtworks((prev) => prev.filter((a) => a.id !== id))
    setMessage('削除しました')
  }

  if (showLoader) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f0e8' }}>
      <LoadingFrames />
    </div>
  )

  return (
    <div className="ui-page-shell">
      <Header activeTab="account" />

      <main className="ui-app-main" style={{ maxWidth: 820 }}>
        {loadError && (
          <div className="ui-alert ui-alert--error" style={{ marginBottom: 16 }}>{loadError}</div>
        )}
        {!org && !loadError && (
          <div className="ui-panel" style={{ color: T.inkMuted, fontSize: 14 }}>公開ページが見つかりません</div>
        )}

        {org && (
          <>
            <div className="ui-hero-screen-heading" style={{ marginBottom: 24 }}>
              <div className="ui-kicker">管理画面</div>
              <h1 className="ui-screen-title" style={{ marginTop: 6 }}>{org.name}</h1>
            </div>

            <div className="ui-form-field">
              <div className="ui-form-label">展覧会</div>
              <div className="ui-input-wrap">
                <select
                  value={selectedExhId}
                  onChange={(e) => setSelectedExhId(e.target.value)}
                  style={{ width: '100%', border: 0, background: 'transparent', outline: 'none', padding: '13px 14px', fontSize: 14, color: T.ink }}
                >
                  {exhibitions.map((exh) => (
                    <option key={exh.id} value={exh.id}>{exh.title}</option>
                  ))}
                </select>
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ borderTop: `1px solid ${T.lineSoft}`, paddingTop: 28, marginTop: 32, marginBottom: 40 }}>
              <div className="ui-section-label" style={{ marginTop: 0 }}>作品を追加</div>
              <div className="ui-form-field">
                <div className="ui-form-label">タイトル</div>
                <div className="ui-input-wrap">
                  <input type="text" placeholder="タイトル" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
              </div>
              <div className="ui-form-field">
                <div className="ui-form-label">説明</div>
                <div className="ui-input-wrap" data-multiline="true">
                  <textarea placeholder="説明" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
                </div>
              </div>
              <div className="ui-form-field">
                <div className="ui-form-label">画像</div>
                <ImageUploader onUploaded={(url) => setForm((prev) => ({ ...prev, image_url: url }))} />
              </div>
              {form.image_url && (
                <ArtworkMedia
                  src={form.image_url}
                  alt=""
                  decorative
                  loading="eager"
                  fit="contain"
                  minHeight={120}
                  wrapperStyle={{ maxHeight: 200, borderRadius: 6, border: `1px solid ${T.lineSoft}` }}
                  imageStyle={{ objectFit: 'contain', maxHeight: 200, borderRadius: 6 }}
                />
              )}
              {message && (
                <div className={`ui-alert ${message.includes('失敗') ? 'ui-alert--error' : 'ui-alert--success'}`} style={{ marginTop: 12 }}>{message}</div>
              )}
              <button type="submit" disabled={saving} className="ui-btn ui-btn--primary ui-btn-block" style={{ marginTop: 16 }}>
                {saving ? '保存中…' : '保存する'}
              </button>
            </form>

            <div style={{ borderTop: `1px solid ${T.lineSoft}`, paddingTop: 28 }}>
              <div className="ui-section-label" style={{ marginTop: 0 }}>登録済みの作品 ({artworks.length})</div>
              {artworks.map((artwork) => (
                <div key={artwork.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: `1px solid ${T.lineSoft}` }}>
                  <div style={{ width: 56, height: 56, borderRadius: 4, overflow: 'hidden', flexShrink: 0 }}>
                    <ArtworkMedia
                      src={getThumbnailUrl(artwork.image_url, 60)}
                      alt=""
                      decorative
                      loading="lazy"
                      fit="cover"
                      wrapperStyle={{ width: '100%', height: '100%' }}
                      imageStyle={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: T.serif, fontSize: 14, color: T.ink }}>{artwork.title}</div>
                    {artwork.description && (
                      <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{artwork.description}</div>
                    )}
                  </div>
                  <button onClick={() => handleDelete(artwork.id)} className="ui-btn ui-btn--danger" style={{ minHeight: 36, padding: '0 14px', fontSize: 12 }}>
                    削除
                  </button>
                </div>
              ))}
              {artworks.length === 0 && (
                <p style={{ fontSize: 13, color: T.inkMuted }}>まだ作品がありません</p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
