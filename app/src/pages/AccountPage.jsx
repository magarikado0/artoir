import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useResolvedSession } from '../lib/useResolvedSession'
import Header from '../components/Header'
import BottomNav from '../components/BottomNav'
import { T, pad2 } from '../lib/tokens'
import { useIsDesktop } from '../lib/useIsDesktop'
import { normalizeProfile } from '../lib/profile'

function LoggedOut({ isDesktop }) {
  const navigate = useNavigate()
  const benefits = [
    ['01', 'プロフィールを設定する', '表示名とIDを決めて、artoirを始める。'],
    ['02', '団体を作成する', '部・サークル・研究室の展示活動をまとめる。'],
    ['03', '作品を管理する', '作品画像・作者プロフィール・説明文を整理する。'],
  ]

  const content = (
    <>
      <div className="ui-kicker">ゲスト</div>
      <div className="ui-screen-title" style={{ marginTop: isDesktop ? 8 : 6 }}>アカウント</div>
      <div className="ui-screen-subtitle" style={{ fontFamily: isDesktop ? T.serifBody : undefined, marginBottom: isDesktop ? 22 : undefined }}>
        ログインすると、プロフィールと団体の展示を管理できます。
      </div>
      <button onClick={() => navigate('/login')} className="ui-pill-action" style={{ marginTop: isDesktop ? 0 : 22, width: '100%', justifyContent: 'space-between' }}>
        <span>ログイン / 新規登録</span>
        <span style={{ fontFamily: T.mono, fontSize: 12 }}>→</span>
      </button>
      <div className="ui-account-benefits" style={{ marginTop: isDesktop ? undefined : 32 }}>
        <div style={{ paddingBottom: 8, borderBottom: `1px solid ${T.ink}`, fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.ink }}>ログインでできること</div>
        {benefits.map(([n, title, desc]) => (
          <div key={n} className="ui-account-row" style={{ display: 'grid', gridTemplateColumns: '32px 1fr', gap: 10 }}>
            <div style={{ fontFamily: T.mono, fontSize: 11, color: isDesktop ? T.inkMuted : T.accent }}>{n}</div>
            <div>
              <div style={{ fontFamily: T.serif, fontSize: 15, color: T.ink }}>{title}</div>
              <div style={{ marginTop: 4, fontSize: 12, color: T.inkSoft, lineHeight: 1.7 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  )

  return <div className={`ui-account-surface ${isDesktop ? 'ui-account-surface-desktop' : ''}`}>{content}</div>
}

function ProfileSummary({ profile }) {
  return (
    <section className="ui-app-card" style={{ padding: 18, marginBottom: 14 }}>
      <div className="ui-kicker">プロフィール</div>
      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div className="ui-screen-title" style={{ fontSize: 28 }}>{profile.display_name}</div>
          <div style={{ marginTop: 4, fontFamily: T.mono, fontSize: 11, color: T.inkMuted }}>@{profile.slug}</div>
          {profile.bio && <p className="ui-screen-subtitle" style={{ marginTop: 10, maxWidth: 620 }}>{profile.bio}</p>}
        </div>
        <Link to="/account/setup" className="ui-pill-action" style={{ background: T.paperAlt, color: T.ink }}>
          <span>プロフィール編集</span>
        </Link>
      </div>
    </section>
  )
}

function OrganizationSelector({ orgs, onSelect, onSignOut, isDesktop }) {
  const actions = (
    <div className="ui-account-floating-actions">
      <Link to="/account/organizations/new" className="ui-account-floating-action is-primary">
        <span>＋ 団体を作成</span>
      </Link>
      <button type="button" onClick={onSignOut} className="ui-account-floating-action">
        ログアウト
      </button>
    </div>
  )

  if (orgs.length === 0) {
    return (
      <div className="ui-account-surface">
        <div className="ui-kicker">団体</div>
        <div style={{ marginTop: 8, fontFamily: T.serif, fontSize: 22, color: T.ink }}>管理している団体はまだありません</div>
        <div style={{ marginTop: 8, fontSize: 12, color: T.inkSoft, lineHeight: 1.7 }}>団体を作成すると、展示と作品を管理できます。</div>
        {actions}
      </div>
    )
  }

  const list = (
    <div className="ui-org-table ui-account-org-picker-table">
      <div className="ui-org-table-head" aria-hidden="true">
        <span>No.</span>
        <span>団体</span>
        <span className="ui-account-org-picker-head-go" />
      </div>
      <div className="ui-org-list">
        {orgs.map((org, i) => (
          <button key={org.id} type="button" onClick={() => onSelect(org)} className="ui-org-row ui-account-org-pick-btn">
            <div className="ui-org-index">{pad2(i + 1)}</div>
            <div style={{ minWidth: 0 }}>
              <div className="ui-org-name-row">
                <span className="ui-org-name">{org.name}</span>
              </div>
              {org.description && (
                <div className="ui-org-description">
                  {org.description.slice(0, isDesktop ? 120 : 50)}
                  {org.description.length > (isDesktop ? 120 : 50) ? '…' : ''}
                </div>
              )}
            </div>
            <div className="ui-account-org-pick-go" aria-hidden="true">→</div>
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className={`ui-account-surface ${isDesktop ? 'ui-account-org-selector-desktop' : ''}`}>
      <div className="ui-kicker" style={{ marginBottom: 12 }}>団体</div>
      {list}
      {actions}
    </div>
  )
}

export default function AccountPage() {
  const { session, ready } = useResolvedSession()
  const isDesktop = useIsDesktop()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [orgs, setOrgs] = useState([])
  const [loading, setLoading] = useState(true)
  const [profileMissing, setProfileMissing] = useState(false)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    if (!ready) return undefined
    if (!supabase || !session) {
      setProfile(null)
      setOrgs([])
      setProfileMissing(false)
      setLoadError('')
      setLoading(false)
      return undefined
    }

    let cancelled = false
    setLoading(true)
    async function load() {
      try {
        const [{ data: profileData, error: profileError }, { data: membershipRows, error: membershipError }] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle(),
          supabase
            .from('organization_members')
            .select('role, organizations(*)')
            .eq('profile_id', session.user.id),
        ])
        if (cancelled) return
        if (profileError) {
          setProfile(null)
          setProfileMissing(false)
          setLoadError(profileError.message || 'プロフィールの読み込みに失敗しました。')
          setOrgs([])
          return
        }
        setProfile(normalizeProfile(profileData))
        setProfileMissing(!profileData)
        setLoadError(membershipError?.message || '')
        setOrgs((membershipRows || []).map((row) => row.organizations).filter(Boolean))
      } catch {
        if (!cancelled) {
          setProfile(null)
          setOrgs([])
          setProfileMissing(false)
          setLoadError('アカウント情報の読み込みに失敗しました。')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [session, ready])

  function handleSelectOrg(org) {
    navigate(`/${org.slug}/dashboard`)
  }

  async function handleSignOut() {
    if (!supabase) return
    await supabase.auth.signOut()
    navigate('/')
  }

  const showLoading = !ready || loading
  if (!showLoading && session && profileMissing) return <Navigate to="/account/setup" replace />

  function renderContent() {
    if (showLoading) {
      return (
        <div style={{ minHeight: 240, display: 'grid', placeItems: 'center' }}>
          <span style={{ fontFamily: T.mono, color: T.inkMuted, fontSize: 11 }}>...</span>
        </div>
      )
    }

    if (!session) return <LoggedOut isDesktop={isDesktop} />

    if (!profile) {
      return (
        <div className="ui-account-surface">
          <div className="ui-kicker">プロフィール</div>
          <div style={{ marginTop: 8, fontFamily: T.serif, fontSize: 22, color: T.ink }}>プロフィールを読み込めませんでした</div>
          <div style={{ marginTop: 8, fontSize: 12, color: T.accent, lineHeight: 1.7 }}>{loadError || '時間をおいて再度お試しください。'}</div>
          <button type="button" onClick={handleSignOut} className="ui-pill-action" style={{ marginTop: 18, background: T.paperAlt, color: T.ink }}>
            ログアウト
          </button>
        </div>
      )
    }

    return (
      <>
        <ProfileSummary profile={profile} />
        {loadError && (
          <div className="ui-app-card" style={{ padding: 14, marginBottom: 14, borderColor: T.accent, color: T.accent, fontSize: 12 }}>
            {loadError}
          </div>
        )}
        <OrganizationSelector orgs={orgs} onSelect={handleSelectOrg} onSignOut={handleSignOut} isDesktop={isDesktop} />
      </>
    )
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
      {renderContent()}
      <BottomNav active="account" />
    </div>
  )
}
