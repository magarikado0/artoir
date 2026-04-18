import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { IS_DEV, demoOrgs, demoExhibitions } from '../lib/demoData'
import Header from '../components/Header'

const GAP = 'clamp(2rem, 5vw, 5rem)'

function formatDateRange(start, end) {
  if (!start) return ''
  const fmt = (d) => {
    const date = new Date(d)
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
  }
  return end ? `${fmt(start)} — ${fmt(end)}` : fmt(start)
}

function formatYear(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).getFullYear()
}

export default function AllExhibitionsPage() {
  const [rows, setRows] = useState([]) // { exhibition, org }[]
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (IS_DEV) {
        const orgMap = Object.fromEntries(demoOrgs.map((o) => [o.id, o]))
        setRows(
          demoExhibitions.map((exh) => ({ exhibition: exh, org: orgMap[exh.org_id] }))
        )
        setLoading(false)
        return
      }
      if (!supabase) return setLoading(false)
      try {
        const { data } = await supabase
          .from('exhibitions')
          .select('*, organizations(id, name, slug)')
          .order('start_date', { ascending: false })
        setRows(
          (data || []).map((exh) => {
            const { organizations: org, ...exhibition } = exh
            return { exhibition, org }
          })
        )
      } catch {
        // Supabase unavailable
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f0e8' }}>
      <span style={{ fontFamily: 'Cormorant Garamond, serif', color: '#9a9088', letterSpacing: '0.2em', fontSize: '0.8rem' }}>...</span>
    </div>
  )

  return (
    <div style={{ background: '#f5f0e8', minHeight: '100vh' }}>
      <Header />

      {/* Heading */}
      <section style={{
        padding: `calc(${GAP} * 2) ${GAP} ${GAP}`,
        borderBottom: '1px solid rgba(26,22,18,0.1)',
      }}>
        <div style={{
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: '0.65rem',
          letterSpacing: '0.35em',
          textTransform: 'uppercase',
          color: '#c0392b',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <span style={{ display: 'block', width: '2rem', height: '1px', background: '#c0392b' }} />
          All Exhibitions
        </div>
        <h1 style={{
          fontFamily: 'Shippori Mincho, serif',
          fontSize: 'clamp(2rem, 5vw, 3.5rem)',
          fontWeight: 400,
          color: '#1a1612',
          marginBottom: '0.75rem',
        }}>
          すべての展覧会
        </h1>
        <p style={{ fontSize: '0.85rem', color: '#9a9088', letterSpacing: '0.05em' }}>
          {rows.length} 件
        </p>
        <div style={{ marginTop: '1.5rem' }}>
          <span
            style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: '0.8rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'rgba(26,22,18,0.3)',
              borderBottom: '1px solid rgba(26,22,18,0.15)',
              paddingBottom: '0.1rem',
              cursor: 'default',
            }}
          >
            自分の展覧会を作る →
          </span>
        </div>
      </section>

      {/* List */}
      <section style={{ background: '#1a1612', padding: `calc(${GAP} * 1.5) ${GAP}` }}>
        <div>
          {rows.map(({ exhibition: exh, org }, i) => (
            <Link
              key={exh.id}
              to={`/${org?.slug}/exhibition/${exh.slug}`}
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
              className="exh-row"
            >
              <div style={{
                fontFamily: 'Cormorant Garamond, serif',
                fontSize: '2rem',
                fontWeight: 300,
                color: 'rgba(245,240,232,0.2)',
              }}>
                {formatYear(exh.start_date)}
              </div>
              <div>
                <div style={{
                  fontFamily: 'Shippori Mincho, serif',
                  fontSize: '1.1rem',
                  color: '#f5f0e8',
                  marginBottom: '0.3rem',
                }}>
                  {exh.title}
                </div>
                <div style={{
                  fontSize: '0.7rem',
                  color: 'rgba(245,240,232,0.4)',
                  letterSpacing: '0.08em',
                  fontFamily: 'Cormorant Garamond, serif',
                }}>
                  {org?.name} · {exh.location} · {formatDateRange(exh.start_date, exh.end_date)}
                </div>
              </div>
              <div style={{ fontSize: '1rem', color: 'rgba(245,240,232,0.3)' }}>→</div>
            </Link>
          ))}
          {rows.length === 0 && (
            <p style={{ color: 'rgba(245,240,232,0.3)', fontSize: '0.85rem', padding: '2rem 0' }}>
              展覧会はまだありません
            </p>
          )}
        </div>
      </section>

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

      <style>{`
        .exh-row:hover { background: rgba(245,240,232,0.04); }
      `}</style>
    </div>
  )
}
