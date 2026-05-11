import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { IS_DEV, demoOrgs, demoExhibitions } from '../lib/demoData'
import Header from '../components/Header'
import BottomNav from '../components/BottomNav'
import { T, fmtDateDot, pad2, externalHost } from '../lib/tokens'
import { useIsDesktop } from '../lib/useIsDesktop'

function DesktopFooter() {
  return (
    <div style={{ borderTop: `1px solid ${T.ink}`, marginTop: 80 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 32px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.inkMuted }}>
        <span>© Artoir {new Date().getFullYear()}</span>
        <span>展覧会プラットフォーム</span>
        <span>Artoir(アルトワール)</span>
      </div>
    </div>
  )
}

export default function OrgPage() {
  const { orgSlug } = useParams()
  const [org, setOrg] = useState(null)
  const [exhibitions, setExhibitions] = useState([])
  const [loading, setLoading] = useState(true)
  const isDesktop = useIsDesktop()

  useEffect(() => {
    async function load() {
      if (IS_DEV) {
        const org = demoOrgs.find((o) => o.slug === orgSlug) ?? demoOrgs[0]
        setOrg(org)
        setExhibitions(demoExhibitions.filter((e) => e.org_id === org.id))
        setLoading(false); return
      }
      if (!supabase) return setLoading(false)
      try {
        const { data: orgData } = await supabase.from('organizations').select('*').eq('slug', orgSlug).single()
        if (!orgData) return setLoading(false)
        setOrg(orgData)
        const { data: exhData } = await supabase.from('exhibitions').select('*').eq('org_id', orgData.id).order('start_date', { ascending: false })
        setExhibitions(exhData || [])
      } catch { /* unavailable */ } finally { setLoading(false) }
    }
    load()
  }, [orgSlug])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.paper }}>
      <span style={{ fontFamily: T.mono, color: T.inkMuted, letterSpacing: '0.2em', fontSize: 11 }}>...</span>
    </div>
  )
  if (!org) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.paper }}>
      <p style={{ color: T.inkMuted, fontSize: 13 }}>団体が見つかりません</p>
    </div>
  )

  const sns = org.sns_links || {}

  if (isDesktop) return (
    <div style={{ background: T.paper, minHeight: '100vh' }}>
      <Header activeTab="orgs" />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px' }}>
        <div style={{ padding: '48px 0 40px', display: 'grid', gridTemplateColumns: '1fr 340px', gap: 64, borderBottom: `1px solid ${T.ink}` }}>
          <div>
            <div style={{ fontFamily: T.serif, fontSize: 36, lineHeight: 1.3, letterSpacing: '0.01em', color: T.ink }}>{org.name}</div>
            {org.description && (
              <div style={{ marginTop: 24, fontSize: 14, lineHeight: 2, color: T.inkSoft, fontFamily: T.serifBody, maxWidth: 600 }}>{org.description}</div>
            )}
          </div>
          <div style={{ paddingTop: 8 }}>
            {[
              sns.instagram && ['INSTAGRAM', sns.instagram],
              sns.x && ['X (TWITTER)', sns.x],
              org.homepage_url && ['WEBSITE', org.homepage_url],
            ].filter(Boolean).map(([k, href]) => (
              <a
                key={k}
                href={href}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  padding: '14px 12px', marginBottom: 8,
                  border: `1px solid ${T.line}`, background: T.card,
                  textDecoration: 'none', color: T.ink,
                  borderLeft: `4px solid ${T.accent}`,
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span aria-hidden style={{ fontSize: 14 }}>🔗</span>
                  <span style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '0.14em', color: T.inkMuted }}>{k}</span>
                </span>
                <span style={{
                  fontFamily: T.serifBody, fontSize: 12, color: T.accent,
                  textDecoration: 'underline', textUnderlineOffset: 3,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '52%',
                }}
                >
                  {externalHost(href)} · ↗
                </span>
              </a>
            ))}
          </div>
        </div>

        <div style={{ padding: '32px 0 60px' }}>
          <div style={{ fontFamily: T.serif, fontSize: 24, letterSpacing: '0.02em', marginBottom: 24, color: T.ink }}>展覧会</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
            {exhibitions.map((exh) => (
              <Link key={exh.id} to={`/${orgSlug}/exhibition/${exh.slug}`} style={{ textDecoration: 'none', color: T.ink }}>
                <div style={{ width: '100%', aspectRatio: '4 / 3', background: '#D9D6CE' }} />
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontFamily: T.serif, fontSize: 17, letterSpacing: '0.02em' }}>{exh.title}</div>
                  <div style={{ marginTop: 4, fontFamily: T.mono, fontSize: 10, letterSpacing: '0.1em', color: T.inkMuted }}>{fmtDateDot(exh.start_date)} — {fmtDateDot(exh.end_date)}</div>
                  {exh.location && <div style={{ marginTop: 4, fontSize: 11, color: T.inkSoft }}>{exh.location}</div>}
                </div>
              </Link>
            ))}
            {exhibitions.length === 0 && (
              <div style={{ fontFamily: T.mono, fontSize: 11, color: T.inkMuted, letterSpacing: '0.1em' }}>NO EXHIBITIONS YET</div>
            )}
          </div>
        </div>
      </div>
      <DesktopFooter />
    </div>
  )

  // mobile
  return (
    <div style={{ background: T.paper, minHeight: '100vh', paddingBottom: 72 }}>
      <Header activeTab="orgs" />
      <div style={{ padding: '10px 14px', borderBottom: `0.5px solid ${T.line}`, fontFamily: T.mono, fontSize: 9, letterSpacing: '0.1em', color: T.inkMuted }}>
        <Link to="/" style={{ color: T.inkMuted, textDecoration: 'none' }}>← INDEX</Link>
        {' '}/ ORGANIZATION
      </div>
      <div style={{ padding: '18px 14px 12px' }}>
        <div style={{ fontFamily: T.serif, fontSize: 22, lineHeight: 1.3, letterSpacing: '0.02em', color: T.ink }}>{org.name}</div>
        {org.description && <div style={{ marginTop: 14, fontSize: 12, lineHeight: 1.85, color: T.inkSoft, fontFamily: T.serifBody }}>{org.description}</div>}
      </div>

      {(sns.instagram || sns.x || org.homepage_url) && (
        <div style={{ margin: '4px 14px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            sns.instagram && ['Instagram', sns.instagram],
            sns.x && ['X', sns.x],
            org.homepage_url && ['公式サイト', org.homepage_url],
          ].filter(Boolean).map(([label, href]) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                padding: '8px 10px',
                border: `1px solid ${T.line}`,
                borderLeft: `3px solid ${T.accent}`,
                background: T.card,
                textDecoration: 'none',
                color: T.ink,
                minWidth: 0,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <span aria-hidden style={{ fontSize: 12 }}>🔗</span>
                <span style={{ fontFamily: T.serif, fontSize: 13, letterSpacing: '0.02em' }}>{label}</span>
              </span>
              <span
                style={{
                  flex: '1 1 0%',
                  fontFamily: T.serifBody,
                  fontSize: 10,
                  color: T.accent,
                  textDecoration: 'underline',
                  textUnderlineOffset: 2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  minWidth: 0,
                  textAlign: 'right',
                }}
              >
                {externalHost(href)} · ↗
              </span>
            </a>
          ))}
        </div>
      )}

      <div style={{ borderTop: `1px solid ${T.ink}` }}>
        <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', fontFamily: T.mono, fontSize: 9, letterSpacing: '0.14em', color: T.inkMuted, borderBottom: `0.5px solid ${T.ink}` }}>
          <span>EXHIBITIONS</span><span>{pad2(exhibitions.length)} · ALL</span>
        </div>
        {exhibitions.map((exh, i) => (
          <Link key={exh.id} to={`/${orgSlug}/exhibition/${exh.slug}`} style={{ padding: '14px 16px', borderBottom: `0.5px solid ${T.line}`, display: 'flex', gap: 12, textDecoration: 'none', color: T.ink }}>
            <div style={{ width: 36, fontFamily: T.mono, fontSize: 11, color: T.inkMuted, paddingTop: 2, flexShrink: 0 }}>{pad2(i + 1)}</div>
            <div style={{ width: 54, flexShrink: 0, aspectRatio: '1 / 1', alignSelf: 'flex-start', background: '#D9D6CE' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: T.serif, fontSize: 15, letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{exh.title}</div>
              <div style={{ marginTop: 3, fontFamily: T.mono, fontSize: 10, letterSpacing: '0.08em', color: T.inkMuted }}>{fmtDateDot(exh.start_date)} — {fmtDateDot(exh.end_date)}</div>
              {exh.location && <div style={{ marginTop: 3, fontSize: 10.5, color: T.inkSoft, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{exh.location}</div>}
            </div>
          </Link>
        ))}
        {exhibitions.length === 0 && <div style={{ padding: '32px 16px', fontFamily: T.mono, fontSize: 11, color: T.inkMuted }}>NO EXHIBITIONS YET</div>}
      </div>

      <div style={{ height: 40 }} />
      <BottomNav active="orgs" />
    </div>
  )
}
