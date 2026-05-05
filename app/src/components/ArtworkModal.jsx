import { useEffect } from 'react'
import { T, pad2 } from '../lib/tokens'

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
    <div style={{
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
          style={{
            width: 46, height: 46, borderRadius: '50%', border: `2px solid ${T.paper}`,
            background: T.warning, color: T.paper, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: T.mono, fontSize: 22, lineHeight: 1, fontWeight: 700,
            boxShadow: `5px 5px 0 ${T.gold}`,
          }}
        >
          ×
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {artwork.image_url ? (
          <img
            src={artwork.image_url}
            alt={artwork.title}
            style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'contain', display: 'block', background: '#D9D6CE' }}
          />
        ) : (
          <div style={{
            width: '100%', aspectRatio: '1 / 1', background: T.blueSoft,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{
              fontFamily: T.mono, fontSize: 10, letterSpacing: '0.5px',
              color: T.ink, textTransform: 'uppercase',
              background: T.gold, border: `1px solid ${T.ink}`, padding: '4px 8px',
            }}>
              {artwork.title}
            </span>
          </div>
        )}

        <div style={{ padding: '22px 16px 48px', background: T.card, color: T.ink, borderTop: `3px solid ${T.ink}` }}>
          <div style={{
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
