import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ArtworkMedia from './ArtworkMedia'
import { getWallThumbnailUrl } from '../lib/imageUrl'
import {
  clampPlacement,
  completeExhibitionLayout,
  exhibitionCanvasHeight,
} from '../lib/exhibitionLayout'

const LayoutTile = memo(function LayoutTile({ artwork, item, selected, canvasWidth, onSelect, onMoveStart, onResizeStart }) {
  return (
    <div
      className={`ui-layout-editor-item${selected ? ' is-selected' : ''}`}
      style={{
        width: item.width * canvasWidth,
        height: item.height * canvasWidth,
        zIndex: item.z_index,
        transform: `translate3d(${item.x * canvasWidth}px, ${item.y * canvasWidth}px, 0) rotate(${item.rotation}deg)`,
      }}
      onPointerDown={(event) => onMoveStart(event, item)}
      onClick={() => onSelect(item.artwork_id)}
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

export default function ExhibitionLayoutEditor({ exhibitionId, artworks, supabase, onClose }) {
  const canvasRef = useRef(null)
  const [canvasWidth, setCanvasWidth] = useState(900)
  const [saved, setSaved] = useState([])
  const [draft, setDraft] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const artworkById = useMemo(() => new Map(artworks.map((artwork) => [String(artwork.id), artwork])), [artworks])

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
      const complete = completeExhibitionLayout(artworks, data || [])
      setSaved(complete)
      setDraft(complete)
      setSelectedId(complete.find((item) => item.is_visible)?.artwork_id || null)
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [artworks, exhibitionId, supabase])

  useEffect(() => {
    const node = canvasRef.current
    if (!node) return undefined
    const update = () => setCanvasWidth(node.clientWidth || 900)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [loading])

  const updateItem = useCallback((artworkId, updater) => {
    setDraft((current) => current.map((item) => (
      String(item.artwork_id) === String(artworkId) ? updater(item) : item
    )))
  }, [])

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
    const aspect = start.width / start.height
    target.setPointerCapture(pointerId)

    const move = (nextEvent) => {
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
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerup', end)
      target.removeEventListener('pointercancel', end)
    }
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', end)
    target.addEventListener('pointercancel', end)
  }, [canvasWidth, updateItem])

  const handleMoveStart = useCallback((event, item) => startPointerOperation(event, item, 'move'), [startPointerOperation])
  const handleResizeStart = useCallback((event, item) => startPointerOperation(event, item, 'resize'), [startPointerOperation])
  const handleSelect = useCallback((id) => setSelectedId(id), [])

  const selected = draft.find((item) => String(item.artwork_id) === String(selectedId))
  const visible = draft.filter((item) => item.is_visible)
  const excluded = draft.filter((item) => !item.is_visible)
  const canvasHeight = exhibitionCanvasHeight(draft) * canvasWidth

  function changeLayer(direction) {
    if (!selected) return
    const zValues = draft.map((item) => item.z_index)
    const nextZ = direction === 'front' ? Math.max(...zValues) + 1 : Math.min(...zValues) - 1
    updateItem(selected.artwork_id, (item) => ({ ...item, z_index: nextZ }))
  }

  function excludeSelected() {
    if (!selected) return
    updateItem(selected.artwork_id, (item) => ({ ...item, is_visible: false }))
    setSelectedId(visible.find((item) => String(item.artwork_id) !== String(selected.artwork_id))?.artwork_id || null)
  }

  function restoreItem(item) {
    const bottom = exhibitionCanvasHeight(draft)
    updateItem(item.artwork_id, (current) => clampPlacement({ ...current, x: 0.025, y: bottom, is_visible: true }))
    setSelectedId(item.artwork_id)
  }

  async function save() {
    setSaving(true)
    setMessage('')
    const rows = draft.map((item) => ({ ...item, exhibition_id: exhibitionId, updated_at: new Date().toISOString() }))
    const { error } = await supabase
      .from('exhibition_artwork_layouts')
      .upsert(rows, { onConflict: 'exhibition_id,artwork_id' })
    setSaving(false)
    if (error) {
      setMessage(`保存できませんでした: ${error.message}`)
      return
    }
    setSaved(draft)
    setMessage('配置を保存しました')
  }

  function resetAutomatic() {
    const initial = completeExhibitionLayout(artworks, [])
    setDraft(initial)
    setSelectedId(initial[0]?.artwork_id || null)
    setMessage('初期配置に戻しました。保存すると反映されます。')
  }

  if (loading) return <div className="ui-panel">配置を読み込んでいます…</div>

  return (
    <section className="ui-layout-editor" aria-label="展示レイアウト編集">
      <div className="ui-layout-editor-header">
        <div>
          <div className="ui-kicker">展示レイアウト</div>
          <h2>作品の位置と大きさを整える</h2>
          <p>ドラッグで移動、右下の点で比率を保ったまま拡大・縮小できます。</p>
        </div>
        <div className="ui-layout-editor-actions">
          <button type="button" className="ui-btn ui-btn--ghost" onClick={() => { setDraft(saved); setMessage('編集前の配置に戻しました。') }}>編集前に戻す</button>
          <button type="button" className="ui-btn ui-btn--ghost" onClick={resetAutomatic}>初期配置</button>
          <button type="button" className="ui-btn ui-btn--primary" disabled={saving} onClick={save}>{saving ? '保存中…' : '配置を保存'}</button>
          <button type="button" className="ui-btn ui-btn--ghost" onClick={onClose}>一覧へ戻る</button>
        </div>
      </div>

      {message && <div className="ui-layout-editor-message" role="status">{message}</div>}

      <div className="ui-layout-editor-toolbar" aria-label="選択した作品の操作">
        <span>{selected ? artworkById.get(String(selected.artwork_id))?.title || 'タイトルなし' : '作品を選択してください'}</span>
        <button type="button" disabled={!selected} onClick={() => changeLayer('front')}>最前面へ</button>
        <button type="button" disabled={!selected} onClick={() => changeLayer('back')}>最背面へ</button>
        <button type="button" disabled={!selected} onClick={excludeSelected}>キャンバスから外す</button>
      </div>

      <div className="ui-layout-editor-scroll">
        <div ref={canvasRef} className="ui-layout-editor-canvas" style={{ height: canvasHeight }}>
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
    </section>
  )
}
