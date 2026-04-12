import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { IS_DEV, demoOrgs, demoExhibitions } from '../lib/demoData'
import Header from '../components/Header'

const GAP = 'clamp(2rem, 5vw, 5rem)'

function formatYear(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).getFullYear()
}

function formatDateRange(start, end) {
  if (!start) return ''
  const fmt = (d) => {
    const date = new Date(d)
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
  }
  return end ? `${fmt(start)} — ${fmt(end)}` : fmt(start)
}

const S = {
  page: { background: '#f5f0e8', minHeight: '100vh' },
  hero: {
    padding: `calc(${GAP} * 2) ${GAP} ${GAP}`,
    borderBottom: '1px solid rgba(26,22,18,0.1)',
  },
  label: {
    fontFamily: 'Cormorant Garamond, serif',
    fontSize: '0.65rem',
    letterSpacing: '0.35em',
    textTransform: 'uppercase',
    color: '#c0392b',
    marginBottom: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  orgName: {
    fontFamily: 'Shippori Mincho, serif',
    fontSize: 'clamp(3.5rem, 10vw, 9rem)',
    fontWeight: 400,
    lineHeight: 1.0,
    letterSpacing: '-0.02em',
    color: '#1a1612',
    marginBottom: '1.5rem',
  },
  desc: {
    fontSize: '0.9rem',
    lineHeight: 2,
    color: '#3d3530',
    maxWidth: '60ch',
    marginBottom: '2rem',
  },
  socialLinks: {
    display: 'flex',
    gap: '1.5rem',
    flexWrap: 'wrap',
  },
  socialLink: {
    fontSize: '0.75rem',
    letterSpacing: '0.15em',
    color: '#9a9088',
    textDecoration: 'none',
    borderBottom: '1px solid transparent',
    paddingBottom: '0.1rem',
    transition: 'color 0.2s, border-color 0.2s',
  },
  exhibitions: {
    background: '#1a1612',
    padding: `calc(${GAP} * 1.5) ${GAP}`,
  },
  exhLabel: {
    fontFamily: 'Cormorant Garamond, serif',
    fontSize: '0.65rem',
    letterSpacing: '0.35em',
    textTransform: 'uppercase',
    color: '#b8932a',
    marginBottom: '2.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  exhRow: {
    display: 'grid',
    gridTemplateColumns: '6rem 1fr auto',
    alignItems: 'center',
    gap: '2rem',
    padding: '1.5rem 0',
    borderBottom: '1px solid rgba(245,240,232,0.08)',
    textDecoration: 'none',
    color: 'inherit',
    transition: 'background 0.2s',
  },
  exhYear: {
    fontFamily: 'Cormorant Garamond, serif',
    fontSize: '2rem',
    fontWeight: 300,
    color: 'rgba(245,240,232,0.2)',
  },
  exhTitle: {
    fontFamily: 'Shippori Mincho, serif',
    fontSize: '1.1rem',
    color: '#f5f0e8',
  },
  exhSub: {
    fontSize: '0.7rem',
    color: 'rgba(245,240,232,0.4)',
    letterSpacing: '0.1em',
    marginTop: '0.25rem',
    fontFamily: 'Cormorant Garamond, serif',
  },
  exhArrow: {
    fontSize: '1rem',
    color: 'rgba(245,240,232,0.3)',
  },
  footer: {
    padding: `2rem ${GAP}`,
    borderTop: '1px solid rgba(26,22,18,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.7rem',
    color: '#9a9088',
    letterSpacing: '0.1em',
  },
}

export default function OrgPage() {
  const { orgSlug } = useParams()
  const [org, setOrg] = useState(null)
  const [exhibitions, setExhibitions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (IS_DEV) {
        const org = demoOrgs.find((o) => o.slug === orgSlug) ?? demoOrgs[0]
        setOrg(org)
        setExhibitions(demoExhibitions.filter((e) => e.org_id === org.id))
        setLoading(false)
        return
      }
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
          .eq('org_id', orgData.id)
          .order('start_date', { ascending: false })

        setExhibitions(exhData || [])
      } catch {
        // Supabase unavailable — show empty state
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [orgSlug])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f0e8' }}>
      <span style={{ fontFamily: 'Cormorant Garamond, serif', color: '#9a9088', letterSpacing: '0.2em', fontSize: '0.8rem' }}>...</span>
    </div>
  )

  if (!org) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f0e8' }}>
      <p style={{ color: '#9a9088', fontSize: '0.9rem' }}>団体が見つかりません</p>
    </div>
  )

  const sns = org.sns_links || {}

  return (
    <div style={S.page}>
      <Header orgName={org.name} orgSlug={orgSlug} />

      {/* Org Hero */}
      <section style={S.hero}>
        <div style={S.label}>Organization</div>
        <h1 style={S.orgName}>{org.name}</h1>
        {org.description && <p style={S.desc}>{org.description}</p>}
        <div style={S.socialLinks}>
          {sns.instagram && (
            <a href={sns.instagram} target="_blank" rel="noreferrer" style={S.socialLink}>Instagram</a>
          )}
          {sns.x && (
            <a href={sns.x} target="_blank" rel="noreferrer" style={S.socialLink}>X</a>
          )}
          {org.homepage_url && (
            <a href={org.homepage_url} target="_blank" rel="noreferrer" style={S.socialLink}>公式サイト</a>
          )}
        </div>
      </section>

      {/* Exhibitions List */}
      <section style={S.exhibitions}>
        <div style={S.exhLabel}>All Exhibitions</div>
        <div>
          {exhibitions.map((exh, i) => (
            <Link
              key={exh.id}
              to={`/${orgSlug}/exhibition/${exh.slug}`}
              style={{
                ...S.exhRow,
                ...(i === 0 ? { borderTop: '1px solid rgba(245,240,232,0.08)' } : {}),
              }}
            >
              <div style={S.exhYear}>{formatYear(exh.start_date)}</div>
              <div>
                <div style={S.exhTitle}>{exh.title}</div>
                <div style={S.exhSub}>{exh.location} · {formatDateRange(exh.start_date, exh.end_date)}</div>
              </div>
              <div style={S.exhArrow}>→</div>
            </Link>
          ))}
          {exhibitions.length === 0 && (
            <p style={{ color: 'rgba(245,240,232,0.3)', fontSize: '0.85rem', padding: '2rem 0' }}>展覧会はまだありません</p>
          )}
        </div>
      </section>

      <footer style={S.footer}>
        <div>© {new Date().getFullYear()} Artport</div>
        <div>展覧会のポータル</div>
      </footer>
    </div>
  )
}
