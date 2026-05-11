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
      background: T.paper, display: 'flex', flexDirection: 'column',
      animation: 'modalSlideUp 260ms cubic-bezier(.2,.8,.2,1)',
    }}>
      <style>{`@keyframes modalSlideUp{from{transform:translateY(24px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

      <div style={{
        padding: '14px 16px 12px', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', borderBottom: `1px solid ${T.ink}`,
        position: 'sticky', top: 0, background: T.paper, zIndex: 2,
      }}>
        <div style={{
          fontFamily: T.mono, fontSize: 10, letterSpacing: '0.16em', color: T.inkMuted,
        }}>
        </div>
        <div
          onClick={onClose}
          style={{
            fontFamily: T.mono, fontSize: 10, letterSpacing: '0.14em', cursor: 'pointer',
            padding: 6, marginRight: -6, color: T.ink,
          }}
        >
          CLOSE ✕
        </div>
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
            width: '100%', aspectRatio: '1 / 1', background: '#D9D6CE',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{
              fontFamily: T.mono, fontSize: 10, letterSpacing: '0.5px',
              color: 'rgba(0,0,0,0.4)', textTransform: 'uppercase',
              background: 'rgba(255,255,255,0.75)', padding: '3px 7px',
            }}>
              {artwork.title}
            </span>
          </div>
        )}

        <div style={{ padding: '22px 16px 48px' }}>
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
