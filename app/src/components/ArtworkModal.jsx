import { useEffect } from 'react'

const S = {
  overlay: (open) => ({
    position: 'fixed',
    inset: 0,
    background: 'rgba(26,22,18,0.85)',
    zIndex: 500,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: open ? 1 : 0,
    pointerEvents: open ? 'all' : 'none',
    transition: 'opacity 0.3s',
    backdropFilter: 'blur(4px)',
  }),
  modal: (open) => ({
    background: '#f5f0e8',
    maxWidth: '700px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto',
    padding: '3rem',
    position: 'relative',
    transform: open ? 'translateY(0)' : 'translateY(20px)',
    transition: 'transform 0.3s',
  }),
  close: {
    position: 'absolute',
    top: '1.5rem',
    right: '1.5rem',
    background: 'none',
    border: 'none',
    fontSize: '1.2rem',
    cursor: 'pointer',
    color: '#9a9088',
    lineHeight: 1,
  },
  image: {
    width: '100%',
    maxHeight: '50vh',
    objectFit: 'contain',
    display: 'block',
    marginBottom: '2rem',
    background: '#ede6d6',
  },
  title: {
    fontFamily: 'Shippori Mincho, serif',
    fontSize: '1.8rem',
    marginBottom: '0.5rem',
    color: '#1a1612',
  },
  desc: {
    fontSize: '0.85rem',
    lineHeight: 2,
    color: '#3d3530',
  },
}

export default function ArtworkModal({ artwork, onClose }) {
  const open = !!artwork

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div style={S.overlay(open)} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div style={S.modal(open)}>
        <button style={S.close} onClick={onClose}>✕</button>
        {artwork && (
          <>
            <img src={artwork.image_url} alt={artwork.title} style={S.image} />
            <div style={S.title}>{artwork.title}</div>
            {artwork.description && <div style={S.desc}>{artwork.description}</div>}
          </>
        )}
      </div>
    </div>
  )
}
