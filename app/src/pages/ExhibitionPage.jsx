import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { IS_DEV, demoOrgs, demoExhibitions, demoArtworks } from '../lib/demoData'
import Header from '../components/Header'
import BottomNav from '../components/BottomNav'
import ArtworkModal from '../components/ArtworkModal'
import { T, fmtDateDot, pad2 } from '../lib/tokens'
import { useIsDesktop } from '../lib/useIsDesktop'

function MetaCell({ label, value, span = 1, mono }) {
  return (
    <div style={{ gridColumn: `span ${span}` }}>
      <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '0.14em', color: T.inkMuted, marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: mono ? T.mono : T.sans, fontSize: mono ? 12 : 13, lineHeight: 1.5, whiteSpace: 'pre-line', color: T.ink }}>{value}</div>
    </div>
  )
}

function DesktopFooter() {
  return (
    <div style={{ borderTop: `1px solid ${T.ink}` }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 32px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.inkMuted }}>
        <span>© Artoir {new Date().getFullYear()}</span>
        <span>展覧会プラットフォーム</span>
        <span>Artoir(アルトワール)</span>
      </div>
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
  const isDesktop = useIsDesktop()

  useEffect(() => {
    async function load() {
      if (IS_DEV) {
        const exh = demoExhibitions.find((e) => e.slug === exhibitionSlug) ?? demoExhibitions[0]
        const org = demoOrgs.find((o) => o.id === exh.org_id) ?? demoOrgs[0]
        setOrg(org); setExhibition(exh)
        setArtworks(demoArtworks.filter((a) => a.exhibition_id === exh.id))
        setLoading(false); return
      }
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
      } catch { /* unavailable */ } finally { setLoading(false) }
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

  function copyLink() {
    navigator.clipboard.writeText(window.location.href).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.paper }}>
      <span style={{ fontFamily: T.mono, color: T.inkMuted, letterSpacing: '0.2em', fontSize: 11 }}>...</span>
    </div>
  )
  if (!exhibition) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.paper }}>
      <p style={{ color: T.inkMuted, fontSize: 13 }}>展覧会が見つかりません</p>
    </div>
  )

  const featured = artworks[0]
  const sns = org?.sns_links || {}

  if (isDesktop) return (
    <div style={{ background: T.paper, minHeight: '100vh' }}>
      <Header activeTab="top" />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px' }}>
        <div style={{ padding: '16px 0', fontFamily: T.mono, fontSize: 10, letterSpacing: '0.12em', color: T.inkMuted, display: 'flex', gap: 8 }}></div>
        {/* two-col hero */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 48, paddingBottom: 48, borderBottom: `1px solid ${T.ink}` }}>
          <div>
            {featured?.image_url ? (
              <img src={featured.image_url} alt={featured.title} style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'contain', display: 'block', background: '#D9D6CE' }} />
            ) : (
              <div style={{ width: '100%', aspectRatio: '4 / 3', background: '#D9D6CE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: T.mono, fontSize: 10, color: 'rgba(0,0,0,0.4)', background: 'rgba(255,255,255,0.75)', padding: '3px 7px' }}>{exhibition.title}</span>
              </div>
            )}
          </div>
          <div style={{ paddingTop: 8 }}>
            <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.accent, marginBottom: 16 }}>EXHIBITION</div>
            <div style={{ fontFamily: T.serif, fontSize: 40, lineHeight: 1.2, letterSpacing: '0.01em', color: T.ink }}>{exhibition.title}</div>
            <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: '90px 1fr', rowGap: 14, fontSize: 13, lineHeight: 1.6, paddingTop: 24, borderTop: `0.5px solid ${T.line}` }}>
              {exhibition.start_date && <>
                <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '0.16em', color: T.inkMuted, paddingTop: 2 }}>会期</div>
                <div style={{ fontFamily: T.mono, fontSize: 12 }}>{fmtDateDot(exhibition.start_date)} — {fmtDateDot(exhibition.end_date)}</div>
              </>}
              {exhibition.location && <>
                <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '0.16em', color: T.inkMuted, paddingTop: 2 }}>会場</div>
                <div>{exhibition.location}</div>
              </>}
              {org?.name && <>
                <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '0.16em', color: T.inkMuted, paddingTop: 2 }}>団体</div>
                <div>{org.name}</div>
              </>}
              <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '0.16em', color: T.inkMuted, paddingTop: 2 }}>作品数</div>
              <div style={{ fontFamily: T.mono, fontSize: 12 }}>{pad2(artworks.length)} works</div>
            </div>
            {exhibition.description && (
              <div style={{ marginTop: 28, fontSize: 13, lineHeight: 2, color: T.inkSoft, fontFamily: T.serifBody }}>{exhibition.description}</div>
            )}
            <button onClick={copyLink} style={{ marginTop: 24, width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 16px', background: 'transparent', border: `1px solid ${T.ink}`, cursor: 'pointer', fontFamily: T.mono, fontSize: 11, letterSpacing: '0.1em', color: T.ink }}>
              <span style={{ color: T.inkSoft, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>artoir.net/…/{exhibition.slug}</span>
              <span style={{ marginLeft: 12, flexShrink: 0 }}>{copied ? 'COPIED ✓' : 'URLをコピー'}</span>
            </button>
          </div>
        </div>

        {/* works grid — 4 col */}
        {artworks.length > 0 && (
          <div style={{ padding: '40px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24 }}>
              <div style={{ fontFamily: T.serif, fontSize: 24, letterSpacing: '0.02em', color: T.ink }}>Works</div>
            </div>
            <div ref={galleryRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
              {artworks.map((w, i) => (
                <div key={w.id} className="gallery-item" onClick={() => setSelectedArtwork(w)} style={{ cursor: 'pointer' }}>
                  {w.image_url ? (
                    <img src={w.image_url} alt={w.title} style={{ width: '100%', aspectRatio: '4 / 5', objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <div style={{ width: '100%', aspectRatio: '4 / 5', background: '#D9D6CE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontFamily: T.mono, fontSize: 9, color: 'rgba(0,0,0,0.35)', background: 'rgba(255,255,255,0.7)', padding: '2px 5px' }}>#{pad2(i + 1)}</span>
                    </div>
                  )}
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontFamily: T.serif, fontSize: 14, letterSpacing: '0.02em', color: T.ink }}>{w.title}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* org strip */}
        {org && (
          <div style={{ padding: '28px 32px', background: T.paperAlt, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 60 }}>
            <div>
              <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '0.18em', color: T.inkMuted, marginBottom: 6 }}>ORGANIZER</div>
              <Link to={`/${orgSlug}`} style={{ fontFamily: T.serif, fontSize: 18, textDecoration: 'none', color: T.ink }}>{org.name}</Link>
            </div>
            <div style={{ display: 'flex', gap: 20, fontFamily: T.mono, fontSize: 11, letterSpacing: '0.12em', color: T.inkSoft }}>
              {sns.instagram && <a href={sns.instagram} target="_blank" rel="noreferrer" style={{ color: T.inkSoft, textDecoration: 'none' }}>Instagram ↗</a>}
              {sns.x && <a href={sns.x} target="_blank" rel="noreferrer" style={{ color: T.inkSoft, textDecoration: 'none' }}>X ↗</a>}
              {org.homepage_url && <a href={org.homepage_url} target="_blank" rel="noreferrer" style={{ color: T.inkSoft, textDecoration: 'none' }}>Website ↗</a>}
              <Link to={`/${orgSlug}`} style={{ color: T.ink, textDecoration: 'none' }}>団体ページ →</Link>
            </div>
          </div>
        )}
      </div>
      <DesktopFooter />
      <ArtworkModal artwork={selectedArtwork} onClose={() => setSelectedArtwork(null)} />
    </div>
  )

  // mobile
  return (
    <div style={{ background: T.paper, minHeight: '100vh', paddingBottom: 80 }}>
      <Header activeTab="top" />

      <div style={{ padding: '12px 16px', borderBottom: `0.5px solid ${T.line}`, fontFamily: T.mono, fontSize: 10, letterSpacing: '0.12em', color: T.inkMuted, display: 'flex', gap: 6, alignItems: 'center' }}>
        <Link to="/" style={{ color: T.inkMuted, textDecoration: 'none' }}>← INDEX</Link>
        <span>/</span>
        <span style={{ color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{org?.name}</span>
      </div>

      {featured?.image_url ? (
        <img src={featured.image_url} alt={featured.title} style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'contain', display: 'block', background: '#D9D6CE' }} />
      ) : (
        <div style={{ width: '100%', aspectRatio: '1 / 1', background: '#D9D6CE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: T.mono, fontSize: 10, color: 'rgba(0,0,0,0.4)', background: 'rgba(255,255,255,0.75)', padding: '3px 7px' }}>{exhibition.title}</span>
        </div>
      )}

      <div style={{ padding: '22px 16px 10px' }}>
        <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.14em', color: T.inkMuted, marginBottom: 12 }}>EXHIBITION</div>
        <div style={{ fontFamily: T.serif, fontSize: 34, lineHeight: 1.25, letterSpacing: '0.02em', color: T.ink }}>{exhibition.title}</div>
        <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px', paddingTop: 16, borderTop: `0.5px solid ${T.line}` }}>
          {(exhibition.start_date || exhibition.end_date) && (
            <MetaCell label="DATES" value={`${fmtDateDot(exhibition.start_date)}\n— ${fmtDateDot(exhibition.end_date)}`} mono />
          )}
          <MetaCell label="WORKS" value={pad2(artworks.length)} mono />
          {exhibition.location && <MetaCell label="VENUE" value={exhibition.location} span={2} />}
          {org?.name && <MetaCell label="ORGANIZATION" value={org.name} span={2} />}
        </div>
        {exhibition.description && (
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: `0.5px solid ${T.line}`, fontSize: 13, lineHeight: 1.9, color: T.inkSoft, fontFamily: T.serifBody }}>{exhibition.description}</div>
        )}
        <button onClick={copyLink} style={{ marginTop: 24, width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'transparent', border: `1px solid ${T.ink}`, cursor: 'pointer', fontFamily: T.mono, fontSize: 11, letterSpacing: '0.1em', color: T.ink }}>
          <span style={{ color: T.inkSoft, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>artoir.net/…/{exhibition.slug}</span>
          <span style={{ marginLeft: 12, flexShrink: 0 }}>{copied ? 'COPIED ✓' : 'COPY'}</span>
        </button>
      </div>

      {artworks.length > 0 && (
        <div style={{ marginTop: 36, borderTop: `1px solid ${T.ink}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '16px 16px 12px' }}>
            <div style={{ fontFamily: T.serif, fontSize: 18, letterSpacing: '0.04em', color: T.ink }}>Works</div>
            <div style={{ fontFamily: T.mono, fontSize: 10, color: T.inkMuted, letterSpacing: '0.14em' }}>{pad2(artworks.length)} · TAP FOR DETAILS</div>
          </div>
          <div ref={galleryRef} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, background: T.line }}>
            {artworks.map((w, i) => (
              <div key={w.id} className="gallery-item" onClick={() => setSelectedArtwork(w)} style={{ background: T.paper, cursor: 'pointer', position: 'relative' }}>
                {w.image_url ? (
                  <img src={w.image_url} alt={w.title} style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div style={{ width: '100%', aspectRatio: '1 / 1', background: '#D9D6CE' }} />
                )}
                <div style={{ position: 'absolute', top: 4, left: 4, fontFamily: T.mono, fontSize: 8.5, letterSpacing: '0.1em', background: T.paper, padding: '2px 4px', color: T.inkMuted }}>{pad2(i + 1)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {org && (
        <div style={{ padding: '28px 16px 48px' }}>
          <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.inkMuted, marginBottom: 10 }}>ORGANIZER</div>
          <div style={{ display: 'flex', gap: 12, padding: '14px 0', borderTop: `0.5px solid ${T.ink}`, borderBottom: `0.5px solid ${T.ink}` }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Link to={`/${orgSlug}`} style={{ textDecoration: 'none' }}>
                <div style={{ fontFamily: T.serif, fontSize: 15, letterSpacing: '0.02em', color: T.ink }}>{org.name}</div>
              </Link>
              <div style={{ marginTop: 6, display: 'flex', gap: 14, fontFamily: T.mono, fontSize: 10, letterSpacing: '0.1em', color: T.inkSoft }}>
                {sns.instagram && <a href={sns.instagram} target="_blank" rel="noreferrer" style={{ color: T.inkSoft, textDecoration: 'none' }}>IG ↗</a>}
                {sns.x && <a href={sns.x} target="_blank" rel="noreferrer" style={{ color: T.inkSoft, textDecoration: 'none' }}>X ↗</a>}
                {org.homepage_url && <a href={org.homepage_url} target="_blank" rel="noreferrer" style={{ color: T.inkSoft, textDecoration: 'none' }}>WEB ↗</a>}
              </div>
            </div>
            <Link to={`/${orgSlug}`} style={{ width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: T.mono, fontSize: 14, color: T.ink, textDecoration: 'none' }}>→</Link>
          </div>
        </div>
      )}

      <ArtworkModal artwork={selectedArtwork} onClose={() => setSelectedArtwork(null)} />
      <BottomNav active="top" />
    </div>
  )
}
