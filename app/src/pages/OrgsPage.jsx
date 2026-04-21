import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { IS_DEV, demoOrgs, demoExhibitions } from '../lib/demoData'
import Header from '../components/Header'
import BottomNav from '../components/BottomNav'
import { T, pad2 } from '../lib/tokens'
import { useIsDesktop } from '../lib/useIsDesktop'

function DesktopFooter() {
  return (
    <div style={{ borderTop: `1px solid ${T.ink}`, marginTop: 80 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 32px', display: 'flex', justifyContent: 'space-between', fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.inkMuted }}>
        <span>© ARTPORT {new Date().getFullYear()}</span>
        <span>展覧会プラットフォーム</span>
      </div>
    </div>
  )
}

export default function OrgsPage() {
  const [orgs, setOrgs] = useState([])
  const [loading, setLoading] = useState(true)
  const isDesktop = useIsDesktop()

  useEffect(() => {
    async function load() {
      if (IS_DEV) {
        // attach exhibition count from demoData
        const counted = demoOrgs.map((o) => ({
          ...o,
          exh_count: demoExhibitions.filter((e) => e.org_id === o.id).length,
        }))
        setOrgs(counted)
        setLoading(false)
        return
      }
      if (!supabase) return setLoading(false)
      try {
        const { data } = await supabase
          .from('organizations')
          .select('*, exhibitions(count)')
          .order('name')
        setOrgs((data || []).map((o) => ({
          ...o,
          exh_count: o.exhibitions?.[0]?.count ?? 0,
        })))
      } catch { /* unavailable */ } finally { setLoading(false) }
    }
    load()
  }, [])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.paper }}>
      <span style={{ fontFamily: T.mono, color: T.inkMuted, letterSpacing: '0.2em', fontSize: 11 }}>...</span>
    </div>
  )

  if (isDesktop) return (
    <div style={{ background: T.paper, minHeight: '100vh' }}>
      <Header activeTab="orgs" />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px' }}>
        <div style={{ padding: '40px 0 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `1px solid ${T.ink}` }}>
          <div>
            <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.inkMuted, marginBottom: 8 }}>INDEX · ORGANIZATIONS</div>
            <div style={{ fontFamily: T.serif, fontSize: 42, letterSpacing: '0.01em', color: T.ink }}>団体一覧</div>
          </div>
          <div style={{ fontFamily: T.mono, fontSize: 11, color: T.inkMuted, letterSpacing: '0.16em' }}>{pad2(orgs.length)} ORGS</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr 80px', padding: '10px 0', gap: 20, borderBottom: `0.5px solid ${T.ink}`, fontFamily: T.mono, fontSize: 9, letterSpacing: '0.16em', color: T.inkMuted }}>
          <span>NO.</span><span>団体名</span><span style={{ textAlign: 'right' }}>展覧会数</span>
        </div>

        {orgs.map((o, i) => (
          <Link key={o.id} to={`/${o.slug}`} style={{ display: 'grid', gridTemplateColumns: '48px 1fr 80px', padding: '22px 0', gap: 20, alignItems: 'center', borderBottom: `0.5px solid ${T.line}`, cursor: 'pointer', textDecoration: 'none', color: T.ink }}>
            <div style={{ fontFamily: T.mono, fontSize: 11, color: T.inkMuted }}>{pad2(i + 1)}</div>
            <div>
              <div style={{ fontFamily: T.serif, fontSize: 18, letterSpacing: '0.02em' }}>{o.name}</div>
              {o.description && <div style={{ marginTop: 3, fontSize: 12, color: T.inkSoft }}>{o.description.slice(0, 60)}{o.description.length > 60 ? '…' : ''}</div>}
            </div>
            <div style={{ fontFamily: T.serif, fontSize: 20, textAlign: 'right' }}>{pad2(o.exh_count ?? 0)}</div>
          </Link>
        ))}

        {orgs.length === 0 && (
          <div style={{ padding: '60px 0', fontFamily: T.mono, fontSize: 11, color: T.inkMuted, letterSpacing: '0.1em' }}>NO ORGANIZATIONS YET</div>
        )}
        <div style={{ height: 60 }} />
      </div>
      <DesktopFooter />
    </div>
  )

  // mobile
  return (
    <div style={{ background: T.paper, minHeight: '100vh', paddingBottom: 80 }}>
      <Header activeTab="orgs" />

      <div style={{ padding: '14px 16px', borderBottom: `0.5px solid ${T.line}`, display: 'flex', justifyContent: 'space-between', fontFamily: T.mono, fontSize: 10, letterSpacing: '0.12em', color: T.inkMuted }}>
        <span>ORGANIZATIONS / ALL</span>
        <span>{pad2(orgs.length)} ORGS</span>
      </div>

      <div style={{ padding: '22px 16px 12px' }}>
        <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.inkMuted }}>INDEX · ORGS</div>
        <div style={{ marginTop: 6, fontFamily: T.serif, fontSize: 28, letterSpacing: '0.02em', color: T.ink }}>団体一覧</div>
        <div style={{ marginTop: 6, fontSize: 12, color: T.inkSoft, lineHeight: 1.8 }}>artport に登録されている美術大学・研究室・コレクティブ。</div>
      </div>

      <div style={{ borderTop: `1px solid ${T.ink}` }}>
        <div style={{ padding: '8px 16px', display: 'grid', gridTemplateColumns: '32px 1fr 48px', gap: 10, fontFamily: T.mono, fontSize: 9, letterSpacing: '0.16em', color: T.inkMuted, borderBottom: `0.5px solid ${T.ink}` }}>
          <span>NO.</span><span>団体名</span><span style={{ textAlign: 'right' }}>展覧会</span>
        </div>
        {orgs.map((o, i) => (
          <Link key={o.id} to={`/${o.slug}`} style={{ padding: '16px 16px', display: 'grid', gridTemplateColumns: '32px 1fr 48px', gap: 10, borderBottom: `0.5px solid ${T.line}`, cursor: 'pointer', textDecoration: 'none', color: T.ink, alignItems: 'center' }}>
            <div style={{ fontFamily: T.mono, fontSize: 11, color: T.inkMuted }}>{pad2(i + 1)}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: T.serif, fontSize: 15, letterSpacing: '0.02em', lineHeight: 1.4 }}>{o.name}</div>
            </div>
            <div style={{ textAlign: 'right', fontFamily: T.serif, fontSize: 18, color: T.ink }}>{pad2(o.exh_count ?? 0)}</div>
          </Link>
        ))}
        {orgs.length === 0 && (
          <div style={{ padding: '32px 16px', fontFamily: T.mono, fontSize: 11, color: T.inkMuted }}>NO ORGANIZATIONS YET</div>
        )}
      </div>

      <div style={{ height: 24 }} />
      <BottomNav active="orgs" />
    </div>
  )
}
