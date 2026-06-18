import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import Header from '../components/Header'
import BottomNav from '../components/BottomNav'
import LoadingFrames from '../components/LoadingFrames'
import { T } from '../lib/tokens'

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase()
}

export default function InviteAcceptPage() {
  const { token } = useParams()
  const { session } = useAuth()
  const navigate = useNavigate()
  const [invite, setInvite] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      if (!supabase || !token) {
        setLoading(false)
        return
      }
      try {
        const [{ data, error: inviteError }, { data: profileData }] = await Promise.all([
          supabase
          .from('organization_invites')
          .select('*, organizations(id, name, slug)')
          .eq('token', token)
          .single(),
          session
            ? supabase.from('profiles').select('id').eq('id', session.user.id).maybeSingle()
            : Promise.resolve({ data: null }),
        ])

        if (inviteError) {
          setError('招待が見つかりません。')
        } else {
          setInvite(data)
        }
        setProfile(profileData || null)
      } catch {
        setError('招待の読み込みに失敗しました。')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token, session])

  if (!session) return <Navigate to="/login" state={{ from: `/invite/${token}` }} replace />
  if (!loading && !profile) return <Navigate to="/account/setup" state={{ from: `/invite/${token}` }} replace />

  const expired = invite?.expires_at ? new Date(invite.expires_at).getTime() < Date.now() : false
  const accepted = Boolean(invite?.accepted_at)
  const emailMismatch = invite && normalizeEmail(invite.email) !== normalizeEmail(session.user.email)
  const canAccept = invite && !expired && !accepted && !emailMismatch

  async function handleAccept() {
    if (!supabase || !invite || !canAccept) return
    setAccepting(true)
    setError('')
    try {
      let { error: linkError } = await supabase
        .from('organization_members')
        .upsert({
          profile_id: session.user.id,
          organization_id: invite.organization_id,
          role: invite.role || 'admin',
        }, { onConflict: 'organization_id,profile_id' })

      if (linkError) {
        const fallback = await supabase
          .from('organization_members')
          .insert({
            profile_id: session.user.id,
            organization_id: invite.organization_id,
            role: invite.role || 'admin',
          })
        linkError = fallback.error
      }

      if (linkError) {
        setError(linkError.message)
        return
      }

      await supabase
        .from('organization_invites')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invite.id)

      navigate(`/${invite.organizations?.slug}/dashboard`, { replace: true })
    } catch {
      setError('招待の承認に失敗しました。')
    } finally {
      setAccepting(false)
    }
  }

  return (
    <div className="ui-page-shell" style={{ paddingBottom: 92 }}>
      <Header activeTab="account" />
      <main className="ui-app-main">
        <div className="ui-account-surface">
          <h1 className="ui-screen-title" style={{ marginTop: 6 }}>招待を確認</h1>
          {loading ? (
            <div style={{ minHeight: 180, display: 'grid', placeItems: 'center' }}><LoadingFrames /></div>
          ) : (
            <div className="ui-app-card" style={{ padding: 18 }}>
              {invite && (
                <>
                <div className="ui-kicker">招待</div>
                  <div style={{ marginTop: 8, fontFamily: T.serif, fontSize: 24, color: T.ink }}>{invite.organizations?.name || '公開ページ'}</div>
                  <div style={{ marginTop: 8, fontSize: 12, color: T.inkSoft, lineHeight: 1.7 }}>
                    {invite.email} 宛ての招待です。権限: {invite.role || 'admin'}
                  </div>
                </>
              )}
              {(error || expired || accepted || emailMismatch) && (
                <div className="ui-alert ui-alert--error" style={{ marginTop: 14 }}>
                  {error || (expired ? 'この招待は期限切れです。' : accepted ? 'この招待は承認済みです。' : `この招待は ${invite.email} 宛てです。現在のログイン: ${session.user.email}`)}
                </div>
              )}
              <button
                type="button"
                onClick={handleAccept}
                disabled={!canAccept || accepting}
                className="ui-btn ui-btn--accent ui-btn-block"
                style={{ marginTop: 16, justifyContent: 'space-between' }}
              >
                <span>{accepting ? '承認中…' : '参加する'}</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          )}
        </div>
      </main>
      <BottomNav active="account" />
    </div>
  )
}
