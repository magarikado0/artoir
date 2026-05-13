import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { IS_DEV, demoOrgs, demoExhibitions } from '../lib/demoData'
import Header from '../components/Header'
import BottomNav from '../components/BottomNav'
import { T, pad2 } from '../lib/tokens'
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

const loginForSetupState = { from: '/account/setup' }

export default function OrgsPage() {
  const { session } = useAuth()
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
    <div className="ui-page-shell" style={{ minHeight: '100vh' }}>
      <Header activeTab="orgs" />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px' }}>
        <div className="ui-strong-panel" style={{ marginTop: 28, padding: '36px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, background: T.card, border: `2px solid ${T.ink}`, boxShadow: `8px 8px 0 ${T.gold}` }}>
          <div>
            <div style={{ fontFamily: T.serif, fontSize: 38, letterSpacing: '0.01em', color: T.ink, lineHeight: 1.12 }}>団体一覧</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            {session ? (
              <Link to="/account/setup" className="ui-action" style={{ padding: '10px 18px', background: T.accent, color: T.paper, fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em', textDecoration: 'none', border: `1px solid ${T.paper}` }}>
                ＋ 新しい団体を作成
              </Link>
            ) : (
              <Link to="/login" state={loginForSetupState} className="ui-action" style={{ padding: '10px 18px', background: T.accent, color: T.paper, fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em', textDecoration: 'none', border: `1px solid ${T.paper}` }}>
                ログインして団体を作成
              </Link>
            )}
            <div style={{ fontFamily: T.mono, fontSize: 11, color: T.paper, background: T.ink, padding: '10px 12px', letterSpacing: '0.16em' }}>{pad2(orgs.length)} ORGS</div>
          </div>
        </div>

        <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: '48px 1fr 80px', padding: '10px 14px', gap: 20, border: `2px solid ${T.ink}`, background: T.ink, fontFamily: T.mono, fontSize: 9, letterSpacing: '0.16em', color: T.paper }}>
          <span>NO.</span><span>団体名</span><span style={{ textAlign: 'right' }}>展覧会数</span>
        </div>

        {orgs.map((o, i) => (
          <Link key={o.id} to={`/${o.slug}`} className="ui-row" style={{ display: 'grid', gridTemplateColumns: '48px 1fr 80px', padding: '22px 14px', gap: 20, alignItems: 'center', borderLeft: `2px solid ${T.ink}`, borderRight: `2px solid ${T.ink}`, borderBottom: `2px solid ${T.ink}`, cursor: 'pointer', textDecoration: 'none', color: T.ink, background: i % 2 === 0 ? T.card : T.paperAlt }}>
            <div style={{ width: 28, height: 28, background: i === 0 ? T.accentInk : T.paperAlt, color: i === 0 ? T.paper : T.inkMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: T.mono, fontSize: 10 }}>{pad2(i + 1)}</div>
            <div>
              <div style={{ fontFamily: T.serif, fontSize: 18, letterSpacing: '0.02em' }}>{o.name}</div>
              {o.description && <div style={{ marginTop: 3, fontSize: 12, color: T.inkSoft }}>{o.description.slice(0, 60)}{o.description.length > 60 ? '…' : ''}</div>}
            </div>
            <div style={{ fontFamily: T.serif, fontSize: 20, textAlign: 'right' }}>{pad2(o.exh_count ?? 0)}</div>
          </Link>
        ))}

        {orgs.length === 0 && (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <div style={{ fontFamily: T.mono, fontSize: 11, color: T.inkMuted, letterSpacing: '0.1em', marginBottom: 20 }}>NO ORGANIZATIONS YET</div>
            {session ? (
              <Link to="/account/setup" className="ui-action" style={{ display: 'inline-flex', padding: '12px 22px', background: T.ink, color: T.paper, fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em', textDecoration: 'none', border: `1px solid ${T.paper}` }}>
                ＋ 新しい団体を作成
              </Link>
            ) : (
              <Link to="/login" state={loginForSetupState} className="ui-action" style={{ display: 'inline-flex', padding: '12px 22px', background: T.ink, color: T.paper, fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em', textDecoration: 'none', border: `1px solid ${T.paper}` }}>
                ログインして団体を作成
              </Link>
            )}
          </div>
        )}
        <div style={{ height: 60 }} />
      </div>
      <DesktopFooter />
    </div>
  )

  // mobile
  return (
    <div className="ui-page-shell" style={{ minHeight: '100vh', paddingBottom: 72 }}>
      <Header activeTab="orgs" />

      <div style={{ padding: '10px 14px', borderBottom: `2px solid ${T.ink}`, background: T.card, display: 'flex', justifyContent: 'space-between', fontFamily: T.mono, fontSize: 9, letterSpacing: '0.12em', color: T.inkMuted }}>
        <span>{pad2(orgs.length)} ORGS</span>
      </div>

      <div style={{ padding: '14px 14px 10px' }}>
        <div style={{ marginTop: 4, fontFamily: T.serif, fontSize: 22, letterSpacing: '0.02em', color: T.ink, lineHeight: 1.2 }}>団体一覧</div>
        <div style={{ marginTop: 5, fontSize: 11, color: T.inkSoft, lineHeight: 1.65 }}>Artoir に登録されている美術大学・研究室・コレクティブ</div>
        <div style={{ marginTop: 12 }}>
          {session ? (
            <Link to="/account/setup" className="ui-action" style={{ display: 'block', textAlign: 'center', padding: '10px 14px', background: T.accent, color: T.paper, fontFamily: T.mono, fontSize: 10, letterSpacing: '0.12em', textDecoration: 'none', border: `1px solid ${T.paper}` }}>
              ＋ 新しい団体を作成
            </Link>
          ) : (
            <Link to="/login" state={loginForSetupState} className="ui-action" style={{ display: 'block', textAlign: 'center', padding: '10px 14px', background: T.accent, color: T.paper, fontFamily: T.mono, fontSize: 10, letterSpacing: '0.12em', textDecoration: 'none', border: `1px solid ${T.paper}` }}>
              ログインして団体を作成
            </Link>
          )}
        </div>
      </div>

      <div style={{ margin: '12px 16px 0' }}>
        <div style={{ padding: '6px 14px', display: 'grid', gridTemplateColumns: '32px 1fr 44px', gap: 8, fontFamily: T.mono, fontSize: 8, letterSpacing: '0.14em', color: T.paper, background: T.ink, border: `2px solid ${T.ink}` }}>
          <span>NO.</span><span>団体名</span><span style={{ textAlign: 'right' }}>展覧会</span>
        </div>
        {orgs.map((o, i) => (
          <Link key={o.id} to={`/${o.slug}`} className="ui-row" style={{ padding: '11px 14px', display: 'grid', gridTemplateColumns: '32px 1fr 44px', gap: 8, borderLeft: `2px solid ${T.ink}`, borderRight: `2px solid ${T.ink}`, borderBottom: `2px solid ${T.ink}`, cursor: 'pointer', textDecoration: 'none', color: T.ink, alignItems: 'center', background: i % 2 === 0 ? T.card : T.paperAlt }}>
            <div style={{ width: 24, height: 24, background: i === 0 ? T.accentInk : T.paperAlt, color: i === 0 ? T.paper : T.inkMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: T.mono, fontSize: 9 }}>{pad2(i + 1)}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: T.serif, fontSize: 14, letterSpacing: '0.02em', lineHeight: 1.35 }}>{o.name}</div>
            </div>
            <div style={{ textAlign: 'right', fontFamily: T.serif, fontSize: 16, color: T.ink }}>{pad2(o.exh_count ?? 0)}</div>
          </Link>
        ))}
        {orgs.length === 0 && (
          <div style={{ padding: '32px 16px', textAlign: 'center', fontFamily: T.mono, fontSize: 11, color: T.inkMuted, borderLeft: `2px solid ${T.ink}`, borderRight: `2px solid ${T.ink}`, borderBottom: `2px solid ${T.ink}`, background: T.card }}>
            <div style={{ marginBottom: 16 }}>NO ORGANIZATIONS YET</div>
            {session ? (
              <Link to="/account/setup" style={{ color: T.accent, textDecoration: 'underline', letterSpacing: '0.08em' }}>＋ 新しい団体を作成</Link>
            ) : (
              <Link to="/login" state={loginForSetupState} style={{ color: T.accent, textDecoration: 'underline', letterSpacing: '0.08em' }}>ログインして団体を作成</Link>
            )}
          </div>
        )}
      </div>

      <div style={{ height: 24 }} />
      <BottomNav active="orgs" />
    </div>
  )
}
