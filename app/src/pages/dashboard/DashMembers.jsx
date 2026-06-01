import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import DashShell from '../../components/DashShell'
import LoadingFrames from '../../components/LoadingFrames'
import { useDelayedLoading } from '../../lib/useDelayedLoading'
import { useAuth } from '../../lib/auth'
import { isPersonPublisher } from '../../lib/publisher'
import { supabase } from '../../lib/supabase'
import { T } from '../../lib/tokens'
import { useIsDesktop } from '../../lib/useIsDesktop'

function roleLabel(role) {
  if (role === 'owner') return 'オーナー'
  if (role === 'admin') return '管理者'
  return role
}

export default function DashMembers() {
  const { orgSlug } = useParams()
  const { session } = useAuth()
  const isDesktop = useIsDesktop()
  const [org, setOrg] = useState(null)
  const [loading, setLoading] = useState(true)
  const showLoader = useDelayedLoading(loading)
  const [members, setMembers] = useState([])
  const [invites, setInvites] = useState([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('admin')
  const [inviteLink, setInviteLink] = useState('')
  const [copiedInviteLink, setCopiedInviteLink] = useState('')
  const [message, setMessage] = useState('')
  const [membersLoading, setMembersLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!supabase) {
      Promise.resolve().then(() => setLoading(false))
      return
    }
    let cancelled = false
    async function loadOrg() {
      const { data } = await supabase.from('organizations').select('*').eq('slug', orgSlug).single()
      if (!cancelled) {
        setOrg(data || null)
        setLoading(false)
      }
    }
    loadOrg()
    return () => { cancelled = true }
  }, [orgSlug])

  useEffect(() => {
    if (org && !isPersonPublisher(org)) loadMembers(org)
  }, [org])

  async function loadMembers(nextOrg = org) {
    if (!supabase || !nextOrg || isPersonPublisher(nextOrg)) return
    setMembersLoading(true)
    try {
      const [{ data: memberRows, error: memberError }, { data: inviteRows }] = await Promise.all([
        supabase.from('user_orgs').select('*').eq('org_id', nextOrg.id),
        supabase.from('organization_invites').select('*').eq('org_id', nextOrg.id).is('accepted_at', null).order('created_at', { ascending: false }),
      ])
      if (memberError) {
        setMessage(memberError.message)
        return
      }
      setMembers(memberRows || [])
      setInvites(inviteRows || [])
    } finally {
      setMembersLoading(false)
    }
  }

  function currentMembership() {
    return members.find((member) => member.user_id === session?.user?.id)
  }

  function ownerCount() {
    return members.filter((member) => member.role === 'owner').length
  }

  function memberEmail(member) {
    if (member.member_email) return member.member_email
    if (member.user_id === session?.user?.id) return session.user.email
    return member.user_id
  }

  async function copyText(text) {
    function markCopied() {
      setCopiedInviteLink(text)
      window.setTimeout(() => setCopiedInviteLink((current) => current === text ? '' : current), 1800)
    }

    try {
      await navigator.clipboard.writeText(text)
      markCopied()
    } catch {
      const el = document.createElement('textarea')
      el.value = text
      el.setAttribute('readonly', '')
      el.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;z-index:-1'
      document.body.appendChild(el)
      el.focus()
      el.select()
      el.setSelectionRange(0, el.value.length)
      try {
        const copied = document.execCommand('copy')
        if (copied) markCopied()
        setMessage(copied ? '' : text)
      } finally {
        document.body.removeChild(el)
      }
    }
  }

  function createInviteToken() {
    if (crypto?.randomUUID) return crypto.randomUUID()
    const random = crypto?.getRandomValues
      ? Array.from(crypto.getRandomValues(new Uint8Array(24)), (value) => value.toString(16).padStart(2, '0')).join('')
      : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
    return random.replace(/[^a-zA-Z0-9-]/g, '')
  }

  async function handleCreateInvite(e) {
    e?.preventDefault()
    if (!supabase || !org || !inviteEmail.trim()) return
    setSaving(true)
    setMessage('')
    setInviteLink('')
    setCopiedInviteLink('')
    try {
      const token = createInviteToken()
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString()
      const { data, error } = await supabase
        .from('organization_invites')
        .insert({
          org_id: org.id,
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
          token,
          invited_by: session.user.id,
          expires_at: expiresAt,
        })
        .select()
        .single()
      if (error) {
        setMessage(error.message)
        return
      }
      const link = `${window.location.origin}/invite/${data.token}`
      setInviteLink(link)
      setInviteEmail('')
      await loadMembers(org)
      await copyText(link)
    } catch (error) {
      setMessage(error?.message || '招待リンクの作成に失敗しました。')
    } finally {
      setSaving(false)
    }
  }

  async function handleRoleChange(member, role) {
    if (!supabase || !org || member.role === role) return
    if (member.role === 'owner' && role !== 'owner' && ownerCount() <= 1) {
      setMessage('owner は最低1人必要です。')
      return
    }
    setSaving(true)
    setMessage('')
    try {
      const { error } = await supabase
        .from('user_orgs')
        .update({ role })
        .eq('user_id', member.user_id)
        .eq('org_id', org.id)
      if (error) setMessage(error.message)
      else await loadMembers(org)
    } finally {
      setSaving(false)
    }
  }

  async function handleRemoveMember(member) {
    if (!supabase || !org) return
    if (member.role === 'owner' && ownerCount() <= 1) {
      setMessage('owner は最低1人必要です。')
      return
    }
    const ok = window.confirm(`${memberEmail(member)} をメンバーから外しますか？`)
    if (!ok) return
    setSaving(true)
    setMessage('')
    try {
      const { error } = await supabase
        .from('user_orgs')
        .delete()
        .eq('user_id', member.user_id)
        .eq('org_id', org.id)
      if (error) setMessage(error.message)
      else await loadMembers(org)
    } finally {
      setSaving(false)
    }
  }

  async function handleCancelInvite(invite) {
    if (!supabase) return
    setSaving(true)
    setMessage('')
    try {
      const { error } = await supabase.from('organization_invites').delete().eq('id', invite.id)
      if (error) setMessage(error.message)
      else await loadMembers(org)
    } finally {
      setSaving(false)
    }
  }

  if (showLoader) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.paper }}>
      <LoadingFrames />
    </div>
  )

  const canManageMembers = currentMembership()?.role === 'owner'

  const content = (
    <div className="ui-settings-page">
      {isPersonPublisher(org) ? (
        <section className="ui-settings-section">
          <div className="ui-settings-member-note">個人ページにはメンバー管理はありません。</div>
        </section>
      ) : (
        <section className="ui-settings-section">
          <div className="ui-settings-members">
            {membersLoading ? (
              <div className="ui-settings-member-note">読み込み中...</div>
            ) : (
              <div className="ui-settings-member-list">
                {members.map((member) => (
                  <div key={`${member.org_id}-${member.user_id}`} className="ui-settings-member-row">
                    <div>
                      <div className="ui-settings-member-email">{memberEmail(member)}</div>
                      <div className="ui-settings-member-role">{roleLabel(member.role)}</div>
                    </div>
                    {canManageMembers ? (
                      <div className="ui-settings-member-actions">
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member, e.target.value)}
                          disabled={saving}
                          aria-label={`${memberEmail(member)} の権限`}
                        >
                          <option value="owner">オーナー</option>
                          <option value="admin">管理者</option>
                        </select>
                        <button type="button" onClick={() => handleRemoveMember(member)} disabled={saving}>
                          削除
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}
                {members.length === 0 && <div className="ui-settings-member-note">メンバー情報を表示できません。</div>}
              </div>
            )}

            {canManageMembers ? (
              <form onSubmit={handleCreateInvite} className="ui-settings-invite-form">
                <div className="ui-form-label">招待</div>
                <div className="ui-settings-invite-grid">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="email@example.com"
                    disabled={saving}
                  />
                  <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} disabled={saving}>
                    <option value="admin">管理者</option>
                    <option value="owner">オーナー</option>
                  </select>
                  <button type="submit" disabled={saving || !inviteEmail.trim()}>
                    招待リンクを作成
                  </button>
                </div>
                {inviteLink && (
                  <div className={`ui-settings-invite-result ${copiedInviteLink === inviteLink ? 'is-copied' : ''}`}>
                    <div className="ui-settings-invite-result-url">{inviteLink}</div>
                    {copiedInviteLink === inviteLink && <div className="ui-settings-invite-copied">コピーしました</div>}
                    <button type="button" onClick={() => copyText(inviteLink)}>
                      {copiedInviteLink === inviteLink ? 'コピー済み' : 'コピー'}
                    </button>
                  </div>
                )}
              </form>
            ) : (
              <div className="ui-settings-member-note">メンバーの招待・権限変更は owner のみ操作できます。</div>
            )}

            {invites.length > 0 && (
              <div className="ui-settings-pending-invites">
                <div className="ui-form-label">未承認の招待</div>
                {invites.map((invite) => {
                  const link = `${window.location.origin}/invite/${invite.token}`
                  return (
                    <div key={invite.id} className="ui-settings-member-row">
                      <div>
                        <div className="ui-settings-member-email">{invite.email}</div>
                        <div className="ui-settings-member-role">{roleLabel(invite.role)} / {new Date(invite.expires_at).toLocaleDateString()}</div>
                      </div>
                      {canManageMembers && (
                        <div className="ui-settings-member-actions">
                          <button type="button" onClick={() => copyText(link)} disabled={saving}>{copiedInviteLink === link ? 'コピー済み' : 'コピー'}</button>
                          <button type="button" onClick={() => handleCancelInvite(invite)} disabled={saving}>取消</button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {message && <div className="ui-settings-member-message">{message}</div>}
          </div>
        </section>
      )}
    </div>
  )

  if (isDesktop) return (
    <DashShell orgSlug={orgSlug}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        {content}
      </div>
    </DashShell>
  )

  return (
    <DashShell orgSlug={orgSlug}>
      {content}
    </DashShell>
  )
}
