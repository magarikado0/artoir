import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import Header from '../components/Header'
import BottomNav from '../components/BottomNav'
import { T, pad2 } from '../lib/tokens'
import { useIsDesktop } from '../lib/useIsDesktop'

function PageFooter() {
  return (
    <div style={{ borderTop: `1px solid ${T.ink}`, marginTop: 40 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 32px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, flexWrap: 'wrap', textAlign: 'center', fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.inkMuted }}>
        <span>© Artoir {new Date().getFullYear()}</span>
        <span>展覧会プラットフォーム</span>
        <span>Artoir(アルトワール)</span>
      </div>
    </div>
  )
}

function LoggedOut({ isDesktop }) {
  const navigate = useNavigate()
  const benefits = [
    ['01', '団体ページを作る', '展覧会の活動母体として情報を公開'],
    ['02', '展覧会を公開する', '作品・会期・会場を入力し、URL一つで共有'],
    ['03', '作品を管理する',   '画像・タイトル・技法を登録、並び替えも可'],
  ]

  if (isDesktop) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 32px' }}>
      <div style={{ width: 480 }}>
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

// Multi-org selector — shown when user belongs to multiple orgs
function OrgSelector({ orgs, onSelect, isDesktop }) {
  const content = (
    <div style={{ padding: isDesktop ? '36px 0 60px' : '24px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <div style={{ fontFamily: T.serif, fontSize: isDesktop ? 32 : 24, letterSpacing: '0.02em', color: T.ink }}>団体を選択</div>
        <Link
          to="/account/setup"
          className="ui-action"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: T.accent, color: T.paper, fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em', textDecoration: 'none', border: `1px solid ${T.paper}`, whiteSpace: 'nowrap' }}
        >
          ＋ 新しい団体を作成
          <span style={{ fontFamily: T.mono, fontSize: 12 }}>→</span>
        </Link>
      </div>
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
      <PageFooter />
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session || !supabase) return setLoading(false)
    let cancelled = false
    async function load() {
      try {
        const { data: userOrgs } = await supabase
          .from('user_orgs')
          .select('role, organizations(*)')
          .eq('user_id', session.user.id)

        if (cancelled) return
        const orgList = (userOrgs || []).map((uo) => uo.organizations).filter(Boolean)
        setOrgs(orgList)

        // auto-redirect if only one org
        if (orgList.length === 1) {
          navigate(`/${orgList[0].slug}/dashboard`, { replace: true })
          return
        }
      } catch { /* unavailable */ } finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [session, navigate])

  function handleSelectOrg(org) {
    navigate(`/${org.slug}/dashboard`)
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

  const topBar = !isDesktop && (
    <div style={{ padding: '14px 16px', borderBottom: `0.5px solid ${T.line}`, display: 'flex', justifyContent: 'space-between', fontFamily: T.mono, fontSize: 10, letterSpacing: '0.12em', color: T.inkMuted }}>
    </div>
  )

  function renderContent() {
    if (!session) return <LoggedOut isDesktop={isDesktop} />
    if (orgs.length > 1) return <OrgSelector orgs={orgs} onSelect={handleSelectOrg} isDesktop={isDesktop} />
    // logged in but no org linked yet
    return (
      <div style={{ padding: isDesktop ? '60px 0' : '32px 16px', maxWidth: isDesktop ? 480 : undefined, margin: isDesktop ? '0 auto' : undefined }}>
        <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.inkMuted, marginBottom: 8 }}>SIGNED IN</div>
        <div style={{ fontFamily: T.serif, fontSize: isDesktop ? 32 : 24, color: T.ink, marginBottom: 8 }}>{session.user.email}</div>
        <div style={{ fontSize: 12, color: T.inkSoft, lineHeight: 1.7, marginBottom: 24 }}>まだ団体がありません。団体を作成してArtoirを始めましょう。</div>
        <Link to="/account/setup" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: T.ink, color: T.paper, padding: '16px 20px', fontFamily: T.sans, fontWeight: 500, fontSize: 13, letterSpacing: '0.14em', textDecoration: 'none', marginBottom: 12 }}>
          <span>＋ 新しい団体を作成</span>
        </Link>
        <button onClick={handleSignOut} style={{ background: 'transparent', color: T.inkMuted, border: `0.5px solid ${T.line}`, padding: '12px 20px', fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em', cursor: 'pointer' }}>
          SIGN OUT
        </button>
      </div>
    )
  }

  return (
    <div style={{ background: T.paper, minHeight: '100vh', paddingBottom: 72 }}>
      <Header activeTab="account" />
      {topBar}
      {renderContent()}
      <BottomNav active="account" />
    </div>
  )
}
