import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ArtworkMedia from './ArtworkMedia'
import { getWallThumbnailUrl } from '../lib/imageUrl'
import {
  clampPlacement,
  completeExhibitionLayout,
  exhibitionCanvasHeight,
} from '../lib/exhibitionLayout'

const LayoutTile = memo(function LayoutTile({ artwork, item, selected, canvasWidth, onSelect, onMoveStart, onResizeStart, onContextMenu, onMenuKeyDown }) {
  return (
    <div
      className={`ui-layout-editor-item${selected ? ' is-selected' : ''}`}
      tabIndex={0}
      role="button"
      aria-label={`${artwork.title || 'タイトルなし'}を選択`}
      style={{
        width: item.width * canvasWidth,
        height: item.height * canvasWidth,
        zIndex: item.z_index,
        transform: `translate3d(${item.x * canvasWidth}px, ${item.y * canvasWidth}px, 0) rotate(${item.rotation}deg)`,
      }}
      onPointerDown={(event) => onMoveStart(event, item)}
      onClick={() => onSelect(item.artwork_id)}
      onContextMenu={(event) => onContextMenu(event, item)}
      onKeyDown={(event) => onMenuKeyDown(event, item)}
      data-layout-artwork-id={item.artwork_id}
    >
      <ArtworkMedia
        src={getWallThumbnailUrl(artwork.image_url)}
        alt=""
        decorative
        loading="lazy"
        fillHeight
        fit="contain"
        wrapperStyle={{ width: '100%', height: '100%', background: '#F2EEE7' }}
        imageStyle={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
      {selected && (
        <button
          type="button"
          className="ui-layout-resize-handle"
          aria-label="作品の表示サイズを変更"
          onPointerDown={(event) => onResizeStart(event, item)}
        />
      )}
    </div>
  )
})

function placementsEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right)
}

