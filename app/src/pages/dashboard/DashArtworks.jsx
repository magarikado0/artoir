import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import DashShell from '../../components/DashShell'
import ImageUploader from '../../components/ImageUploader'
import ArtworkCreateModal from '../../components/ArtworkCreateModal'
import ArtworkMedia from '../../components/ArtworkMedia'
import { T, pad2 } from '../../lib/tokens'
import { Icon } from '../../components/Header'
import { getExhibitionThumbnailUrl } from '../../lib/exhibition'
import { getThumbnailUrl } from '../../lib/imageUrl'

export default function DashArtworks() {
  const { orgSlug, exhibitionId } = useParams()
  const [exhibition, setExhibition] = useState(null)
  const [artworks, setArtworks] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [editTarget, setEditTarget] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [createFile, setCreateFile] = useState(null)
  const thumbnailUrl = getExhibitionThumbnailUrl(exhibition)

  useEffect(() => {
    if (!supabase || !exhibitionId || exhibitionId === 'undefined') return setLoading(false)
    async function load() {
      try {
        const { data: exh } = await supabase.from('exhibitions').select('*').eq('id', exhibitionId).single()
        setExhibition(exh)
        const { data: works } = await supabase.from('artworks').select('*').eq('exhibition_id', exhibitionId).order('order')
        setArtworks(works || [])
      } catch {
        /* unavailable */
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [exhibitionId])

  function handleBeforeUpload(file) {
    const dup = artworks.find((a) => a.file_name === file.name && Number(a.file_size) === file.size)
    if (dup) return window.confirm(`同じファイル「${file.name}」がこの展覧会に既に登録されています。続行しますか？`)
    return true
  }

  function handleCreateFile(file) {
    setCreateFile(file)
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
    <div className="ui-page-shell" style={{ display: 'grid', placeItems: 'center' }}>
      <span style={{ fontFamily: T.mono, color: T.inkMuted, fontSize: 11 }}>...</span>
    </div>
  )

  const editWork = (w) => {
    setEditTarget(w)
    setEditTitle(w.title || '')
    setEditDesc(w.description || '')
  }

  return (
    <>
      <DashShell orgSlug={orgSlug} >
        <section className="ui-app-card" style={{ padding: 18, marginBottom: 14 }}>
          <div className="ui-kicker">{exhibition?.title || 'WORKS'}</div>
          <div className="ui-app-topline" style={{ marginTop: 8, marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <ArtworkMedia
                src={getThumbnailUrl(thumbnailUrl, 56)}
                alt={exhibition?.title || '展覧会サムネイル'}
                label={exhibition?.title || '展覧会サムネイル'}
                loading="eager"
                fit="cover"
                aspectRatio="1 / 1"
                wrapperStyle={{ width: 56, borderRadius: 8, flexShrink: 0 }}
                imageStyle={{ borderRadius: 8 }}
              />
              <div style={{ minWidth: 0 }}>
                <h1 className="ui-screen-title">作品管理</h1>
                <p className="ui-screen-subtitle">{pad2(artworks.length)} works</p>
              </div>
            </div>
          </div>
        </section>

        <div style={{ marginBottom: 14 }}>
          <ImageUploader onBeforeUpload={handleBeforeUpload} onFileSelected={handleCreateFile}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="ui-mini-badge"><Icon name="plus" size={15} /> UPLOAD</span>
              <span style={{ fontFamily: T.serif, fontSize: 16, color: T.ink }}>作品を追加</span>
            </div>
          </ImageUploader>
        </div>

        {deleteTarget && (
          <div className="ui-app-card" style={{ padding: 14, marginBottom: 14, borderColor: T.accent }}>
            <div className="ui-kicker">CONFIRM DELETE</div>
            <div style={{ marginTop: 8, fontSize: 13 }}>「{deleteTarget.title || '（タイトルなし）'}」を削除します。</div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button onClick={() => setDeleteTarget(null)} className="ui-pill-action" style={{ flex: 1, background: T.paperAlt, color: T.ink }}>CANCEL</button>
              <button onClick={handleDelete} className="ui-pill-action" style={{ flex: 1, background: T.accent }}>DELETE</button>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
          {artworks.map((w) => (
            <div key={w.id} className="ui-list-card" style={{ padding: 8 }}>
              <button type="button" onClick={() => editWork(w)} style={{ width: '100%', border: 0, padding: 0, background: 'transparent', cursor: 'pointer' }}>
                <ArtworkMedia
                  src={getThumbnailUrl(w.image_url)}
                  alt=""
                  decorative
                  loading="lazy"
                  fillHeight
                  aspectRatio="1 / 1"
                  wrapperStyle={{ borderRadius: 7 }}
                  imageStyle={{ borderRadius: 7 }}
                />
              </button>
              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', gap: 6, alignItems: 'center' }}>
                <div style={{ fontFamily: T.serif, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.title || '（タイトルなし）'}</div>
                <button onClick={() => setDeleteTarget(w)} style={{ border: 0, background: 'transparent', color: T.inkMuted, cursor: 'pointer', padding: 6 }}>...</button>
              </div>
            </div>
          ))}
        </div>
        {artworks.length === 0 && <div className="ui-panel" style={{ padding: 24, color: T.inkMuted, fontFamily: T.mono, fontSize: 11 }}>作品がまだありません</div>}
      </DashShell>

      <ArtworkCreateModal
        open={Boolean(createFile)}
        file={createFile}
        exhibitionId={exhibitionId}
        nextOrder={artworks.length > 0 ? Math.max(...artworks.map((a) => a.order ?? 0)) + 1 : 1}
        onClose={() => setCreateFile(null)}
        onCreated={(newWork) => {
          if (!newWork) return
          setArtworks((prev) => [...prev, newWork])
          setCreateFile(null)
        }}
      />

      {editTarget && (
        <div role="dialog" aria-modal="true" aria-labelledby="edit-work-title" style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(17,17,16,0.44)', display: 'grid', placeItems: 'center', padding: 16 }}>
          <div className="ui-app-card" style={{ width: 'min(100%, 480px)', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', padding: 18 }}>
            <div id="edit-work-title" className="ui-kicker">EDIT WORK</div>
            <div style={{ marginTop: 12 }}>
              <ArtworkMedia
                src={editTarget.image_url}
                alt=""
                decorative
                loading="eager"
                fit="contain"
                minHeight={160}
                wrapperStyle={{ borderRadius: 8, background: T.surfaceMuted }}
                imageStyle={{ borderRadius: 8, maxHeight: 280, objectFit: 'contain' }}
              />
            </div>
            <div style={{ marginTop: 14 }}>
              <div className="ui-form-label">TITLE</div>
              <div className="ui-input-wrap"><input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} /></div>
            </div>
            <div style={{ marginTop: 12 }}>
              <div className="ui-form-label">DESCRIPTION</div>
              <div className="ui-input-wrap" data-multiline="true"><textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={3} /></div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={() => setEditTarget(null)} className="ui-pill-action" style={{ flex: 1, background: T.paperAlt, color: T.ink }}>CANCEL</button>
              <button onClick={handleEditSave} className="ui-pill-action" style={{ flex: 1, background: T.accent }}>SAVE</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
