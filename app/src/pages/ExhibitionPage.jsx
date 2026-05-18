import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Header, { Icon } from '../components/Header'
import BottomNav from '../components/BottomNav'
import ArtworkModal from '../components/ArtworkModal'
import { T, fmtDateDot, fmtTime, pad2 } from '../lib/tokens'

function MetaPill({ label, value }) {
  if (!value) return null
  return (
    <div className="ui-app-card" style={{ padding: '10px 12px', boxShadow: 'none' }}>
      <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '0.1em', color: T.inkMuted }}>{label}</div>
      <div style={{ marginTop: 3, fontSize: 12, lineHeight: 1.5, color: T.ink }}>{value}</div>
    </div>
  )
}

function ArtworkPreview({ artwork, alt, style, className, placeholderStyle, placeholderContent }) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [artwork?.image_url])

  if (!artwork?.image_url || failed) {
    return (
      <div style={placeholderStyle}>
        {placeholderContent}
      </div>
    )
  }

  return (
    <img
      src={artwork.image_url}
      alt={alt}
      onError={() => setFailed(true)}
      style={style}
      className={className}
    />
  )
}

export default function ExhibitionPage() {
  const { orgSlug, exhibitionSlug } = useParams()
  const [org, setOrg] = useState(null)
  const [exhibition, setExhibition] = useState(null)
  const [artworks, setArtworks] = useState([])
  const [selectedArtwork, setSelectedArtwork] = useState(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const galleryRef = useRef(null)

  useEffect(() => {
    async function load() {
      if (!supabase) return setLoading(false)
      try {
        const { data: orgData } = await supabase.from('organizations').select('*').eq('slug', orgSlug).single()
        if (!orgData) return setLoading(false)
        setOrg(orgData)
        const { data: exhData } = await supabase.from('exhibitions').select('*').eq('slug', exhibitionSlug).eq('org_id', orgData.id).single()
        if (!exhData) return setLoading(false)
        setExhibition(exhData)
        const { data: awData } = await supabase.from('artworks').select('*').eq('exhibition_id', exhData.id).order('order')
        setArtworks(awData || [])
      } catch {
        /* unavailable */
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [orgSlug, exhibitionSlug])

  useEffect(() => {
    if (!galleryRef.current) return
    const items = galleryRef.current.querySelectorAll('.gallery-item')
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('visible') }),
      { threshold: 0.1 }
    )
    items.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [artworks])

  async function copyLink() {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      const el = document.createElement('textarea')
      el.value = url
      el.style.cssText = 'position:fixed;opacity:0;top:0;left:0'
      document.body.appendChild(el)
      el.focus()
      el.select()
      try {
        document.execCommand('copy')
        setCopied(true)
        setTimeout(() => setCopied(false), 1800)
      } finally {
        document.body.removeChild(el)
      }
    }
  }

  if (loading) return (
    <div className="ui-page-shell" style={{ display: 'grid', placeItems: 'center' }}>
      <span style={{ fontFamily: T.mono, color: T.inkMuted, letterSpacing: '0.2em', fontSize: 11 }}>...</span>
    </div>
  )
  if (!exhibition) return (
    <div className="ui-page-shell" style={{ display: 'grid', placeItems: 'center' }}>
      <p style={{ color: T.inkMuted, fontSize: 13 }}>展覧会が見つかりません</p>
    </div>
  )

  const featured = artworks[0]

  return (
    <div className="ui-page-shell">
      <Header activeTab="top" />
      <main className="ui-app-main">
        <div className="ui-app-topline">
          <Link to="/" style={{ color: T.inkMuted, textDecoration: 'none', fontFamily: T.mono, fontSize: 11 }}>← 展覧会</Link>
          <button onClick={copyLink} className="ui-pill-action" style={{ background: copied ? T.accent : T.ink }}>
            <Icon name="list" size={17} />
            <span>{copied ? 'コピー済み' : 'リンクを共有'}</span>
          </button>
        </div>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, alignItems: 'start' }}>
          <div className="ui-app-card" style={{ padding: 8, overflow: 'hidden' }}>
            <ArtworkPreview
              artwork={featured}
              alt={featured?.title || exhibition.title}
              className="ui-exhibition-featured-image"
              style={{ width: '100%', maxHeight: 640, aspectRatio: '4 / 3', objectFit: 'contain', display: 'block', background: T.ink, borderRadius: 7 }}
              placeholderStyle={{ width: '100%', aspectRatio: '4 / 3', background: T.surfaceMuted, borderRadius: 7, display: 'grid', placeItems: 'center' }}
              placeholderContent={<span className="ui-mini-badge">{exhibition.title}</span>}
            />
          </div>

          <div>
            <div className="ui-app-card" style={{ padding: 18 }}>
              <h1 className="ui-screen-title" style={{ marginTop: 8 }}>{exhibition.title}</h1>
              {exhibition.description && <p className="ui-screen-subtitle" style={{ fontFamily: T.serifBody }}>{exhibition.description}</p>}
            </div>
            <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              <MetaPill label="会期" value={exhibition.start_date ? `${fmtDateDot(exhibition.start_date)}${exhibition.start_time ? ` ${fmtTime(exhibition.start_time)}` : ''} - ${fmtDateDot(exhibition.end_date)}${exhibition.end_time ? ` ${fmtTime(exhibition.end_time)}` : ''}` : ''} />
              <MetaPill label="作品数" value={`${pad2(artworks.length)} `} />
              <MetaPill label="会場" value={exhibition.location} />
              <MetaPill label="主催団体" value={org?.name} />
            </div>
          </div>
        </section>

        <section style={{ marginTop: 22 }}>
          <div className="ui-app-topline">
            <div>
              <div className="ui-screen-title" style={{ fontSize: 22 }}>作品</div>
            </div>
          </div>
          {artworks.length > 0 ? (
            <div ref={galleryRef} className="ui-exhibition-gallery">
              {artworks.map((w, i) => (
                <button key={w.id} type="button" className="gallery-item ui-list-card" onClick={() => setSelectedArtwork(w)} style={{ padding: 8, textAlign: 'left', cursor: 'pointer', border: '1px solid rgba(30,26,22,0.12)' }}>
                  <ArtworkPreview
                    artwork={w}
                    alt={w.title || 'artwork image'}
                    style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', display: 'block', borderRadius: 7 }}
                    placeholderStyle={{ width: '100%', aspectRatio: '1 / 1', background: T.surfaceMuted, borderRadius: 7 }}
                    placeholderContent={null}
                  />
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'baseline' }}>
                    <span style={{ fontFamily: T.mono, fontSize: 10, color: T.inkMuted }}>{pad2(i + 1)}</span>
                    <span style={{ fontFamily: T.serif, fontSize: 14, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.title || '-'}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="ui-app-card" style={{ padding: 32, textAlign: 'center' }}>
              <p style={{ fontFamily: T.mono, fontSize: 12, color: T.inkMuted, letterSpacing: '0.05em' }}>作品がまだありません</p>
            </div>
          )}
        </section>
      </main>
      <ArtworkModal artwork={selectedArtwork} onClose={() => setSelectedArtwork(null)} />
      <BottomNav active="top" />
    </div>
  )
}
