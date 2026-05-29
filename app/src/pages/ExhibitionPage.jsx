import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Header, { Icon } from '../components/Header'
import BottomNav from '../components/BottomNav'
import ArtworkModal from '../components/ArtworkModal'
import ArtworkMedia from '../components/ArtworkMedia'
import { getThumbnailUrl } from '../lib/imageUrl'
import { T, fmtDateDot, fmtTime } from '../lib/tokens'
import { isPersonPublisher } from '../lib/publisher'

function SummaryItem({ label, value }) {
  if (!value) return null
  return (
    <div className="ui-exhibition-summary-item">
      <div className="ui-exhibition-summary-label">{label}</div>
      <div className="ui-exhibition-summary-value">{value}</div>
    </div>
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

  useEffect(() => {
    const handlePopState = (event) => {
      const artworkId = event.state?.artworkModalArtworkId
      if (!artworkId) {
        setSelectedArtwork(null)
        return
      }
      const nextArtwork = artworks.find((artwork) => String(artwork.id) === String(artworkId)) || null
      setSelectedArtwork(nextArtwork)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
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

  function openArtwork(artwork) {
    window.history.pushState({ artworkModalArtworkId: artwork.id }, '', window.location.href)
    setSelectedArtwork(artwork)
  }

  function closeArtwork() {
    if (window.history.state?.artworkModalArtworkId) {
      window.history.back()
      return
    }
    setSelectedArtwork(null)
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

  const hostLabel = isPersonPublisher(org) ? '主催者' : '主催団体'
  const dateText = exhibition.start_date
    ? `${fmtDateDot(exhibition.start_date)}${exhibition.start_time ? ` ${fmtTime(exhibition.start_time)}` : ''} - ${fmtDateDot(exhibition.end_date)}${exhibition.end_time ? ` ${fmtTime(exhibition.end_time)}` : ''}`
    : ''

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

        <section>
          <div className="ui-app-card ui-exhibition-summary-card">
            <h1 className="ui-screen-title">{exhibition.title}</h1>
            {exhibition.description && <p className="ui-screen-subtitle">{exhibition.description}</p>}
            <div className="ui-exhibition-summary-grid">
              <SummaryItem label="会期" value={dateText} />
              <SummaryItem label="会場" value={exhibition.location} />
              <SummaryItem label={hostLabel} value={org?.name || ''} />
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
              {artworks.map((w, i) => {
                const label = w.title?.trim() || `作品 ${i + 1}`
                return (
                  <button
                    key={w.id}
                    type="button"
                    className="gallery-item ui-list-card ui-exhibition-gallery-item"
                    onClick={() => openArtwork(w)}
                    aria-label={`${label}の詳細を見る`}
                    style={{ textAlign: 'left', cursor: 'pointer', border: '1px solid rgba(30,26,22,0.12)' }}
                  >
                    <ArtworkMedia
                      src={getThumbnailUrl(w.image_url)}
                      alt=""
                      decorative
                      loading="lazy"
                      fit="contain"
                      naturalSize
                      className="ui-exhibition-gallery-image"
                    />
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="ui-app-card" style={{ padding: 32, textAlign: 'center' }}>
              <p style={{ fontFamily: T.mono, fontSize: 12, color: T.inkMuted, letterSpacing: '0.05em' }}>作品がまだありません</p>
            </div>
          )}
        </section>
      </main>
      <ArtworkModal artwork={selectedArtwork} onClose={closeArtwork} />
      <BottomNav active="top" />
    </div>
  )
}
