import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import Header from '../components/Header'
import BottomNav from '../components/BottomNav'
import { StatusBadge } from '../components/DashShell'
import { exhStatus } from '../lib/exhibitionStatus'
import { T, fmtDateDot, pad2 } from '../lib/tokens'
import { useIsDesktop } from '../lib/useIsDesktop'

function LoggedOut({ isDesktop }) {
  const navigate = useNavigate()
  const benefits = [
    ['01', '団体ページを作る', '展覧会の活動母体として情報を公開。'],
    ['02', '展覧会を公開する', '作品・会期・会場を入力し、URL一つで共有。'],
    ['03', '作品を管理する',   '画像・タイトル・技法を登録、並び替えも可。'],
  ]

  if (isDesktop) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 32px' }}>
      <div style={{ width: 480 }}>
        <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.inkMuted, marginBottom: 8 }}>GUEST</div>
        <div style={{ fontFamily: T.serif, fontSize: 36, letterSpacing: '0.02em', color: T.ink, marginBottom: 8 }}>アカウント</div>
        <div style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.9, fontFamily: T.serifBody, marginBottom: 28 }}>
          ログインすると、あなたの団体として展覧会を作成・編集できます。
        </div>
        <Link to="/login" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: T.ink, color: T.paper, padding: '16px 20px', fontFamily: T.sans, fontWeight: 500, fontSize: 13, letterSpacing: '0.14em', textDecoration: 'none', boxSizing: 'border-box' }}>
          <span>ログイン / 新規登録</span>
          <span style={{ fontFamily: T.mono, fontSize: 12 }}>→</span>
        </Link>
        <div style={{ marginTop: 36 }}>
          <div style={{ paddingBottom: 8, borderBottom: `1px solid ${T.ink}`, fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.ink }}>ログインでできること</div>
          {benefits.map(([n, t, d]) => (
            <div key={n} style={{ padding: '16px 0', borderBottom: `0.5px solid ${T.line}`, display: 'grid', gridTemplateColumns: '32px 1fr', gap: 10 }}>
              <div style={{ fontFamily: T.mono, fontSize: 11, color: T.accent }}>{n}</div>
              <div>
                <div style={{ fontFamily: T.serif, fontSize: 15, color: T.ink }}>{t}</div>
                <div style={{ marginTop: 4, fontSize: 12, color: T.inkSoft, lineHeight: 1.7 }}>{d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ padding: '28px 16px' }}>
      <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.inkMuted }}>GUEST</div>
      <div style={{ marginTop: 6, fontFamily: T.serif, fontSize: 28, letterSpacing: '0.02em', lineHeight: 1.35, color: T.ink }}>アカウント</div>
      <div style={{ marginTop: 8, fontSize: 13, color: T.inkSoft, lineHeight: 1.9 }}>ログインすると、あなたの団体として展覧会を作成・編集できます。</div>
      <button onClick={() => navigate('/login')} style={{ marginTop: 22, width: '100%', background: T.ink, color: T.paper, border: 'none', padding: '16px', fontFamily: T.sans, fontWeight: 500, fontSize: 13, letterSpacing: '0.14em', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>ログイン / 新規登録</span>
        <span style={{ fontFamily: T.mono, fontSize: 12 }}>→</span>
      </button>
      <div style={{ marginTop: 32 }}>
        <div style={{ paddingBottom: 8, borderBottom: `1px solid ${T.ink}`, fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.ink }}>ログインでできること</div>
        {benefits.map(([n, t, d]) => (
          <div key={n} style={{ padding: '16px 0', borderBottom: `0.5px solid ${T.line}`, display: 'grid', gridTemplateColumns: '32px 1fr', gap: 10 }}>
            <div style={{ fontFamily: T.mono, fontSize: 11, color: T.accent }}>{n}</div>
            <div>
              <div style={{ fontFamily: T.serif, fontSize: 15, color: T.ink }}>{t}</div>
              <div style={{ marginTop: 4, fontSize: 12, color: T.inkSoft, lineHeight: 1.7 }}>{d}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Single org view — shown when user belongs to exactly one org, or after selecting from multi-org list
function OrgView({ org, exhibitions, isDesktop, onBack }) {
  const navigate = useNavigate()
  const liveCount = exhibitions.filter((e) => exhStatus(e) === 'live').length

  if (isDesktop) return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px' }}>
      <div style={{ padding: '36px 0 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `1px solid ${T.ink}` }}>
        <div>
          {onBack && <div onClick={onBack} style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.12em', color: T.inkMuted, marginBottom: 10, cursor: 'pointer' }}>← BACK</div>}
          <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.inkMuted, marginBottom: 8 }}>SIGNED IN AS</div>
          <div style={{ fontFamily: T.serif, fontSize: 32, letterSpacing: '0.01em', color: T.ink }}>{org.name}</div>
        </div>
        <Link to={`/${org.slug}/dashboard`} style={{ background: T.ink, color: T.paper, padding: '12px 20px', fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em', textDecoration: 'none' }}>
          DASHBOARD →
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 48, padding: '32px 0 60px' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
            <div style={{ fontFamily: T.serif, fontSize: 22, letterSpacing: '0.02em', color: T.ink }}>展覧会</div>
            <Link to={`/${org.slug}/dashboard/exhibitions`} style={{ fontFamily: T.mono, fontSize: 10, color: T.inkMuted, letterSpacing: '0.14em', textDecoration: 'none' }}>MANAGE ALL →</Link>
          </div>
          <div style={{ borderTop: `1px solid ${T.ink}` }}>
            <div style={{ display: 'grid', gridTemplateColumns: '32px 56px 1fr 140px 120px', gap: 14, padding: '10px 0', borderBottom: `0.5px solid ${T.ink}`, fontFamily: T.mono, fontSize: 9, letterSpacing: '0.14em', color: T.inkMuted }}>
              <span></span><span></span><span>タイトル</span><span>会期</span><span>STATUS</span>
            </div>
            {exhibitions.slice(0, 5).map((exh, i) => (
              <div key={exh.id} style={{ display: 'grid', gridTemplateColumns: '32px 56px 1fr 140px 120px', gap: 14, padding: '16px 0', borderBottom: `0.5px solid ${T.line}`, alignItems: 'center' }}>
                <div style={{ fontFamily: T.mono, fontSize: 10, color: T.inkMuted }}>{pad2(i + 1)}</div>
                <div style={{ width: 48, height: 48, background: '#D9D6CE' }} />
                <div style={{ fontFamily: T.serif, fontSize: 15, letterSpacing: '0.02em', color: T.ink }}>{exh.title}</div>
                <div style={{ fontFamily: T.mono, fontSize: 10, color: T.inkMuted, lineHeight: 1.5 }}>
                  {fmtDateDot(exh.start_date)}<br/>— {fmtDateDot(exh.end_date)}
                </div>
                <StatusBadge kind={exhStatus(exh)} />
              </div>
            ))}
            {exhibitions.length === 0 && <div style={{ padding: '24px 0', fontFamily: T.mono, fontSize: 11, color: T.inkMuted }}>展覧会がまだありません</div>}
          </div>
        </div>

        <div>
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.inkMuted, marginBottom: 12 }}>OVERVIEW</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: T.line }}>
              {[['EXHIBITS', pad2(exhibitions.length)], ['LIVE', pad2(liveCount)]].map(([k, v]) => (
                <div key={k} style={{ background: T.paper, padding: '14px 12px' }}>
                  <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '0.14em', color: T.inkMuted }}>{k}</div>
                  <div style={{ marginTop: 4, fontFamily: T.serif, fontSize: 22, color: T.ink }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.inkMuted, marginBottom: 12 }}>QUICK LINKS</div>
          {[
            [`/${org.slug}/dashboard/exhibitions/new`, '新しい展覧会を作成', '＋ NEW'],
            [`/${org.slug}/dashboard/settings`, '団体設定', 'SETTINGS'],
            [`/${org.slug}`, '公開ページを確認', 'VIEW ↗'],
          ].map(([to, label, en]) => (
            <Link key={to} to={to} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 12px', border: `0.5px solid ${T.line}`, marginBottom: 6, textDecoration: 'none', background: T.card, color: T.ink }}>
              <span style={{ fontFamily: T.serif, fontSize: 14 }}>{label}</span>
              <span style={{ fontFamily: T.mono, fontSize: 10, color: T.inkMuted }}>{en}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )

  // mobile
  return (
    <>
      <div style={{ padding: '24px 16px 16px' }}>
        {onBack && <div onClick={onBack} style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.12em', color: T.inkMuted, marginBottom: 12, cursor: 'pointer' }}>← BACK</div>}
        <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.inkMuted, marginBottom: 10 }}>SIGNED IN AS</div>
        <div style={{ fontFamily: T.serif, fontSize: 22, lineHeight: 1.35, letterSpacing: '0.02em', color: T.ink }}>{org.name}</div>
        {org.description && <div style={{ marginTop: 6, fontSize: 12, color: T.inkSoft, lineHeight: 1.7 }}>{org.description.split('。')[0]}。</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: T.line, margin: '4px 16px 20px' }}>
        {[['EXHIBITS', pad2(exhibitions.length)], ['LIVE', pad2(liveCount)]].map(([k, v]) => (
          <div key={k} style={{ background: T.paper, padding: '14px 10px' }}>
            <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '0.16em', color: T.inkMuted }}>{k}</div>
            <div style={{ marginTop: 4, fontFamily: T.serif, fontSize: 22, letterSpacing: '0.02em', color: T.ink }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button onClick={() => navigate(`/${org.slug}/dashboard/exhibitions/new`)} style={{ width: '100%', background: T.ink, color: T.paper, border: 'none', padding: '16px', fontFamily: T.sans, fontWeight: 500, fontSize: 13, letterSpacing: '0.14em', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>＋  新しい展覧会を作成</span>
          <span style={{ fontFamily: T.mono, fontSize: 12 }}>→</span>
        </button>
        <Link to={`/${org.slug}/dashboard/settings`} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 12px', border: `1px solid ${T.ink}`, textDecoration: 'none', background: T.card, color: T.ink }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '0.16em', color: T.inkMuted }}>SETTINGS</div>
            <div style={{ fontFamily: T.serif, fontSize: 15 }}>団体設定</div>
          </div>
          <span style={{ fontFamily: T.mono, fontSize: 12, color: T.inkMuted, alignSelf: 'center' }}>→</span>
        </Link>
      </div>

      <div style={{ borderTop: `1px solid ${T.ink}` }}>
        <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', fontFamily: T.mono, fontSize: 9, letterSpacing: '0.14em', color: T.inkMuted, borderBottom: `0.5px solid ${T.ink}` }}>
          <span>YOUR EXHIBITIONS</span>
          <Link to={`/${org.slug}/dashboard/exhibitions`} style={{ color: T.ink, textDecoration: 'none' }}>MANAGE →</Link>
        </div>
        {exhibitions.slice(0, 4).map((exh, i) => (
          <Link key={exh.id} to={`/${org.slug}/dashboard/exhibitions/${exh.id}/edit`} style={{ padding: '14px 16px', borderBottom: `0.5px solid ${T.line}`, display: 'flex', gap: 12, textDecoration: 'none', color: T.ink }}>
            <div style={{ width: 32, fontFamily: T.mono, fontSize: 11, color: T.inkMuted, paddingTop: 2 }}>{pad2(i + 1)}</div>
            <div style={{ width: 52, height: 52, background: '#D9D6CE', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: T.serif, fontSize: 15, letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{exh.title}</div>
              <div style={{ marginTop: 3, fontFamily: T.mono, fontSize: 10, letterSpacing: '0.08em', color: T.inkMuted }}>{fmtDateDot(exh.start_date)} — {fmtDateDot(exh.end_date)}</div>
              <div style={{ marginTop: 4 }}><StatusBadge kind={exhStatus(exh)} /></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', fontFamily: T.mono, fontSize: 10, color: T.inkSoft }}>EDIT →</div>
          </Link>
        ))}
        {exhibitions.length === 0 && <div style={{ padding: '24px 16px', fontFamily: T.mono, fontSize: 11, color: T.inkMuted }}>展覧会がまだありません</div>}
      </div>
      <div style={{ padding: '16px 16px 0' }}>
        <Link to="/account/setup" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', border: `0.5px solid ${T.line}`, textDecoration: 'none', color: T.inkMuted, background: T.paper }}>
          <span style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.14em' }}>＋ 別の団体を追加</span>
          <span style={{ fontFamily: T.mono, fontSize: 10 }}>→</span>
        </Link>
      </div>
      <div style={{ height: 24 }} />
    </>
  )
}

// Multi-org selector — shown when user belongs to multiple orgs
function OrgSelector({ orgs, onSelect, isDesktop }) {
  const content = (
    <div style={{ padding: isDesktop ? '36px 0 60px' : '24px 16px' }}>
      <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.inkMuted, marginBottom: 8 }}>YOUR ORGANIZATIONS</div>
      <div style={{ fontFamily: T.serif, fontSize: isDesktop ? 32 : 24, letterSpacing: '0.02em', color: T.ink, marginBottom: 24 }}>団体を選択</div>
      <div style={{ borderTop: `1px solid ${T.ink}` }}>
        {orgs.map((org, i) => (
          <div key={org.id} onClick={() => onSelect(org)} style={{ padding: '20px 0', borderBottom: `0.5px solid ${T.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ fontFamily: T.mono, fontSize: 11, color: T.inkMuted }}>{pad2(i + 1)}</div>
              <div>
                <div style={{ fontFamily: T.serif, fontSize: 17, letterSpacing: '0.02em', color: T.ink }}>{org.name}</div>
                {org.description && <div style={{ marginTop: 3, fontSize: 12, color: T.inkSoft }}>{org.description.slice(0, 50)}{org.description.length > 50 ? '…' : ''}</div>}
              </div>
            </div>
            <div style={{ fontFamily: T.mono, fontSize: 11, color: T.inkMuted }}>→</div>
          </div>
        ))}
      </div>
    </div>
  )

  if (isDesktop) return <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px' }}>{content}</div>
  return content
}

export default function AccountPage() {
  const { session } = useAuth()
  const isDesktop = useIsDesktop()
  const navigate = useNavigate()
  const [orgs, setOrgs] = useState([])
  const [selectedOrg, setSelectedOrg] = useState(null)
  const [exhibitions, setExhibitions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session || !supabase) return setLoading(false)
    async function load() {
      try {
        const { data: userOrgs } = await supabase
          .from('user_orgs')
          .select('role, organizations(*)')
          .eq('user_id', session.user.id)

        const orgList = (userOrgs || []).map((uo) => uo.organizations).filter(Boolean)
        setOrgs(orgList)

        // auto-select if only one org
        if (orgList.length === 1) {
          setSelectedOrg(orgList[0])
          const { data: exhData } = await supabase
            .from('exhibitions')
            .select('*')
            .eq('org_id', orgList[0].id)
            .order('start_date', { ascending: false })
          setExhibitions(exhData || [])
        }
      } catch { /* unavailable */ } finally { setLoading(false) }
    }
    load()
  }, [session])

  async function handleSelectOrg(org) {
    setSelectedOrg(org)
    if (!supabase) return
    const { data } = await supabase
      .from('exhibitions')
      .select('*')
      .eq('org_id', org.id)
      .order('start_date', { ascending: false })
    setExhibitions(data || [])
  }

  async function handleSignOut() {
    if (!supabase) return
    await supabase.auth.signOut()
    navigate('/')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.paper }}>
      <span style={{ fontFamily: T.mono, color: T.inkMuted, fontSize: 11 }}>...</span>
    </div>
  )

  const signOutButton = session && (
    <button onClick={handleSignOut} style={{ background: 'none', border: 'none', fontFamily: T.mono, fontSize: 10, letterSpacing: '0.12em', color: T.ink, cursor: 'pointer', padding: 0 }}>
      SIGN OUT ↗
    </button>
  )

  const topBar = !isDesktop && (
    <div style={{ padding: '14px 16px', borderBottom: `0.5px solid ${T.line}`, display: 'flex', justifyContent: 'space-between', fontFamily: T.mono, fontSize: 10, letterSpacing: '0.12em', color: T.inkMuted }}>
      <span>ACCOUNT</span>
      {signOutButton}
    </div>
  )

  function renderContent() {
    if (!session) return <LoggedOut isDesktop={isDesktop} />
    if (selectedOrg) return (
      <OrgView
        org={selectedOrg}
        exhibitions={exhibitions}
        isDesktop={isDesktop}
        onBack={orgs.length > 1 ? () => { setSelectedOrg(null); setExhibitions([]) } : null}
      />
    )
    if (orgs.length > 1) return <OrgSelector orgs={orgs} onSelect={handleSelectOrg} isDesktop={isDesktop} />
    // logged in but no org linked yet
    return (
      <div style={{ padding: isDesktop ? '60px 0' : '32px 16px', maxWidth: isDesktop ? 480 : undefined, margin: isDesktop ? '0 auto' : undefined }}>
        <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.inkMuted, marginBottom: 8 }}>SIGNED IN</div>
        <div style={{ fontFamily: T.serif, fontSize: isDesktop ? 32 : 24, color: T.ink, marginBottom: 8 }}>{session.user.email}</div>
        <div style={{ fontSize: 12, color: T.inkSoft, lineHeight: 1.7, marginBottom: 24 }}>まだ団体がありません。団体を作成してartportを始めましょう。</div>
        <Link to="/account/setup" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: T.ink, color: T.paper, padding: '16px 20px', fontFamily: T.sans, fontWeight: 500, fontSize: 13, letterSpacing: '0.14em', textDecoration: 'none', marginBottom: 12 }}>
          <span>＋ 団体を作成する</span>
          <span style={{ fontFamily: T.mono, fontSize: 12 }}>→</span>
        </Link>
        <button onClick={handleSignOut} style={{ background: 'transparent', color: T.inkMuted, border: `0.5px solid ${T.line}`, padding: '12px 20px', fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em', cursor: 'pointer' }}>
          SIGN OUT
        </button>
      </div>
    )
  }

  if (isDesktop) return (
    <div style={{ background: T.paper, minHeight: '100vh' }}>
      <Header activeTab="account" />
      {renderContent()}
      <div style={{ borderTop: `1px solid ${T.ink}`, marginTop: 40 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 32px', display: 'flex', justifyContent: 'space-between', fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.inkMuted }}>
          <span>© ARTPORT {new Date().getFullYear()}</span>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            {session && <Link to="/account/setup" style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.14em', color: T.inkMuted, textDecoration: 'none' }}>＋ 別の団体を追加</Link>}
            {session && signOutButton}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ background: T.paper, minHeight: '100vh', paddingBottom: 80 }}>
      <Header activeTab="account" />
      {topBar}
      {renderContent()}
      <BottomNav active="account" />
    </div>
  )
}
