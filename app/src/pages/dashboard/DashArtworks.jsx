import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import DashShell from '../../components/DashShell'
import ImageUploader from '../../components/ImageUploader'
import { T, pad2 } from '../../lib/tokens'
import { useIsDesktop } from '../../lib/useIsDesktop'

function DragHandle() {
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" style={{ flexShrink: 0, cursor: 'grab' }}>
      <circle cx="2.5" cy="2.5"  r="1" fill={T.inkMuted} />
      <circle cx="7.5" cy="2.5"  r="1" fill={T.inkMuted} />
      <circle cx="2.5" cy="7"    r="1" fill={T.inkMuted} />
      <circle cx="7.5" cy="7"    r="1" fill={T.inkMuted} />
      <circle cx="2.5" cy="11.5" r="1" fill={T.inkMuted} />
      <circle cx="7.5" cy="11.5" r="1" fill={T.inkMuted} />
    </svg>
  )
}

export default function DashArtworks() {
  const { orgSlug, exhibitionId } = useParams()
  const isDesktop = useIsDesktop()

  const [exhibition, setExhibition] = useState(null)
  const [artworks, setArtworks] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [editTarget, setEditTarget] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')

  useEffect(() => {
    if (!supabase || !exhibitionId || exhibitionId === 'undefined') return setLoading(false)
    async function load() {
      try {
        const { data: exh } = await supabase.from('exhibitions').select('*').eq('id', exhibitionId).single()
        setExhibition(exh)
        const { data: works } = await supabase.from('artworks').select('*').eq('exhibition_id', exhibitionId).order('order')
        setArtworks(works || [])
      } catch { /* unavailable */ } finally { setLoading(false) }
    }
    load()
  }, [exhibitionId])

  function handleBeforeUpload(file) {
    const dup = artworks.find((a) => a.file_name === file.name && Number(a.file_size) === file.size)
    if (dup) {
      return window.confirm(`同じファイル「${file.name}」がこの展覧会に既に登録されています。続行しますか？`)
    }
    return true
  }

  async function handleUploaded(cloudinaryUrl, meta = {}) {
    if (!supabase || !exhibitionId) return
    const maxOrder = artworks.length > 0 ? Math.max(...artworks.map((a) => a.order ?? 0)) : 0
    const { data: newWork } = await supabase
      .from('artworks')
      .insert({
        exhibition_id: exhibitionId,
        image_url: cloudinaryUrl,
        title: '',
        order: maxOrder + 1,
        file_name: meta.fileName || null,
        file_size: meta.fileSize || null,
      })
      .select()
      .single()
    if (newWork) {
      setArtworks((prev) => [...prev, newWork])
      setEditTarget(newWork)
      setEditTitle('')
      setEditDesc('')
    }
  }

  async function handleDelete() {
    if (!deleteTarget || !supabase) return
    await supabase.from('artworks').delete().eq('id', deleteTarget.id)
    setArtworks((prev) => prev.filter((a) => a.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  async function handleEditSave() {
    if (!editTarget || !supabase) return
    await supabase.from('artworks').update({ title: editTitle, description: editDesc }).eq('id', editTarget.id)
    setArtworks((prev) => prev.map((a) => a.id === editTarget.id ? { ...a, title: editTitle, description: editDesc } : a))
    setEditTarget(null)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.paper }}>
      <span style={{ fontFamily: T.mono, color: T.inkMuted, fontSize: 11 }}>...</span>
    </div>
  )

  const crumbs = ['DASHBOARD', 'EXHIBITIONS', exhibition?.title || '...', 'WORKS']

  const uploadArea = (
    <div style={{ padding: isDesktop ? '20px 0' : '0 16px 16px' }}>
      <ImageUploader onUploaded={handleUploaded} onBeforeUpload={handleBeforeUpload}>
        <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.inkMuted, marginBottom: 8 }}>＋ UPLOAD</div>
        <div style={{ fontFamily: T.serif, fontSize: 16, letterSpacing: '0.02em', color: T.ink, marginBottom: 14 }}>作品を追加</div>
      </ImageUploader>
    </div>
  )

  const worksList = (
    <div style={{ borderTop: `1px solid ${T.ink}` }}>
      <div style={{ padding: '10px 16px', display: 'grid', gridTemplateColumns: '24px 48px 1fr 40px', gap: 10, fontFamily: T.mono, fontSize: 9, letterSpacing: '0.14em', color: T.inkMuted, borderBottom: `0.5px solid ${T.ink}` }}>
        <span>#</span><span></span><span>TITLE</span><span style={{ textAlign: 'right' }}>···</span>
      </div>
      {artworks.map((w, i) => (
        <div key={w.id} style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '24px 48px 1fr 40px', gap: 10, borderBottom: `0.5px solid ${T.line}`, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: T.mono, fontSize: 11, color: T.inkMuted }}>
            <DragHandle />
            {pad2(i + 1)}
          </div>
          <div style={{ width: 48, height: 48, background: '#D9D6CE', overflow: 'hidden', flexShrink: 0 }}>
            {w.image_url && <img src={w.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: T.serif, fontSize: 14, letterSpacing: '0.02em', color: T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.title || '（タイトルなし）'}</div>
            {w.description && <div style={{ marginTop: 2, fontSize: 10.5, color: T.inkMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.description}</div>}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
            <button
              onClick={() => { setEditTarget(w); setEditTitle(w.title || ''); setEditDesc(w.description || '') }}
              style={{ background: 'none', border: 'none', fontFamily: T.mono, fontSize: 11, color: T.inkMuted, cursor: 'pointer', padding: '4px' }}
            >✎</button>
            <button
              onClick={() => setDeleteTarget(w)}
              style={{ background: 'none', border: 'none', fontFamily: T.mono, fontSize: 13, color: T.inkMuted, cursor: 'pointer', padding: '4px' }}
            >⋯</button>
          </div>
        </div>
      ))}
      {artworks.length === 0 && <div style={{ padding: '24px 16px', fontFamily: T.mono, fontSize: 11, color: T.inkMuted }}>作品がまだありません</div>}
    </div>
  )

  const deleteConfirm = deleteTarget && (
    <div style={{ margin: isDesktop ? '24px 0' : '24px 16px', padding: 14, background: 'rgba(180,69,44,0.05)', border: `0.5px solid ${T.accent}` }}>
      <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '0.18em', color: T.accent, marginBottom: 6 }}>CONFIRM · DELETE</div>
      <div style={{ fontSize: 12, color: T.ink, lineHeight: 1.6 }}>「{deleteTarget.title || '（タイトルなし）'}」を削除します。この操作は取り消せません。</div>
      <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
        <button onClick={() => setDeleteTarget(null)} style={{ flex: 1, padding: '8px', background: 'transparent', border: `0.5px solid ${T.inkMuted}`, color: T.inkSoft, fontFamily: T.mono, fontSize: 10, letterSpacing: '0.14em', cursor: 'pointer' }}>CANCEL</button>
        <button onClick={handleDelete} style={{ flex: 1, padding: '8px', background: T.accent, color: T.paper, border: 'none', fontFamily: T.mono, fontSize: 10, letterSpacing: '0.14em', cursor: 'pointer' }}>DELETE ✕</button>
      </div>
    </div>
  )

  const editModal = editTarget && (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(17,17,16,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: T.paper, width: '100%', maxWidth: 480, padding: 24 }}>
        <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.inkMuted, marginBottom: 16 }}>EDIT WORK · {pad2(artworks.findIndex((a) => a.id === editTarget.id) + 1)}</div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '0.18em', color: T.inkMuted, marginBottom: 6 }}>TITLE</div>
          <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${T.ink}`, fontFamily: T.sans, fontSize: 13, color: T.ink, background: T.card, boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '0.18em', color: T.inkMuted, marginBottom: 6 }}>DESCRIPTION</div>
          <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={3} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${T.ink}`, fontFamily: T.sans, fontSize: 13, color: T.ink, background: T.card, resize: 'vertical', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setEditTarget(null)} style={{ flex: 1, padding: '12px', background: 'transparent', border: `1px solid ${T.ink}`, fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em', cursor: 'pointer', color: T.ink }}>CANCEL</button>
          <button onClick={handleEditSave} style={{ flex: 1, padding: '12px', background: T.ink, color: T.paper, border: 'none', fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em', cursor: 'pointer' }}>SAVE ↩</button>
        </div>
      </div>
    </div>
  )

  if (isDesktop) return (
    <>
      <DashShell orgSlug={orgSlug} active="exs" crumbs={crumbs}>
        <div style={{ padding: '36px 0 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `1px solid ${T.ink}` }}>
          <div>
            <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.inkMuted, marginBottom: 8 }}>{exhibition?.title || '...'}</div>
            <div style={{ fontFamily: T.serif, fontSize: 32, letterSpacing: '0.01em', color: T.ink }}>作品管理</div>
          </div>
          <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.14em', color: T.inkMuted }}>{pad2(artworks.length)} WORKS</div>
        </div>
        {uploadArea}
        {worksList}
        {deleteConfirm}
        <div style={{ height: 60 }} />
      </DashShell>
      {editModal}
    </>
  )

  return (
    <>
      <DashShell orgSlug={orgSlug} active="exs" crumbs={crumbs}>
        <div style={{ padding: '20px 16px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.inkMuted }}>{exhibition?.title || '...'}</div>
            <div style={{ marginTop: 6, fontFamily: T.serif, fontSize: 22, letterSpacing: '0.02em', color: T.ink }}>作品管理</div>
            <div style={{ marginTop: 4, fontFamily: T.mono, fontSize: 10, letterSpacing: '0.14em', color: T.inkMuted }}>{pad2(artworks.length)} WORKS</div>
          </div>
        </div>
        {uploadArea}
        {worksList}
        {deleteConfirm}
        <div style={{ height: 40 }} />
      </DashShell>
      {editModal}
    </>
  )
}
