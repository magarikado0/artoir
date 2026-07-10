import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import DashShell, { DashField, DashSectionLabel } from '../components/DashShell'
import { T } from '../lib/tokens'
import { useIsDesktop } from '../lib/useIsDesktop'

function normalizeSnsValue(value, host) {
  if (!value) return ''
  let normalized = value
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/^@/, '')
    .replace(/^\/+|\/+$/g, '')
  const hostPrefix = `${host.toLowerCase()}/`
  const lower = normalized.toLowerCase()
  if (lower.startsWith(hostPrefix)) normalized = normalized.slice(host.length + 1)
  else if (lower === host.toLowerCase()) normalized = ''
  return normalized
}

function buildSnsUrl(value, host) {
  const normalized = normalizeSnsValue(value, host)
  return normalized ? `https://${host}/${normalized}` : ''
}

function normalizeHomepageUrl(value) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

export default function AccountSetupLinks() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { orgSlug: routeOrgSlug } = useParams()
  const isDesktop = useIsDesktop()

  const [org, setOrg] = useState(null)
  const [loading, setLoading] = useState(true)
  const [instagram, setInstagram] = useState('')
  const [twitter, setTwitter] = useState('')
  const [homepageUrl, setHomepageUrl] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const stateOrgSlug = location.state?.orgSlug
  const stateOrgId = location.state?.orgId
  const orgSlug = routeOrgSlug || stateOrgSlug

  useEffect(() => {
    if (!session || !supabase || (!orgSlug && !stateOrgId)) {
      setLoading(false)
      return undefined
    }
    let cancelled = false
    async function loadOrg() {
      setLoading(true)
      setError('')
      try {
        let query = supabase.from('organizations').select('*')
        query = stateOrgId ? query.eq('id', stateOrgId) : query.eq('slug', orgSlug)
        const { data: orgData, error: orgError } = await query.maybeSingle()
        if (cancelled) return
        if (orgError) {
          setError(orgError.message || '団体の読み込みに失敗しました。')
          setOrg(null)
          return
        }
        if (!orgData) {
          setOrg(null)
          return
        }

        const { data: memberData, error: memberError } = await supabase
          .from('organization_members')
          .select('role')
          .eq('organization_id', orgData.id)
          .eq('profile_id', session.user.id)
          .maybeSingle()
        if (cancelled) return
        if (memberError) {
          setError(memberError.message || '団体メンバーの確認に失敗しました。')
          setOrg(null)
          return
        }
        if (!memberData) {
          setOrg(null)
          return
        }

        setOrg(orgData)
        setInstagram(normalizeSnsValue(orgData.sns_links?.instagram || '', 'instagram.com'))
        setTwitter(normalizeSnsValue(orgData.sns_links?.x || '', 'x.com'))
        setHomepageUrl(orgData.homepage_url || '')
      } catch {
        if (!cancelled) {
          setError('通信に失敗しました。時間をおいて再度お試しください。')
          setOrg(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadOrg()
    return () => { cancelled = true }
  }, [orgSlug, session, stateOrgId])

  if (!session) return <Navigate to="/login" state={{ from: '/account' }} replace />
  if (!loading && ((!orgSlug && !stateOrgId) || !org)) return <Navigate to="/account" replace />

  const dashboardPath = `/${org?.slug || orgSlug}/dashboard`

  function handleSkip() {
    navigate(dashboardPath, { replace: true })
  }

  async function handleSave(e) {
    e?.preventDefault()
    if (!supabase) { setError('Supabase が未設定です'); return }
    setSaving(true)
    setError('')
    try {
      const updates = {
        sns_links: {
          instagram: buildSnsUrl(instagram, 'instagram.com'),
          x: buildSnsUrl(twitter, 'x.com'),
        },
        homepage_url: normalizeHomepageUrl(homepageUrl),
      }
      const { error: updateErr } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', org.id)
      if (updateErr) {
        setError(updateErr.message)
        return
      }
      navigate(dashboardPath, { replace: true })
    } catch {
      setError('通信に失敗しました。時間をおいて再度お試しください。')
    } finally {
      setSaving(false)
    }
  }

  const formContent = (
    <form onSubmit={handleSave}>
      <div style={{ padding: isDesktop ? '28px 0' : '16px 16px' }}>
        <DashSectionLabel>SNS・ウェブサイト</DashSectionLabel>
        <DashField
          label="INSTAGRAM"
          prefix="instagram.com/"
          value={instagram}
          onChange={setInstagram}
          placeholder="username"
          mono
          help="任意。"
        />
        <DashField
          label="X (TWITTER)"
          prefix="x.com/"
          value={twitter}
          onChange={setTwitter}
          placeholder="username"
          mono
          help="任意。"
        />
        <DashField
          label="WEBSITE"
          value={homepageUrl}
          onChange={setHomepageUrl}
          placeholder="https://example.com"
          mono
          help="任意。"
        />

        {error && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(180,69,44,0.06)', border: `0.5px solid ${T.accent}`, fontFamily: T.mono, fontSize: 11, color: T.accent, letterSpacing: '0.06em' }}>
            {error}
          </div>
        )}

        <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button
            type="button"
            onClick={handleSkip}
            disabled={saving}
            className="ui-icon-button"
            style={{ padding: '14px', background: 'transparent', color: T.ink, border: `1px solid ${T.ink}`, fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em', cursor: 'pointer' }}
          >
            スキップ
          </button>
          <button
            type="submit"
            disabled={saving}
            className="ui-action"
            style={{ padding: '14px', background: T.accent, color: T.paper, border: 'none', fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
          >
            {saving ? '保存中...' : '保存して次へ'}
          </button>
        </div>
        <div style={{ height: 40 }} />
      </div>
    </form>
  )

  const pageHeader = (
    <div className="ui-hero-screen-heading" style={{ marginBottom: isDesktop ? 14 : 0 }}>
      <h1 className="ui-screen-title" style={{ marginTop: isDesktop ? 8 : 6 }}>SNSリンクを登録</h1>
      <p className="ui-screen-subtitle">
        {org?.name ? `${org.name}の公開ページに表示されるSNSやウェブサイトのリンクを登録できます。` : '公開ページに表示されるSNSやウェブサイトのリンクを登録できます。'}
        あとから設定画面で変更・追加できます。
      </p>
    </div>
  )

  const crumbs = ['ACCOUNT', 'SETUP', 'LINKS']

  if (loading) return (
    <DashShell crumbs={crumbs}>
      <div className="ui-page-shell" />
    </DashShell>
  )

  if (isDesktop) {
    return (
      <DashShell crumbs={crumbs}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          {pageHeader}
          {formContent}
        </div>
      </DashShell>
    )
  }

  return (
    <DashShell crumbs={crumbs}>
      {pageHeader}
      {formContent}
    </DashShell>
  )
}
