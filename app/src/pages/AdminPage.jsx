import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Header from '../components/Header'
import ImageUploader from '../components/ImageUploader'
import ArtworkMedia from '../components/ArtworkMedia'

const GAP = 'clamp(2rem, 5vw, 5rem)'

export default function AdminPage() {
  const { orgSlug } = useParams()
  const [org, setOrg] = useState(null)
  const [exhibitions, setExhibitions] = useState([])
  const [selectedExhId, setSelectedExhId] = useState('')
  const [artworks, setArtworks] = useState([])
  const [form, setForm] = useState({ title: '', description: '', image_url: '' })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
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
          .eq('org_id', orgData.id)
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

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f0e8' }}>
      <span style={{ fontFamily: 'Cormorant Garamond, serif', color: '#9a9088', letterSpacing: '0.2em', fontSize: '0.8rem' }}>...</span>
    </div>
  )

  return (
    <div style={{ background: '#f5f0e8', minHeight: '100vh' }}>
      <Header orgName={org?.name} orgSlug={orgSlug} />

      <div style={{ padding: `calc(${GAP} * 1.5) ${GAP}`, maxWidth: '800px' }}>
        {loadError && (
          <p style={{ fontSize: '0.85rem', color: '#c0392b', marginBottom: '1rem' }}>{loadError}</p>
        )}
        {!org && !loadError && (
          <p style={{ fontSize: '0.85rem', color: '#9a9088', marginBottom: '1rem' }}>団体が見つかりません</p>
        )}
        <div style={{
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: '0.65rem',
          letterSpacing: '0.35em',
          textTransform: 'uppercase',
          color: '#c0392b',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <span style={{ display: 'block', width: '2rem', height: '1px', background: '#c0392b' }} />
          管理画面
        </div>

        {/* 展覧会選択 */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ fontSize: '0.75rem', letterSpacing: '0.1em', color: '#9a9088', display: 'block', marginBottom: '0.5rem' }}>
            展覧会
          </label>
          <select
            value={selectedExhId}
            onChange={(e) => setSelectedExhId(e.target.value)}
            style={{
              padding: '0.6rem 1rem',
              border: '1px solid rgba(26,22,18,0.2)',
              background: 'transparent',
              fontFamily: 'Noto Serif JP, serif',
              fontSize: '0.9rem',
              color: '#1a1612',
              width: '100%',
              outline: 'none',
            }}
          >
            {exhibitions.map((exh) => (
              <option key={exh.id} value={exh.id}>{exh.title}</option>
            ))}
          </select>
        </div>

        {/* 作品追加フォーム */}
        <form onSubmit={handleSubmit} style={{ borderTop: '1px solid rgba(26,22,18,0.1)', paddingTop: '2rem', marginBottom: '3rem' }}>
          <div style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: '0.7rem',
            letterSpacing: '0.2em',
            color: '#1a1612',
            marginBottom: '1.5rem',
          }}>
            作品を追加
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input
              type="text"
              placeholder="タイトル *"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              style={{ padding: '0.75rem 1rem', border: '1px solid rgba(26,22,18,0.2)', background: 'transparent', fontFamily: 'Noto Serif JP, serif', fontSize: '0.9rem', outline: 'none', color: '#1a1612' }}
            />
            <textarea
              placeholder="説明"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              style={{ padding: '0.75rem 1rem', border: '1px solid rgba(26,22,18,0.2)', background: 'transparent', fontFamily: 'Noto Serif JP, serif', fontSize: '0.9rem', outline: 'none', color: '#1a1612', resize: 'vertical' }}
            />
            <ImageUploader onUploaded={(url) => setForm((prev) => ({ ...prev, image_url: url }))} />
            {form.image_url && (
              <ArtworkMedia
                src={form.image_url}
                alt=""
                decorative
                loading="eager"
                fit="contain"
                minHeight={120}
                wrapperStyle={{ maxHeight: '200px', border: '1px solid rgba(26,22,18,0.1)' }}
                imageStyle={{ objectFit: 'contain', maxHeight: '200px' }}
              />
            )}
            {message && (
              <p style={{ fontSize: '0.8rem', color: message.includes('失敗') ? '#c0392b' : '#3d7a3d' }}>{message}</p>
            )}
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '0.75rem',
                background: '#1a1612',
                color: '#f5f0e8',
                border: 'none',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontFamily: 'Cormorant Garamond, serif',
                fontSize: '0.8rem',
                letterSpacing: '0.2em',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? '保存中...' : '保存する'}
            </button>
          </div>
        </form>

        {/* 作品一覧 */}
        <div style={{ borderTop: '1px solid rgba(26,22,18,0.1)', paddingTop: '2rem' }}>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '0.7rem', letterSpacing: '0.2em', color: '#1a1612', marginBottom: '1.5rem' }}>
            登録済みの作品 ({artworks.length})
          </div>
          {artworks.map((artwork) => (
            <div key={artwork.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem 0',
              borderBottom: '1px solid rgba(26,22,18,0.08)',
            }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0 }}>
                <ArtworkMedia
                  src={artwork.image_url}
                  alt=""
                  decorative
                  loading="lazy"
                  fillHeight
                  wrapperStyle={{ width: '100%', height: '100%' }}
                  imageStyle={{ objectFit: 'cover' }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Shippori Mincho, serif', fontSize: '0.95rem', color: '#1a1612' }}>{artwork.title}</div>
                {artwork.description && (
                  <div style={{ fontSize: '0.75rem', color: '#9a9088', marginTop: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{artwork.description}</div>
                )}
              </div>
              <button
                onClick={() => handleDelete(artwork.id)}
                style={{ fontSize: '0.7rem', color: '#c0392b', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
              >
                削除
              </button>
            </div>
          ))}
          {artworks.length === 0 && (
            <p style={{ fontSize: '0.85rem', color: '#9a9088' }}>まだ作品がありません</p>
          )}
        </div>
      </div>
    </div>
  )
}
