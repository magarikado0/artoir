import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useResolvedSession } from '../lib/useResolvedSession'
import Header from '../components/Header'
import BottomNav from '../components/BottomNav'
import { T, pad2 } from '../lib/tokens'
import { useIsDesktop } from '../lib/useIsDesktop'

function LoggedOut({ isDesktop }) {
  const navigate = useNavigate()
  const benefits = [
    ['01', '団体ページを作る', '展覧会の活動母体として、情報を公開。'],
    ['02', '展覧会を公開する', '作品・会期・会場を入力し、URL一つで共有。'],
    ['03', '作品を管理する',   '画像・タイトル・技法を登録、並び替えも可。'],
  ]

  if (isDesktop) return (
    <div className="ui-account-surface ui-account-surface-desktop">
      <div>
        <div className="ui-kicker">GUEST</div>
        <div className="ui-screen-title" style={{ marginTop: 8 }}>アカウント</div>
        <div className="ui-screen-subtitle" style={{ fontFamily: T.serifBody, marginBottom: 22 }}>
          ログインすると、あなたの団体として展覧会を作成・編集できます。
        </div>
        <Link to="/login" className="ui-pill-action" style={{ width: '100%', justifyContent: 'space-between' }}>
          <span>ログイン / 新規登録</span>
          <span style={{ fontFamily: T.mono, fontSize: 12 }}>→</span>
        </Link>
        <div className="ui-account-benefits">
          <div style={{ paddingBottom: 8, borderBottom: `1px solid ${T.ink}`, fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.ink }}>ログインでできること</div>
          {benefits.map(([n, t, d]) => (
            <div key={n} className="ui-account-row" style={{ display: 'grid', gridTemplateColumns: '32px 1fr', gap: 10 }}>
              <div style={{ fontFamily: T.mono, fontSize: 11, color: T.inkMuted }}>{n}</div>
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
    <div className="ui-account-surface">
      <div className="ui-kicker">GUEST</div>
      <div className="ui-screen-title" style={{ marginTop: 6 }}>アカウント</div>
      <div className="ui-screen-subtitle">ログインすると、あなたの団体として展覧会を作成・編集できます。</div>
      <button onClick={() => navigate('/login')} className="ui-pill-action" style={{ marginTop: 22, width: '100%', justifyContent: 'space-between' }}>
        <span>ログイン / 新規登録</span>
        <span style={{ fontFamily: T.mono, fontSize: 12 }}>→</span>
      </button>
      <div style={{ marginTop: 32 }}>
        <div style={{ paddingBottom: 8, borderBottom: `1px solid ${T.ink}`, fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.ink }}>ログインでできること</div>
        {benefits.map(([n, t, d]) => (
          <div key={n} className="ui-account-row" style={{ display: 'grid', gridTemplateColumns: '32px 1fr', gap: 10 }}>
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
  if (isDesktop) {
    return (
      <div className="ui-account-surface ui-account-org-selector-desktop">
        <h1 className="ui-sr-only">団体を選択</h1>
        <div className="ui-app-topline">
          <div className="ui-hero-screen-heading">
            <h1 className="ui-screen-title" style={{ marginTop: 8 }}>団体を選択</h1>
          </div>
        </div>

        <div className="ui-org-table ui-account-org-picker-table">
          <div className="ui-org-table-head" aria-hidden="true">
            <span>No.</span>
            <span>団体</span>
            <span className="ui-account-org-picker-head-go" />
          </div>
          <div className="ui-org-list">
            {orgs.map((org, i) => (
              <button
                key={org.id}
                type="button"
                onClick={() => onSelect(org)}
                className="ui-org-row ui-account-org-pick-btn"
              >
                <div className="ui-org-index">{pad2(i + 1)}</div>
                <div style={{ minWidth: 0 }}>
                  <div className="ui-org-name">{org.name}</div>
                  {org.description && (
                    <div className="ui-org-description">
                      {org.description.slice(0, 120)}
                      {org.description.length > 120 ? '…' : ''}
                    </div>
                  )}
                </div>
                <div className="ui-account-org-pick-go" aria-hidden="true">→</div>
              </button>
            ))}
          </div>
        </div>

        <Link
          to="/account/setup"
          className="ui-pill-action ui-account-org-selector-cta"
          style={{ background: T.accent }}
        >
          <span>＋ 新しい団体を作成</span>
          <span style={{ fontFamily: T.mono, fontSize: 12 }}>→</span>
        </Link>
      </div>
    )
  }

  return (
    <div className="ui-account-surface">
      <h1 className="ui-sr-only">団体を選択</h1>
      <div className="ui-app-topline" style={{ marginBottom: 12 }}>
        <div className="ui-hero-screen-heading">
          <h1 className="ui-screen-title" style={{ marginTop: 8 }}>団体を選択</h1>
        </div>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {orgs.map((org, i) => (
          <button key={org.id} onClick={() => onSelect(org)} className="ui-list-card" style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', border: '1px solid rgba(30,26,22,0.18)', textAlign: 'left' }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div className="ui-mini-badge" style={{ minWidth: 34 }}>{pad2(i + 1)}</div>
              <div>
                <div style={{ fontFamily: T.serif, fontSize: 17, letterSpacing: '0.02em', color: T.ink }}>{org.name}</div>
                {org.description && <div style={{ marginTop: 3, fontSize: 12, color: T.inkSoft }}>{org.description.slice(0, 50)}{org.description.length > 50 ? '…' : ''}</div>}
              </div>
            </div>
            <div style={{ fontFamily: T.mono, fontSize: 11, color: T.inkMuted }}>→</div>
          </button>
        ))}
      </div>
      <Link
        to="/account/setup"
        className="ui-pill-action"
        style={{ marginTop: 14, width: '100%', justifyContent: 'space-between', background: T.accent }}
      >
        <span>＋ 新しい団体を作成</span>
        <span style={{ fontFamily: T.mono, fontSize: 12 }}>→</span>
      </Link>
    </div>
  )
}

export default function AccountPage() {
  const { session, ready } = useResolvedSession()
  const isDesktop = useIsDesktop()
  const navigate = useNavigate()
  const [orgs, setOrgs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!ready) return undefined
    if (!supabase) {
      setLoading(false)
      return undefined
    }
    if (!session) {
      setLoading(false)
      return undefined
    }

    let cancelled = false
    setLoading(true)

    async function load() {
      let redirected = false
      try {
        const { data: userOrgs } = await supabase
          .from('user_orgs')
          .select('role, organizations(*)')
          .eq('user_id', session.user.id)

        if (cancelled) return
        const orgList = (userOrgs || []).map((uo) => uo.organizations).filter(Boolean)
        setOrgs(orgList)

        if (orgList.length === 1) {
          redirected = true
          navigate(`/${orgList[0].slug}/dashboard`, { replace: true })
          return
        }
      } catch { /* unavailable */ } finally {
        if (!cancelled && !redirected) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [session, ready, navigate])

  function handleSelectOrg(org) {
    navigate(`/${org.slug}/dashboard`)
  }

  async function handleSignOut() {
    if (!supabase) return
    await supabase.auth.signOut()
    navigate('/')
  }

  const showLoading = !ready || loading

  const signOutButton = session && (
    <button onClick={handleSignOut} style={{ background: 'none', border: 'none', fontFamily: T.mono, fontSize: 10, letterSpacing: '0.12em', color: T.ink, cursor: 'pointer', padding: 0 }}>
      SIGN OUT ↗
    </button>
  )

  const topBar = !isDesktop && session && <div style={{ display: 'none' }}>{signOutButton}</div>

  function renderContent() {
    if (showLoading) {
      return (
        <div style={{ minHeight: 240, display: 'grid', placeItems: 'center' }}>
          <span style={{ fontFamily: T.mono, color: T.inkMuted, fontSize: 11 }}>...</span>
        </div>
      )
    }

    if (session) {
      if (orgs.length > 1) return <OrgSelector orgs={orgs} onSelect={handleSelectOrg} isDesktop={isDesktop} />
      return (
        <div style={{ padding: isDesktop ? '60px 0' : '32px 16px', maxWidth: isDesktop ? 480 : undefined, margin: isDesktop ? '0 auto' : undefined }}>
          <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.inkMuted, marginBottom: 8 }}>SIGNED IN</div>
          <div style={{ fontFamily: T.serif, fontSize: isDesktop ? 32 : 24, color: T.ink, marginBottom: 8 }}>{session.user.email}</div>
          <div style={{ fontSize: 12, color: T.inkSoft, lineHeight: 1.7, marginBottom: 24 }}>まだ団体がありません。団体を作成してArtoirを始めましょう。</div>
          <Link to="/account/setup" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: T.ink, color: T.paper, padding: '16px 20px', fontFamily: T.sans, fontWeight: 500, fontSize: 13, letterSpacing: '0.14em', textDecoration: 'none', marginBottom: 12 }}>
            <span>＋ 新しい団体を作成</span>
            <span style={{ fontFamily: T.mono, fontSize: 12 }}>→</span>
          </Link>
          <button onClick={handleSignOut} style={{ background: 'transparent', color: T.inkMuted, border: `0.5px solid ${T.line}`, padding: '12px 20px', fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em', cursor: 'pointer' }}>
            SIGN OUT
          </button>
        </div>
      )
    }
    return <LoggedOut isDesktop={isDesktop} />
  }

  if (isDesktop) return (
    <div className="ui-page-shell">
      <Header activeTab="account" />
      <main className="ui-app-main">{renderContent()}</main>
    </div>
  )

  return (
    <div className="ui-page-shell" style={{ paddingBottom: 92 }}>
      <Header activeTab="account" />
      {topBar}
      {renderContent()}
      <BottomNav active="account" />
    </div>
  )
}
