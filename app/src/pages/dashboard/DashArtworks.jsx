import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import DashShell from '../../components/DashShell'
import LoadingFrames from '../../components/LoadingFrames'
import { useDelayedLoading } from '../../lib/useDelayedLoading'
import ImageUploader from '../../components/ImageUploader'
import ArtworkCreateModal from '../../components/ArtworkCreateModal'
import ArtworkMedia from '../../components/ArtworkMedia'
import { T } from '../../lib/tokens'
import { Icon } from '../../components/Header'
import { getThumbnailUrl } from '../../lib/imageUrl'
import { persistArtworkOrder, reorderArtworksById } from '../../lib/reorderArtworks'

function DragHandleIcon() {
  const s = { stroke: 'currentColor', strokeWidth: 1.8, fill: 'none', strokeLinecap: 'round' }
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01" {...s} />
      <circle cx="8" cy="6" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="8" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="8" cy="18" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="16" cy="6" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="16" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="16" cy="18" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

export default function DashArtworks() {
  const { orgSlug, exhibitionId } = useParams()
  const [exhibition, setExhibition] = useState(null)
  const [artworks, setArtworks] = useState([])
  const [loading, setLoading] = useState(true)
  const showLoader = useDelayedLoading(loading)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [editTarget, setEditTarget] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [createFile, setCreateFile] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [draggingId, setDraggingId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)
  const [reordering, setReordering] = useState(false)
  const dragOverIdRef = useRef(null)
  const artworksRef = useRef(artworks)

  useEffect(() => {
    artworksRef.current = artworks
  }, [artworks])

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
    setDeleting(true)
    const id = deleteTarget.id
    const { error } = await supabase.from('artworks').delete().eq('id', id)
    setDeleting(false)
    if (error) {
      window.alert(`削除に失敗しました: ${error.message}`)
      return
    }
    setArtworks((prev) => prev.filter((a) => a.id !== id))
    setDeleteTarget(null)
    if (editTarget?.id === id) setEditTarget(null)
  }

  function requestDelete(work) {
    setEditTarget(null)
    setDeleteTarget(work)
  }

  function updateDragOver(targetId) {
    dragOverIdRef.current = targetId
    setDragOverId(targetId)
  }

  function clearDragState() {
    setDraggingId(null)
    setDragOverId(null)
    dragOverIdRef.current = null
  }

  function handleDragHandlePointerDown(event, artworkId) {
    if (reordering || artworks.length < 2) return
    if (event.button !== 0) return

    event.preventDefault()
    event.stopPropagation()

    const handle = event.currentTarget
    handle.setPointerCapture(event.pointerId)
    setDraggingId(artworkId)
    updateDragOver(artworkId)

    function resolveDropTarget(clientX, clientY) {
      const card = document.elementFromPoint(clientX, clientY)?.closest('[data-artwork-id]')
      return card?.dataset?.artworkId ?? null
    }

    function onPointerMove(e) {
      const targetId = resolveDropTarget(e.clientX, e.clientY)
      if (targetId) updateDragOver(targetId)
    }

    async function onPointerEnd(e) {
      handle.releasePointerCapture(e.pointerId)
      handle.removeEventListener('pointermove', onPointerMove)
      handle.removeEventListener('pointerup', onPointerEnd)
      handle.removeEventListener('pointercancel', onPointerEnd)

      const fromId = artworkId
      const toId = dragOverIdRef.current
      clearDragState()

      if (!toId || String(fromId) === String(toId) || !supabase) return

      const previous = artworksRef.current
      const reordered = reorderArtworksById(previous, fromId, toId)
      setArtworks(reordered)
      setReordering(true)

      try {
        await persistArtworkOrder(supabase, reordered)
      } catch (error) {
        setArtworks(previous)
        window.alert(`並び替えの保存に失敗しました: ${error?.message || '不明なエラー'}`)
      } finally {
        setReordering(false)
      }
    }

    handle.addEventListener('pointermove', onPointerMove)
    handle.addEventListener('pointerup', onPointerEnd)
    handle.addEventListener('pointercancel', onPointerEnd)
  }

  async function handleEditSave() {
    if (!editTarget || !supabase) return
    await supabase.from('artworks').update({ title: editTitle, description: editDesc }).eq('id', editTarget.id)
    setArtworks((prev) => prev.map((a) => a.id === editTarget.id ? { ...a, title: editTitle, description: editDesc } : a))
    setEditTarget(null)
  }

  if (showLoader) return (
    <div className="ui-page-shell" style={{ display: 'grid', placeItems: 'center' }}>
      <LoadingFrames />
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
        <div className="ui-artworks-heading-block" style={{ marginBottom: 14 }}>
          <section className="ui-app-card" style={{ padding: 18, marginBottom: 8 }}>
            <h1 className="ui-screen-title" style={{ marginTop: 7 }}>{exhibition?.title || '展覧会'}</h1>
          </section>
          <div className="ui-artworks-header-actions">
            {exhibitionId && exhibitionId !== 'undefined' && (
              <Link
                to={`/${orgSlug}/dashboard/exhibitions/${exhibitionId}/edit`}
                className="ui-inline-edit-action"
                aria-label="展覧会情報を編集"
              >
                <Icon name="edit" size={15} />
                <span>情報を編集</span>
              </Link>
            )}
            <ImageUploader
              variant="button"
              buttonClassName="ui-pill-action--accent ui-artworks-add-desktop"
              buttonLabel="作品追加"
              onBeforeUpload={handleBeforeUpload}
              onFileSelected={handleCreateFile}
            >
              <Icon name="plus" size={17} />
              <span>作品追加</span>
            </ImageUploader>
          </div>
        </div>

        {deleteTarget && (
          <div className="ui-app-card" style={{ padding: 14, marginBottom: 14, borderColor: T.accent }}>
            <div className="ui-kicker">CONFIRM DELETE</div>
            <div style={{ marginTop: 8, fontSize: 13 }}>「{deleteTarget.title || '（タイトルなし）'}」を削除します。</div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleting} className="ui-pill-action" style={{ flex: 1, background: T.paperAlt, color: T.ink }}>CANCEL</button>
              <button type="button" onClick={handleDelete} disabled={deleting} className="ui-pill-action" style={{ flex: 1, background: T.accent, opacity: deleting ? 0.6 : 1 }}>{deleting ? 'DELETING...' : 'DELETE'}</button>
            </div>
          </div>
        )}

        {artworks.length > 1 && (
          <p className="ui-artworks-sort-hint">
            グリップ（⋮⋮）をドラッグして並び順を変更できます
          </p>
        )}

        <div
          className={['ui-artworks-grid', reordering && 'ui-artworks-grid--busy'].filter(Boolean).join(' ')}
          aria-busy={reordering || undefined}
        >
          {artworks.map((w) => {
            const isDragging = String(draggingId) === String(w.id)
            const isDragOver = String(dragOverId) === String(w.id) && draggingId && !isDragging
            return (
              <div
                key={w.id}
                data-artwork-id={w.id}
                className={[
                  'ui-list-card',
                  'ui-artwork-sort-card',
                  isDragging && 'is-dragging',
                  isDragOver && 'is-drag-over',
                ].filter(Boolean).join(' ')}
              >
                {artworks.length > 1 && (
                  <button
                    type="button"
                    className="ui-artwork-drag-handle"
                    aria-label={`「${w.title || 'タイトルなし'}」の並び順を変更`}
                    disabled={reordering}
                    onPointerDown={(event) => handleDragHandlePointerDown(event, w.id)}
                  >
                    <DragHandleIcon />
                  </button>
                )}
                <button type="button" onClick={() => editWork(w)} className="ui-artwork-sort-card-media">
                  <ArtworkMedia
                    src={getThumbnailUrl(w.image_url)}
                    alt=""
                    decorative
                    loading="lazy"
                    fillHeight
                    aspectRatio="1 / 1"
                    fit="contain"
                    wrapperStyle={{ borderRadius: 7 }}
                    imageStyle={{ borderRadius: 7 }}
                  />
                </button>
                <div className="ui-artwork-sort-card-footer">
                  <div className="ui-artwork-sort-card-title">{w.title || '（タイトルなし）'}</div>
                  <button type="button" onClick={() => requestDelete(w)} className="ui-artwork-sort-card-delete">
                    削除
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        {artworks.length === 0 && <div className="ui-panel" style={{ padding: 24, color: T.inkMuted, fontFamily: T.mono, fontSize: 11 }}>作品がまだありません</div>}
      </DashShell>

      <ImageUploader
        variant="fab"
        wrapperClassName="ui-artworks-add-mobile"
        buttonLabel="作品追加"
        onBeforeUpload={handleBeforeUpload}
        onFileSelected={handleCreateFile}
      >
        <Icon name="plus" size={22} />
      </ImageUploader>

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
                wrapperStyle={{ borderRadius: 8 }}
                imageStyle={{ borderRadius: 8, maxHeight: 280, objectFit: 'contain' }}
              />
            </div>
            <div style={{ marginTop: 14 }}>
              <div className="ui-input-wrap"><input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="作品名を入力" /></div>
            </div>
            <div style={{ marginTop: 12 }}>
              <div className="ui-input-wrap" data-multiline="true"><textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={3} placeholder="説明文を入力" /></div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="button" onClick={() => setEditTarget(null)} className="ui-pill-action" style={{ flex: 1, background: T.paperAlt, color: T.ink }}>キャンセル</button>
              <button type="button" onClick={handleEditSave} className="ui-pill-action" style={{ flex: 1, background: T.accent }}>保存する</button>
            </div>
            <button
              type="button"
              onClick={() => requestDelete(editTarget)}
              className="ui-icon-button"
              style={{ marginTop: 12, width: '100%', padding: '12px', background: 'transparent', color: T.accent, border: `1px solid ${T.accent}`, fontFamily: T.mono, fontSize: 11, letterSpacing: '0.12em', cursor: 'pointer' }}
            >
              作品を削除
            </button>
          </div>
        </div>
      )}
    </>
  )
}
