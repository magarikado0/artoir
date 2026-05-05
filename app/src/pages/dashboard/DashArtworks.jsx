import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import DashShell from '../../components/DashShell'
import ImageUploader from '../../components/ImageUploader'
import { T, pad2 } from '../../lib/tokens'
import { useIsDesktop } from '../../lib/useIsDesktop'

function ListIcon({ active }) {
  const c = active ? T.ink : T.inkMuted
  return (
    <svg width="14" height="14" viewBox="0 0 14 14">
      <rect x="1" y="2"  width="12" height="1.5" fill={c} />
      <rect x="1" y="6.25" width="12" height="1.5" fill={c} />
      <rect x="1" y="10.5" width="12" height="1.5" fill={c} />
    </svg>
  )
}

function GridIcon({ active }) {
  const c = active ? T.ink : T.inkMuted
  return (
    <svg width="14" height="14" viewBox="0 0 14 14">
      <rect x="1" y="1" width="5" height="5" fill={c} />
      <rect x="8" y="1" width="5" height="5" fill={c} />
      <rect x="1" y="8" width="5" height="5" fill={c} />
      <rect x="8" y="8" width="5" height="5" fill={c} />
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
  const [viewMode, setViewMode] = useState('list')

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
      <div style={{ padding: '10px 16px', display: 'grid', gridTemplateColumns: '48px 1fr 40px', gap: 10, fontFamily: T.mono, fontSize: 9, letterSpacing: '0.14em', color: T.inkMuted, borderBottom: `0.5px solid ${T.ink}` }}>
        <span></span><span>TITLE</span><span style={{ textAlign: 'right' }}>···</span>
      </div>
      {artworks.map((w) => (
        <div key={w.id} style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '48px 1fr 40px', gap: 10, borderBottom: `0.5px solid ${T.line}`, alignItems: 'center' }}>
          <div style={{ width: 48, height: 48, background: '#D9D6CE', overflow: 'hidden', flexShrink: 0 }}>
            {w.image_url && <img src={w.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: T.serif, fontSize: 14, letterSpacing: '0.02em', color: T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.title || '（タイトルなし）'}</div>
            {w.description && <div style={{ marginTop: 2, fontSize: 10.5, color: T.inkMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.description}</div>}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 0 }}>
            <button
              onClick={() => { setEditTarget(w); setEditTitle(w.title || ''); setEditDesc(w.description || '') }}
              className="ui-icon-button"
              aria-label="作品を編集"
              style={{ background: T.paperAlt, border: `0.5px solid ${T.line}`, fontFamily: T.mono, fontSize: 13, color: T.inkMuted, cursor: 'pointer', padding: '10px 8px', minWidth: 36, minHeight: 36 }}
            >✎</button>
            <button
              onClick={() => setDeleteTarget(w)}
              className="ui-icon-button"
              aria-label="作品を削除"
              style={{ background: T.blush, border: `0.5px solid ${T.line}`, fontFamily: T.mono, fontSize: 15, color: T.accent, cursor: 'pointer', padding: '10px 8px', minWidth: 36, minHeight: 36 }}
            >⋯</button>
          </div>
        </div>
      ))}
      {artworks.length === 0 && <div style={{ padding: '24px 16px', fontFamily: T.mono, fontSize: 11, color: T.inkMuted }}>作品がまだありません</div>}
    </div>
  )

  const worksGrid = (
    <div style={{ borderTop: `1px solid ${T.ink}`, padding: isDesktop ? '16px 0' : '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(auto-fill, minmax(180px, 1fr))' : 'repeat(2, 1fr)', gap: isDesktop ? 16 : 10 }}>
        {artworks.map((w) => (
          <div key={w.id} style={{ background: T.card, border: `0.5px solid ${T.line}` }}>
            <div
              onClick={() => { setEditTarget(w); setEditTitle(w.title || ''); setEditDesc(w.description || '') }}
              style={{ width: '100%', aspectRatio: '1 / 1', background: '#D9D6CE', overflow: 'hidden', cursor: 'pointer' }}
            >
              {w.image_url && <img src={w.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
            </div>
            <div style={{ padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontFamily: T.serif, fontSize: 13, color: T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.title || '（タイトルなし）'}</div>
              </div>
              <button
                onClick={() => setDeleteTarget(w)}
                style={{ background: 'none', border: 'none', fontFamily: T.mono, fontSize: 13, color: T.inkMuted, cursor: 'pointer', padding: '2px 4px', flexShrink: 0 }}
              >⋯</button>
            </div>
          </div>
        ))}
      </div>
      {artworks.length === 0 && <div style={{ padding: '24px 0', fontFamily: T.mono, fontSize: 11, color: T.inkMuted }}>作品がまだありません</div>}
    </div>
  )

  const viewToggle = (
    <div style={{ display: 'flex', gap: 4, padding: isDesktop ? '12px 0 0' : '12px 16px 0', justifyContent: 'flex-end' }}>
      <button
        onClick={() => setViewMode('list')}
        aria-label="リスト表示"
        style={{ background: viewMode === 'list' ? T.lineSoft : 'transparent', border: `0.5px solid ${viewMode === 'list' ? T.ink : T.line}`, padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
      ><ListIcon active={viewMode === 'list'} /></button>
      <button
        onClick={() => setViewMode('grid')}
        aria-label="グリッド表示"
        style={{ background: viewMode === 'grid' ? T.lineSoft : 'transparent', border: `0.5px solid ${viewMode === 'grid' ? T.ink : T.line}`, padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
      ><GridIcon active={viewMode === 'grid'} /></button>
    </div>
  )

  const worksView = viewMode === 'grid' ? worksGrid : worksList

  const deleteConfirm = deleteTarget && (
    <div style={{ margin: isDesktop ? '24px 0' : '24px 16px', padding: 14, background: 'rgba(180,69,44,0.05)', border: `0.5px solid ${T.accent}` }}>
      <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '0.18em', color: T.accent, marginBottom: 6 }}>CONFIRM · DELETE</div>
      <div style={{ fontSize: 12, color: T.ink, lineHeight: 1.6 }}>「{deleteTarget.title || '（タイトルなし）'}」を削除します。この操作は取り消せません。</div>
      <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
          <button onClick={() => setDeleteTarget(null)} className="ui-icon-button" style={{ flex: 1, padding: '8px', background: 'transparent', border: `0.5px solid ${T.inkMuted}`, color: T.inkSoft, fontFamily: T.mono, fontSize: 10, letterSpacing: '0.14em', cursor: 'pointer' }}>CANCEL</button>
        <button onClick={handleDelete} className="ui-action" style={{ flex: 1, padding: '8px', background: T.accent, color: T.paper, border: 'none', fontFamily: T.mono, fontSize: 10, letterSpacing: '0.14em', cursor: 'pointer' }}>DELETE ✕</button>
      </div>
    </div>
  )

  const editModal = editTarget && (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(17,17,16,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: T.paper, width: '100%', maxWidth: 480, padding: 24, maxHeight: 'calc(100vh - 40px)', overflowY: 'auto' }}>
        <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.inkMuted, marginBottom: 16 }}>EDIT WORK · {pad2(artworks.findIndex((a) => a.id === editTarget.id) + 1)}</div>
        {editTarget.image_url && (
          <div style={{ marginBottom: 16, background: '#D9D6CE', display: 'flex', alignItems: 'center', justifyContent: 'center', maxHeight: 280, overflow: 'hidden' }}>
            <img src={editTarget.image_url} alt="" style={{ width: '100%', maxHeight: 280, objectFit: 'contain', display: 'block' }} />
          </div>
        )}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '0.18em', color: T.inkMuted, marginBottom: 6 }}>TITLE</div>
          <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${T.ink}`, fontFamily: T.sans, fontSize: 13, color: T.ink, background: T.card, boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '0.18em', color: T.inkMuted, marginBottom: 6 }}>DESCRIPTION</div>
          <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={3} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${T.ink}`, fontFamily: T.sans, fontSize: 13, color: T.ink, background: T.card, resize: 'vertical', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setEditTarget(null)} className="ui-icon-button" style={{ flex: 1, padding: '12px', background: 'transparent', border: `1px solid ${T.ink}`, fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em', cursor: 'pointer', color: T.ink }}>CANCEL</button>
          <button onClick={handleEditSave} className="ui-action" style={{ flex: 1, padding: '12px', background: T.accent, color: T.paper, border: 'none', fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em', cursor: 'pointer' }}>SAVE ↩</button>
        </div>
      </div>
    </div>
  )

  if (isDesktop) return (
    <>
      <DashShell orgSlug={orgSlug} active="exs">
        <div style={{ padding: '36px 0 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `1px solid ${T.ink}` }}>
          <div>
            <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.inkMuted, marginBottom: 8 }}>{exhibition?.title || '...'}</div>
            <div style={{ fontFamily: T.serif, fontSize: 44, letterSpacing: '0.01em', lineHeight: 1.05, color: T.ink }}>作品管理</div>
          </div>
          <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.14em', color: T.inkMuted }}>{pad2(artworks.length)} WORKS</div>
        </div>
        {uploadArea}
        {viewToggle}
        {worksView}
        {deleteConfirm}
        <div style={{ height: 60 }} />
      </DashShell>
      {editModal}
    </>
  )

  return (
    <>
      <DashShell orgSlug={orgSlug} active="exs">
        <div style={{ padding: '20px 16px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.inkMuted }}>{exhibition?.title || '...'}</div>
            <div style={{ marginTop: 6, fontFamily: T.serif, fontSize: 22, letterSpacing: '0.02em', color: T.ink }}>作品管理</div>
            <div style={{ marginTop: 4, fontFamily: T.mono, fontSize: 10, letterSpacing: '0.14em', color: T.inkMuted }}>{pad2(artworks.length)} WORKS</div>
          </div>
        </div>
        {uploadArea}
        {viewToggle}
        {worksView}
        {deleteConfirm}
        <div style={{ height: 40 }} />
      </DashShell>
      {editModal}
    </>
  )
}
