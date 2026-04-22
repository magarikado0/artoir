import { useEffect } from 'react'
import { T, pad2 } from '../lib/tokens'
import { useIsDesktop } from '../lib/useIsDesktop'

export default function ArtworkModal({ artwork, onClose }) {
  const open = !!artwork
  const isDesktop = useIsDesktop()

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

  if (isDesktop) return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(8,8,8,0.86)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 32,
        animation: 'modalBgIn 220ms ease',
      }}
    >
      <style>{`
        @keyframes modalBgIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes modalCardIn { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes modalSlideUp { from { transform: translateY(24px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.paper,
          maxWidth: 920, width: '100%',
          maxHeight: 'calc(100vh - 64px)',
          display: 'grid',
          gridTemplateColumns: '1fr 320px',
          overflow: 'hidden',
          animation: 'modalCardIn 280ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      >
        {/* image */}
        <div style={{ background: '#D9D6CE', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 420 }}>
          {artwork.image_url ? (
            <img
              src={artwork.image_url}
              alt={artwork.title}
              style={{ width: '100%', height: '100%', maxHeight: 'calc(100vh - 64px)', objectFit: 'contain', display: 'block' }}
            />
          ) : (
            <span style={{ fontFamily: T.mono, fontSize: 10, color: 'rgba(0,0,0,0.4)', background: 'rgba(255,255,255,0.75)', padding: '3px 7px' }}>
              {artwork.title}
            </span>
          )}
        </div>

        {/* info */}
        <div style={{ display: 'flex', flexDirection: 'column', borderLeft: `0.5px solid ${T.line}`, overflowY: 'auto' }}>
          <div style={{
            padding: '14px 20px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderBottom: `0.5px solid ${T.line}`, flexShrink: 0,
          }}>
            <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '0.18em', color: T.inkMuted }}>
              WORK {artwork.order ? `· ${pad2(artwork.order)}` : ''}
            </div>
            <div
              onClick={onClose}
              style={{ fontFamily: T.mono, fontSize: 11, cursor: 'pointer', color: T.inkMuted, padding: '4px 6px', marginRight: -6, letterSpacing: '0.05em' }}
            >
              ✕
            </div>
          </div>
          <div style={{ padding: '36px 28px 44px', flex: 1 }}>
            <div style={{ fontFamily: T.serif, fontSize: 30, letterSpacing: '0.02em', lineHeight: 1.2, color: T.ink }}>
              {artwork.title}
            </div>
            {artwork.description && (
              <div style={{ marginTop: 28, fontSize: 13, lineHeight: 2, color: T.inkSoft, fontFamily: T.serifBody }}>
                {artwork.description}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  // mobile — full-screen slide up
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
        <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.16em', color: T.inkMuted }}>
          WORK {artwork.order ? `· ${pad2(artwork.order)}` : ''}
        </div>
        <div onClick={onClose} style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.14em', cursor: 'pointer', padding: 6, marginRight: -6, color: T.ink }}>
          CLOSE ✕
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {artwork.image_url ? (
          <img src={artwork.image_url} alt={artwork.title} style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'contain', display: 'block', background: '#D9D6CE' }} />
        ) : (
          <div style={{ width: '100%', aspectRatio: '1 / 1', background: '#D9D6CE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: T.mono, fontSize: 10, color: 'rgba(0,0,0,0.4)', background: 'rgba(255,255,255,0.75)', padding: '3px 7px' }}>
              {artwork.title}
            </span>
          </div>
        )}
        <div style={{ padding: '24px 16px 52px' }}>
          <div style={{ fontFamily: T.serif, fontSize: 28, letterSpacing: '0.02em', lineHeight: 1.25, color: T.ink }}>{artwork.title}</div>
          {artwork.description && (
            <div style={{ marginTop: 22, fontSize: 13, lineHeight: 1.95, color: T.inkSoft, fontFamily: T.serifBody }}>
              {artwork.description}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
