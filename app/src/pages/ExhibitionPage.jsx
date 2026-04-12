import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Header from '../components/Header'
import ArtworkModal from '../components/ArtworkModal'

const GAP = 'clamp(2rem, 5vw, 5rem)'

const DAYS = ['日', '月', '火', '水', '木', '金', '土']

function fmtDate(str) {
  if (!str) return ''
  const d = new Date(str)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${DAYS[d.getDay()]}）`
}

function zeroPad(n) {
  return String(n).padStart(2, '0')
}

export default function ExhibitionPage() {
  const { orgSlug, exhibitionSlug } = useParams()
  const [org, setOrg] = useState(null)
  const [exhibition, setExhibition] = useState(null)
  const [artworks, setArtworks] = useState([])
  const [allExhibitions, setAllExhibitions] = useState([])
  const [selectedArtwork, setSelectedArtwork] = useState(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const galleryRef = useRef(null)

  useEffect(() => {
    async function load() {
      if (!supabase) return setLoading(false)
      try {
        const { data: orgData } = await supabase
          .from('organizations')
          .select('*')
          .eq('slug', orgSlug)
          .single()
        if (!orgData) return setLoading(false)
        setOrg(orgData)

        const { data: exhData } = await supabase
          .from('exhibitions')
          .select('*')
          .eq('slug', exhibitionSlug)
          .eq('org_id', orgData.id)
          .single()
        if (!exhData) return setLoading(false)
        setExhibition(exhData)

        const [{ data: awData }, { data: allExhData }] = await Promise.all([
          supabase.from('artworks').select('*').eq('exhibition_id', exhData.id).order('order'),
          supabase.from('exhibitions').select('*').eq('org_id', orgData.id).order('start_date', { ascending: false }),
        ])

        setArtworks(awData || [])
        setAllExhibitions(allExhData || [])
      } catch {
        // Supabase unavailable — show empty state
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [orgSlug, exhibitionSlug])

  // IntersectionObserver for gallery fade-in
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

  function copyLink() {
    navigator.clipboard.writeText(window.location.href).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f0e8' }}>
      <span style={{ fontFamily: 'Cormorant Garamond, serif', color: '#9a9088', letterSpacing: '0.2em', fontSize: '0.8rem' }}>...</span>
    </div>
  )

  if (!exhibition) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f0e8' }}>
      <p style={{ color: '#9a9088', fontSize: '0.9rem' }}>展覧会が見つかりません</p>
    </div>
  )

  const bgColor = exhibition.bg_color || '#f5f0e8'
  const featured = artworks[0]
  const sns = org?.sns_links || {}

  return (
    <div style={{ background: bgColor, minHeight: '100vh' }}>
      <Header orgName={org?.name} orgSlug={orgSlug} />

      {/* Hero */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        minHeight: '88vh',
        position: 'relative',
      }} className="hero-grid">
        {/* Left */}
        <div style={{
          padding: GAP,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          paddingBottom: `calc(${GAP} * 2)`,
          position: 'relative',
          zIndex: 2,
        }}>
          <div style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: '0.7rem',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: '#c0392b',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}>
            <span style={{ display: 'block', width: '2rem', height: '1px', background: '#c0392b' }} />
            Exhibition
          </div>
          <h1 style={{
            fontFamily: 'Shippori Mincho, serif',
            fontSize: 'clamp(4rem, 8vw, 8rem)',
            fontWeight: 400,
            lineHeight: 1,
            letterSpacing: '-0.02em',
            color: '#1a1612',
            marginBottom: '0.5rem',
          }}>
            {exhibition.title}
          </h1>
          {exhibition.description && (
            <div style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontStyle: 'italic',
              fontSize: 'clamp(1rem, 2vw, 1.4rem)',
              color: '#9a9088',
              letterSpacing: '0.05em',
              marginBottom: '3rem',
            }}>
              {exhibition.description}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem', color: '#3d3530', letterSpacing: '0.05em' }}>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <span style={{ color: '#9a9088', minWidth: '3rem' }}>会期</span>
              <span>{fmtDate(exhibition.start_date)}{exhibition.end_date ? ` — ${fmtDate(exhibition.end_date)}` : ''}</span>
            </div>
            {exhibition.location && (
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <span style={{ color: '#9a9088', minWidth: '3rem' }}>会場</span>
                <span>{exhibition.location}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: featured artwork */}
        <div style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(to right, ${bgColor} 0%, transparent 20%)`,
            zIndex: 2,
            pointerEvents: 'none',
          }} />
          {featured?.image_url ? (
            <img
              src={featured.image_url}
              alt={featured.title}
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', background: '#ede6d6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'Shippori Mincho, serif', fontSize: '8rem', color: 'rgba(26,22,18,0.1)' }}>墨</span>
            </div>
          )}
        </div>

        {/* Scroll hint */}
        <div style={{
          position: 'absolute',
          bottom: '2rem',
          left: GAP,
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.65rem',
          letterSpacing: '0.2em',
          color: '#9a9088',
          zIndex: 3,
        }}>
          <div style={{ width: '2rem', height: '1px', background: '#9a9088', position: 'relative', overflow: 'hidden' }}>
            <span style={{
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background: '#1a1612',
              animation: 'slide 2s ease-in-out infinite',
            }} />
          </div>
          SCROLL
        </div>
      </div>

      {/* Share bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        padding: `1.5rem ${GAP}`,
        background: '#ede6d6',
        borderTop: '1px solid rgba(26,22,18,0.08)',
        borderBottom: '1px solid rgba(26,22,18,0.08)',
      }}>
        <span style={{ fontSize: '0.75rem', color: '#9a9088', letterSpacing: '0.15em' }}>SHARE</span>
        <button
          onClick={copyLink}
          style={{
            fontSize: '0.7rem',
            letterSpacing: '0.15em',
            color: '#f5f0e8',
            background: copied ? '#c0392b' : '#1a1612',
            border: 'none',
            padding: '0.5rem 1.2rem',
            cursor: 'pointer',
            transition: 'background 0.2s',
            fontFamily: 'Cormorant Garamond, serif',
          }}
        >
          {copied ? 'COPIED' : 'COPY LINK'}
        </button>
      </div>

      {/* Gallery */}
      <section style={{ padding: `calc(${GAP} * 2) ${GAP}` }}>
        <div style={{
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: '0.65rem',
          letterSpacing: '0.35em',
          textTransform: 'uppercase',
          color: '#c0392b',
          marginBottom: '3rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}>
          Works
          <span style={{ flex: 1, height: '1px', background: 'rgba(26,22,18,0.1)' }} />
        </div>
        <div
          ref={galleryRef}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1.5rem',
            alignItems: 'start',
          }}
          className="gallery-grid-responsive"
        >
          {artworks.map((artwork, i) => (
            <div
              key={artwork.id}
              className="gallery-item"
              onClick={() => setSelectedArtwork(artwork)}
              style={{ cursor: 'pointer' }}
            >
              <div style={{
                aspectRatio: '3/4',
                background: '#ede6d6',
                overflow: 'hidden',
                position: 'relative',
                border: '1px solid rgba(26,22,18,0.08)',
              }}>
                {artwork.image_url && (
                  <img
                    src={artwork.image_url}
                    alt={artwork.title}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                  />
                )}
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: '2rem 1rem 1rem',
                  background: 'linear-gradient(to top, rgba(26,22,18,0.72) 0%, transparent 100%)',
                  zIndex: 2,
                }}>
                  <span style={{
                    display: 'block',
                    fontFamily: 'Cormorant Garamond, serif',
                    fontSize: '0.6rem',
                    letterSpacing: '0.3em',
                    color: 'rgba(245,240,232,0.45)',
                    marginBottom: '0.3rem',
                  }}>
                    {zeroPad(i + 1)}
                  </span>
                  <div style={{
                    fontFamily: 'Shippori Mincho, serif',
                    fontSize: '1rem',
                    fontWeight: 400,
                    color: '#f5f0e8',
                    letterSpacing: '0.06em',
                    lineHeight: 1.4,
                  }}>
                    {artwork.title}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* All exhibitions (dark section) */}
      {allExhibitions.length > 1 && (
        <section style={{
          background: '#1a1612',
          padding: `calc(${GAP} * 2) ${GAP}`,
        }}>
          <div style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: '0.65rem',
            letterSpacing: '0.35em',
            textTransform: 'uppercase',
            color: '#b8932a',
            marginBottom: '2.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}>
            All Exhibitions
            <span style={{ flex: 1, height: '1px', background: 'rgba(245,240,232,0.1)' }} />
          </div>
          <div>
            {allExhibitions.map((exh, i) => {
              const isCurrent = exh.id === exhibition.id
              return (
                <Link
                  key={exh.id}
                  to={`/${orgSlug}/exhibition/${exh.slug}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '6rem 1fr auto',
                    alignItems: 'center',
                    gap: '2rem',
                    padding: '1.5rem 0',
                    borderBottom: '1px solid rgba(245,240,232,0.08)',
                    ...(i === 0 ? { borderTop: '1px solid rgba(245,240,232,0.08)' } : {}),
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', fontWeight: 300, color: 'rgba(245,240,232,0.2)' }}>
                    {new Date(exh.start_date).getFullYear()}
                  </div>
                  <div>
                    <div style={{ fontFamily: 'Shippori Mincho, serif', fontSize: '1.1rem', color: '#f5f0e8' }}>
                      {exh.title}
                      {isCurrent && (
                        <span style={{
                          display: 'inline-block',
                          fontSize: '0.6rem',
                          letterSpacing: '0.15em',
                          padding: '0.2rem 0.6rem',
                          border: '1px solid #c0392b',
                          color: '#c0392b',
                          marginLeft: '0.75rem',
                          verticalAlign: 'middle',
                          fontFamily: 'Cormorant Garamond, serif',
                        }}>
                          NOW
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(245,240,232,0.4)', letterSpacing: '0.1em', marginTop: '0.25rem', fontFamily: 'Cormorant Garamond, serif' }}>
                      {exh.location}
                    </div>
                  </div>
                  <div style={{ fontSize: '1rem', color: 'rgba(245,240,232,0.3)' }}>→</div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Organizer */}
      {org && (
        <section style={{
          padding: `calc(${GAP} * 2) ${GAP}`,
          borderTop: '1px solid rgba(26,22,18,0.1)',
        }}>
          <div style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: '0.65rem',
            letterSpacing: '0.35em',
            textTransform: 'uppercase',
            color: '#c0392b',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}>
            Organizer
            <span style={{ flex: 1, height: '1px', background: 'rgba(26,22,18,0.1)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: GAP, alignItems: 'start' }} className="organizer-grid-responsive">
            <div>
              <div style={{ fontFamily: 'Shippori Mincho, serif', fontSize: 'clamp(1.5rem, 2.5vw, 2.2rem)', fontWeight: 400, marginBottom: '0.5rem', color: '#1a1612' }}>
                {org.name}
              </div>
              {org.description && (
                <div style={{ fontSize: '0.85rem', lineHeight: 1.9, color: '#3d3530', marginTop: '1.5rem' }}>
                  {org.description}
                </div>
              )}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap' }}>
                {sns.instagram && (
                  <a href={sns.instagram} target="_blank" rel="noreferrer" style={{ fontSize: '0.7rem', letterSpacing: '0.15em', color: '#9a9088', textDecoration: 'none', borderBottom: '1px solid transparent', paddingBottom: '0.1rem' }}>
                    Instagram
                  </a>
                )}
                {sns.x && (
                  <a href={sns.x} target="_blank" rel="noreferrer" style={{ fontSize: '0.7rem', letterSpacing: '0.15em', color: '#9a9088', textDecoration: 'none', borderBottom: '1px solid transparent', paddingBottom: '0.1rem' }}>
                    X (Twitter)
                  </a>
                )}
                {org.homepage_url && (
                  <a href={org.homepage_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.7rem', letterSpacing: '0.15em', color: '#9a9088', textDecoration: 'none', borderBottom: '1px solid transparent', paddingBottom: '0.1rem' }}>
                    公式サイト
                  </a>
                )}
              </div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontFamily: 'Cormorant Garamond, serif',
                fontSize: '0.7rem',
                letterSpacing: '0.2em',
                color: '#9a9088',
                border: '1px solid rgba(26,22,18,0.15)',
                padding: '0.5rem 1rem',
                marginTop: '3rem',
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#c0392b', display: 'block' }} />
                artport にて公開中
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer style={{
        padding: `2rem ${GAP}`,
        borderTop: '1px solid rgba(26,22,18,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.7rem',
        color: '#9a9088',
        letterSpacing: '0.1em',
      }}>
        <div>© {new Date().getFullYear()} Artport</div>
        <div>展覧会のポータル</div>
      </footer>

      <ArtworkModal artwork={selectedArtwork} onClose={() => setSelectedArtwork(null)} />

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          .hero-grid { grid-template-columns: 1fr !important; min-height: auto !important; }
          .gallery-grid-responsive { grid-template-columns: repeat(2, 1fr) !important; }
          .organizer-grid-responsive { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
