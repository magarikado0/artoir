import { useEffect } from 'react'
import { T } from '../lib/tokens'
import ArtworkMedia from './ArtworkMedia'

export default function ArtworkModal({ artwork, onClose }) {
  const open = !!artwork

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  if (!open) return null

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="artwork-modal-title" style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: T.ink, color: T.paper, display: 'flex', flexDirection: 'column',
      animation: 'modalSlideUp 260ms cubic-bezier(.2,.8,.2,1)',
    }}>
      <style>{`@keyframes modalSlideUp{from{transform:translateY(24px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

      <div style={{
        padding: '14px 16px 12px', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', borderBottom: `3px solid ${T.gold}`,
        position: 'sticky', top: 0, background: T.ink, zIndex: 2,
      }}>
        <div style={{
          fontFamily: T.mono, fontSize: 10, letterSpacing: '0.16em', color: 'rgba(255,249,233,0.72)',
        }}>
        </div>
        <button
          onClick={onClose}
          className="ui-modal-close"
          aria-label="作品写真を閉じる"
          type="button"
          style={{
            minWidth: 44, minHeight: 44, padding: 0, borderRadius: 6,
            border: `1.5px solid ${T.paper}`,
            background: 'transparent', color: T.paper, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: T.mono, fontSize: 22, lineHeight: 1, fontWeight: 600,
          }}
        >
          ×
        </button>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ display: 'grid', placeItems: 'center', padding: 16, background: '#1A1410' }}>
          <ArtworkMedia
            src={artwork.image_url}
            alt={artwork.title}
            label={artwork.title}
            loading="eager"
            fit="contain"
            minHeight={240}
            background="#1A1410"
            wrapperStyle={{ maxWidth: 'min(100%, 1280px)', borderRadius: 8 }}
            imageStyle={{ background: '#D9D6CE', borderRadius: 8, maxHeight: 'calc(100vh - 220px)' }}
          />
        </div>

        <div style={{ padding: '22px 16px 48px', background: T.card, color: T.ink, borderTop: `3px solid ${T.ink}` }}>
          <div id="artwork-modal-title" style={{
            fontFamily: T.serif, fontSize: 26, letterSpacing: '0.02em', lineHeight: 1.25,
            color: T.ink,
          }}>
            {artwork.title}
          </div>

          {artwork.description && (
            <div style={{
              marginTop: 20, fontSize: 13, lineHeight: 1.9, color: T.inkSoft,
              fontFamily: T.serifBody,
            }}>
              {artwork.description}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
