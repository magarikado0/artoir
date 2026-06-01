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
        const { data, error: inviteError } = await supabase
          .from('organization_invites')
          .select('*, organizations(id, name, slug, kind)')
          .eq('token', token)
          .single()

        if (inviteError) {
          setError('招待が見つかりません。')
        } else {
          setInvite(data)
        }
      } catch {
        setError('招待の読み込みに失敗しました。')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  if (!session) return <Navigate to="/login" state={{ from: `/invite/${token}` }} replace />

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
        .from('user_orgs')
        .upsert({
          user_id: session.user.id,
          org_id: invite.org_id,
          role: invite.role || 'admin',
          member_email: session.user.email,
        }, { onConflict: 'user_id,org_id' })

      if (linkError) {
        const fallback = await supabase
          .from('user_orgs')
          .insert({
            user_id: session.user.id,
            org_id: invite.org_id,
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
                  <div className="ui-kicker">INVITATION</div>
                  <div style={{ marginTop: 8, fontFamily: T.serif, fontSize: 24, color: T.ink }}>{invite.organizations?.name || '公開ページ'}</div>
                  <div style={{ marginTop: 8, fontSize: 12, color: T.inkSoft, lineHeight: 1.7 }}>
                    {invite.email} 宛ての招待です。権限: {invite.role || 'admin'}
                  </div>
                </>
              )}
              {(error || expired || accepted || emailMismatch) && (
                <div style={{ marginTop: 14, padding: '10px 12px', border: `1px solid ${T.lineSoft}`, color: T.accent, fontSize: 12, lineHeight: 1.7 }}>
                  {error || (expired ? 'この招待は期限切れです。' : accepted ? 'この招待は承認済みです。' : `この招待は ${invite.email} 宛てです。現在のログイン: ${session.user.email}`)}
                </div>
              )}
              <button
                type="button"
                onClick={handleAccept}
                disabled={!canAccept || accepting}
                className="ui-pill-action"
                style={{ marginTop: 16, width: '100%', justifyContent: 'space-between', background: T.accent, opacity: !canAccept || accepting ? 0.5 : 1 }}
              >
                <span>{accepting ? '承認中...' : '参加する'}</span>
                <span style={{ fontFamily: T.mono, fontSize: 12 }}>→</span>
              </button>
            </div>
          )}
        </div>
      </main>
      <BottomNav active="account" />
    </div>
  )
}