export default function ExhibitionLayoutEditor({ exhibitionId, artworks, supabase, onRequestAdd, onEditArtwork, onDeleteArtwork }) {
  const canvasRef = useRef(null)
  const canvasPressRef = useRef(null)
  const menuRef = useRef(null)
  const artworksRef = useRef(artworks)
  const draftRef = useRef([])
  const historyRef = useRef({ past: [], future: [] })
  const [canvasWidth, setCanvasWidth] = useState(900)
  const [draft, setDraft] = useState([])
  const [historyStatus, setHistoryStatus] = useState({ canUndo: false, canRedo: false })
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [contextMenu, setContextMenu] = useState(null)

  const artworkById = useMemo(() => new Map(artworks.map((artwork) => [String(artwork.id), artwork])), [artworks])
  const resolvedDraft = useMemo(() => completeExhibitionLayout(artworks, draft), [artworks, draft])
  const hasUnplacedNewArtwork = artworks.some((artwork) => !draft.some((item) => String(item.artwork_id) === String(artwork.id)))

  useEffect(() => {
    artworksRef.current = artworks
  }, [artworks])

  useEffect(() => {
    let active = true
    async function load() {
      const { data, error } = await supabase
        .from('exhibition_artwork_layouts')
        .select('*')
        .eq('exhibition_id', exhibitionId)
        .order('z_index')
      if (!active) return
      if (error) {
        setMessage('配置テーブルを読み込めません。SQLの適用を確認してください。')
      }
      const currentArtworks = artworksRef.current
      const complete = completeExhibitionLayout(currentArtworks, data || [])
      draftRef.current = complete
      setDraft(complete)
      historyRef.current = { past: [], future: [] }
      setHistoryStatus({ canUndo: false, canRedo: false })
      setSelectedId(complete.find((item) => item.is_visible)?.artwork_id || null)
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [exhibitionId, supabase])

  useEffect(() => {
    const node = canvasRef.current
    if (!node) return undefined
    const update = () => setCanvasWidth(node.clientWidth || 900)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [loading])

  const currentDraft = useCallback(() => completeExhibitionLayout(artworksRef.current, draftRef.current), [])

  const assignDraft = useCallback((next) => {
    draftRef.current = next
    setDraft(next)
  }, [])

  const syncHistoryStatus = useCallback(() => {
    setHistoryStatus({
      canUndo: historyRef.current.past.length > 0,
      canRedo: historyRef.current.future.length > 0,
    })
  }, [])

  const recordSnapshot = useCallback((snapshot) => {
    historyRef.current.past = [...historyRef.current.past.slice(-49), snapshot]
    historyRef.current.future = []
    syncHistoryStatus()
  }, [syncHistoryStatus])

  const applyDraftWithHistory = useCallback((next) => {
    const before = currentDraft()
    if (placementsEqual(before, next)) return
    recordSnapshot(before)
    assignDraft(next)
  }, [assignDraft, currentDraft, recordSnapshot])

  const updateItem = useCallback((artworkId, updater) => {
    const next = completeExhibitionLayout(artworksRef.current, draftRef.current).map((item) => (
      String(item.artwork_id) === String(artworkId) ? updater(item) : item
    ))
    draftRef.current = next
    setDraft(next)
  }, [])

  const updateItemWithHistory = useCallback((artworkId, updater) => {
    const before = currentDraft()
    const next = before.map((item) => (
      String(item.artwork_id) === String(artworkId) ? updater(item) : item
    ))
    applyDraftWithHistory(next)
  }, [applyDraftWithHistory, currentDraft])

  const undo = useCallback(() => {
    const previous = historyRef.current.past.at(-1)
    if (!previous) return
    historyRef.current.past = historyRef.current.past.slice(0, -1)
    historyRef.current.future = [currentDraft(), ...historyRef.current.future].slice(0, 50)
    assignDraft(completeExhibitionLayout(artworksRef.current, previous))
    syncHistoryStatus()
  }, [assignDraft, currentDraft, syncHistoryStatus])

  const redo = useCallback(() => {
    const next = historyRef.current.future[0]
    if (!next) return
    historyRef.current.future = historyRef.current.future.slice(1)
    historyRef.current.past = [...historyRef.current.past.slice(-49), currentDraft()]
    assignDraft(completeExhibitionLayout(artworksRef.current, next))
    syncHistoryStatus()
  }, [assignDraft, currentDraft, syncHistoryStatus])

  const openContextMenuAt = useCallback((item, clientX, clientY) => {
    const width = 210
    const height = 260
    setSelectedId(item.artwork_id)
    setContextMenu({
      kind: 'artwork',
      artworkId: item.artwork_id,
      x: Math.max(8, Math.min(clientX, window.innerWidth - width - 8)),
      y: Math.max(8, Math.min(clientY, window.innerHeight - height - 8)),
    })
  }, [])

  const openCanvasContextMenuAt = useCallback((clientX, clientY) => {
    const width = 190
    const height = 58
    setContextMenu({
      kind: 'canvas',
      x: Math.max(8, Math.min(clientX, window.innerWidth - width - 8)),
      y: Math.max(8, Math.min(clientY, window.innerHeight - height - 8)),
    })
  }, [])

  useEffect(() => {
    if (!contextMenu) return undefined
    menuRef.current?.querySelector('button')?.focus()
    const closeOutside = (event) => {
      if (!menuRef.current?.contains(event.target)) setContextMenu(null)
    }
    const closeOnKey = (event) => {
      if (event.key === 'Escape') setContextMenu(null)
    }
    const close = () => setContextMenu(null)
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeOnKey)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeOnKey)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [contextMenu])

  const startPointerOperation = useCallback((event, item, mode) => {
    if (event.button !== 0 || !canvasRef.current) return
    event.preventDefault()
    event.stopPropagation()
    setSelectedId(item.artwork_id)
    const target = event.currentTarget
    const pointerId = event.pointerId
    const startX = event.clientX
    const startY = event.clientY
    const start = { ...item }
    const historyStart = currentDraft()
    const aspect = start.width / start.height
    let longPressTimer = mode === 'move' && event.pointerType !== 'mouse'
      ? window.setTimeout(() => openContextMenuAt(item, startX, startY), 550)
      : null
    target.setPointerCapture(pointerId)

    const move = (nextEvent) => {
      if (Math.abs(nextEvent.clientX - startX) > 8 || Math.abs(nextEvent.clientY - startY) > 8) {
        window.clearTimeout(longPressTimer)
        longPressTimer = null
      }
      const dx = (nextEvent.clientX - startX) / canvasWidth
      const dy = (nextEvent.clientY - startY) / canvasWidth
      updateItem(item.artwork_id, (current) => {
        if (mode === 'move') return clampPlacement({ ...current, x: start.x + dx, y: start.y + dy })
        const maxWidth = Math.max(0.08, 1 - start.x)
        const width = Math.max(0.08, Math.min(maxWidth, start.width + Math.max(dx, dy * aspect)))
        return clampPlacement({ ...current, width, height: width / aspect })
      })
    }
    const end = () => {
      window.clearTimeout(longPressTimer)
      const after = currentDraft()
      if (!placementsEqual(historyStart, after)) recordSnapshot(historyStart)
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerup', end)
      target.removeEventListener('pointercancel', end)
    }
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', end)
    target.addEventListener('pointercancel', end)
  }, [canvasWidth, currentDraft, openContextMenuAt, recordSnapshot, updateItem])

  const handleMoveStart = useCallback((event, item) => startPointerOperation(event, item, 'move'), [startPointerOperation])
  const handleResizeStart = useCallback((event, item) => startPointerOperation(event, item, 'resize'), [startPointerOperation])
  const handleSelect = useCallback((id) => setSelectedId(id), [])
  const handleContextMenu = useCallback((event, item) => {
    event.preventDefault()
    event.stopPropagation()
    openContextMenuAt(item, event.clientX, event.clientY)
  }, [openContextMenuAt])
  const handleMenuKeyDown = useCallback((event, item) => {
    if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) return
    event.preventDefault()
    event.stopPropagation()
    const rect = event.currentTarget.getBoundingClientRect()
    openContextMenuAt(item, rect.left + Math.min(rect.width, 24), rect.top + Math.min(rect.height, 24))
  }, [openContextMenuAt])
  const handleCanvasContextMenu = useCallback((event) => {
    if (event.target !== event.currentTarget) return
    event.preventDefault()
    openCanvasContextMenuAt(event.clientX, event.clientY)
  }, [openCanvasContextMenuAt])
  const handleCanvasKeyDown = useCallback((event) => {
    if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) return
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    openCanvasContextMenuAt(rect.left + 24, rect.top + 24)
  }, [openCanvasContextMenuAt])
  const handleCanvasPointerDown = useCallback((event) => {
    if (event.target !== event.currentTarget || event.pointerType === 'mouse') return
    const startX = event.clientX
    const startY = event.clientY
    window.clearTimeout(canvasPressRef.current?.timer)
    canvasPressRef.current = {
      x: startX,
      y: startY,
      timer: window.setTimeout(() => openCanvasContextMenuAt(startX, startY), 550),
    }
  }, [openCanvasContextMenuAt])
  const handleCanvasPointerMove = useCallback((event) => {
    const press = canvasPressRef.current
    if (!press) return
    if (Math.abs(event.clientX - press.x) > 8 || Math.abs(event.clientY - press.y) > 8) {
      window.clearTimeout(press.timer)
      canvasPressRef.current = null
    }
  }, [])
  const clearCanvasPress = useCallback(() => {
    window.clearTimeout(canvasPressRef.current?.timer)
    canvasPressRef.current = null
  }, [])

  const selected = resolvedDraft.find((item) => String(item.artwork_id) === String(selectedId))
  const selectedArtwork = selected ? artworkById.get(String(selected.artwork_id)) : null
  const visible = resolvedDraft.filter((item) => item.is_visible)
  const excluded = resolvedDraft.filter((item) => !item.is_visible)
  const canvasHeight = exhibitionCanvasHeight(resolvedDraft) * canvasWidth

  function changeLayer(direction) {
    if (!selected) return
    const zValues = resolvedDraft.map((item) => item.z_index)
    const nextZ = direction === 'front' ? Math.max(...zValues) + 1 : Math.min(...zValues) - 1
    updateItemWithHistory(selected.artwork_id, (item) => ({ ...item, z_index: nextZ }))
  }

  function excludeSelected() {
    if (!selected) return
    updateItemWithHistory(selected.artwork_id, (item) => ({ ...item, is_visible: false }))
    setSelectedId(visible.find((item) => String(item.artwork_id) !== String(selected.artwork_id))?.artwork_id || null)
  }

  function restoreItem(item) {
    const bottom = exhibitionCanvasHeight(resolvedDraft)
    updateItemWithHistory(item.artwork_id, (current) => clampPlacement({ ...current, x: 0.025, y: bottom, is_visible: true }))
    setSelectedId(item.artwork_id)
  }

  async function save() {
    setSaving(true)
    setMessage('')
    const rows = resolvedDraft.map((item) => ({ ...item, exhibition_id: exhibitionId, updated_at: new Date().toISOString() }))
    const { error } = await supabase
      .from('exhibition_artwork_layouts')
      .upsert(rows, { onConflict: 'exhibition_id,artwork_id' })
    setSaving(false)
    if (error) {
      setMessage(`保存できませんでした: ${error.message}`)
      return
    }
    assignDraft(resolvedDraft)
    setMessage('配置を保存しました')
  }

  function resetAutomatic() {
    const initial = completeExhibitionLayout(artworks, [])
    applyDraftWithHistory(initial)
    setSelectedId(initial[0]?.artwork_id || null)
    setMessage('初期配置に戻しました。保存すると反映されます。')
  }

  if (loading) return <div className="ui-panel">配置を読み込んでいます…</div>

  return (
    <section className="ui-layout-editor" aria-label="展示レイアウト編集">
      <div className="ui-layout-editor-scroll">
        <div className="ui-layout-canvas-toolbar">
          <span className="ui-layout-canvas-title">展示レイアウト</span>
          <div className="ui-layout-canvas-actions">
            <button type="button" className="ui-layout-canvas-icon" onClick={undo} disabled={!historyStatus.canUndo} aria-label="元に戻す" title="元に戻す">
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 7-4 4 4 4" /><path d="M5 11h8a5 5 0 0 1 5 5v1" />
              </svg>
            </button>
            <button type="button" className="ui-layout-canvas-icon" onClick={redo} disabled={!historyStatus.canRedo} aria-label="やり直す" title="やり直す">
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 7 4 4-4 4" /><path d="M19 11h-8a5 5 0 0 0-5 5v1" />
              </svg>
            </button>
            <button type="button" className="ui-layout-canvas-icon" onClick={resetAutomatic} disabled={artworks.length === 0} aria-label="初期配置" title="初期配置">
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
                <rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" />
              </svg>
            </button>
            <button type="button" className="ui-layout-canvas-save" disabled={saving || resolvedDraft.length === 0} onClick={save}>
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6" /></svg>
              <span>{saving ? '保存中…' : '保存'}</span>
            </button>
          </div>
        </div>

        {(message || hasUnplacedNewArtwork) && (
          <div className="ui-layout-editor-message" role="status">
            {hasUnplacedNewArtwork ? '追加した作品を初期配置しました。配置を保存してください。' : message}
          </div>
        )}

        <div
          ref={canvasRef}
          className="ui-layout-editor-canvas"
          style={{ height: canvasHeight }}
          tabIndex={0}
          role="region"
          aria-label="展示レイアウトキャンバス"
          onContextMenu={handleCanvasContextMenu}
          onKeyDown={handleCanvasKeyDown}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={clearCanvasPress}
          onPointerCancel={clearCanvasPress}
          onPointerLeave={clearCanvasPress}
        >
          {visible.length === 0 && (
            <div className="ui-layout-editor-empty">
              <strong>作品を追加して展示を始める</strong>
              <span>追加した作品は自動的に初期配置されます。</span>
              <button type="button" className="ui-btn ui-btn--accent" onClick={onRequestAdd}>作品を追加</button>
            </div>
          )}
          {visible.map((item) => {
            const artwork = artworkById.get(String(item.artwork_id))
            if (!artwork?.image_url) return null
            return (
              <LayoutTile
                key={item.artwork_id}
                artwork={artwork}
                item={item}
                selected={String(item.artwork_id) === String(selectedId)}
                canvasWidth={canvasWidth}
                onSelect={handleSelect}
                onMoveStart={handleMoveStart}
                onResizeStart={handleResizeStart}
                onContextMenu={handleContextMenu}
                onMenuKeyDown={handleMenuKeyDown}
              />
            )
          })}
        </div>
      </div>

      {excluded.length > 0 && (
        <div className="ui-layout-editor-tray">
          <span>キャンバス外</span>
          {excluded.map((item) => {
            const artwork = artworkById.get(String(item.artwork_id))
            return <button key={item.artwork_id} type="button" onClick={() => restoreItem(item)}>{artwork?.title || 'タイトルなし'}を戻す</button>
          })}
        </div>
      )}

      {contextMenu?.kind === 'canvas' && (
        <div
          ref={menuRef}
          className="ui-layout-context-menu ui-layout-context-menu--canvas"
          role="menu"
          aria-label="キャンバスの操作"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button type="button" role="menuitem" onClick={() => { onRequestAdd?.(); setContextMenu(null) }}>作品を追加</button>
        </div>
      )}

      {contextMenu?.kind === 'artwork' && selectedArtwork && (
        <div
          ref={menuRef}
          className="ui-layout-context-menu"
          role="menu"
          aria-label={`${selectedArtwork.title || 'タイトルなし'}の操作`}
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <div className="ui-layout-context-menu-title">{selectedArtwork.title || 'タイトルなし'}</div>
          <button type="button" role="menuitem" onClick={() => { onEditArtwork?.(selectedArtwork); setContextMenu(null) }}>作品情報を編集</button>
          <button type="button" role="menuitem" onClick={() => { changeLayer('front'); setContextMenu(null) }}>最前面へ</button>
          <button type="button" role="menuitem" onClick={() => { changeLayer('back'); setContextMenu(null) }}>最背面へ</button>
          <button type="button" role="menuitem" onClick={() => { excludeSelected(); setContextMenu(null) }}>キャンバスから外す</button>
          <button type="button" role="menuitem" className="is-danger" onClick={() => { onDeleteArtwork?.(selectedArtwork); setContextMenu(null) }}>作品を削除</button>
        </div>
      )}
    </section>
  )
}
