import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import DashShell from '../../components/DashShell'
import { useAuth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'
import { profilePath } from '../../lib/profileRoutes'
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
  const [members, setMembers] = useState([])
  const [memberSearchId, setMemberSearchId] = useState('')
  const [memberSearchRole, setMemberSearchRole] = useState('admin')
  const [memberSearchResult, setMemberSearchResult] = useState(null)
  const [memberSearchMessage, setMemberSearchMessage] = useState('')
  const [message, setMessage] = useState('')
  const [membersLoading, setMembersLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchingMember, setSearchingMember] = useState(false)

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

  const loadMembers = useCallback(async (nextOrg = org) => {
    if (!supabase || !nextOrg) return
    setMembersLoading(true)
    try {
      const { data: memberRows, error: memberError } = await supabase
        .from('organization_members')
        .select('*, profiles(id, display_name, slug)')
        .eq('organization_id', nextOrg.id)
      if (memberError) {
        setMessage(memberError.message)
        return
      }
      setMembers(memberRows || [])
    } finally {
      setMembersLoading(false)
    }
  }, [org])

  useEffect(() => {
    if (org) loadMembers(org)
  }, [org, loadMembers])

  function currentMembership() {
    return members.find((member) => member.profile_id === session?.user?.id)
  }

  function ownerCount() {
    return members.filter((member) => member.role === 'owner').length
  }

  function memberEmail(member) {
    if (member.profiles?.display_name) return `${member.profiles.display_name} (@${member.profiles.slug})`
    if (member.profile_id === session?.user?.id) return session.user.email
    return member.profile_id
  }

  function normalizeProfileId(value) {
    return String(value || '').trim().replace(/^@+/, '').toLowerCase()
  }

  async function handleSearchMember(e) {
    e?.preventDefault()
    if (!supabase || !org) return
    const profileId = normalizeProfileId(memberSearchId)
    if (!profileId) return

    setSearchingMember(true)
    setMemberSearchResult(null)
    setMemberSearchMessage('')
    setMessage('')
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, slug')
        .eq('slug', profileId)
        .maybeSingle()

      if (error) {
        setMemberSearchMessage(error.message)
        return
      }
      if (!data) {
        setMemberSearchMessage('このIDのプロフィールが見つかりません。')
        return
      }
      const existing = members.find((member) => member.profile_id === data.id)
      if (existing) {
        setMemberSearchMessage(`${data.display_name || `@${data.slug}`} はすでにメンバーです。`)
        return
      }
      setMemberSearchResult(data)
    } catch (error) {
      setMemberSearchMessage(error?.message || 'プロフィールの検索に失敗しました。')
    } finally {
      setSearchingMember(false)
    }
  }

  async function handleAddSearchedMember() {
    if (!supabase || !org || !memberSearchResult) return
    setSaving(true)
    setMessage('')
    setMemberSearchMessage('')
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .insert({
          organization_id: org.id,
          profile_id: memberSearchResult.id,
          role: memberSearchRole,
        })
        .select('profile_id')
        .maybeSingle()

      if (error) {
        setMemberSearchMessage(error.message)
        return
      }
      if (!data) {
        setMemberSearchMessage('メンバーを追加できませんでした。オーナー権限があるか確認してください。')
        return
      }
      const addedName = memberSearchResult.display_name || `@${memberSearchResult.slug}`
      setMemberSearchId('')
      setMemberSearchResult(null)
      setMemberSearchMessage(`${addedName} を追加しました。`)
      await loadMembers(org)
    } finally {
      setSaving(false)
    }
  }

  async function handleRoleChange(member, role) {
    if (!supabase || !org || member.role === role) return
    if (member.role === 'owner' && role !== 'owner' && ownerCount() <= 1) {
      setMessage('オーナーは最低1人必要です。')
      return
    }
    setSaving(true)
    setMessage('')
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .update({ role })
        .eq('profile_id', member.profile_id)
        .eq('organization_id', org.id)
        .select('role')
        .maybeSingle()
      if (error) {
        setMessage(error.message)
        return
      }
      if (!data || data.role !== role) {
        setMessage('権限の変更に失敗しました。オーナー権限があるか確認してください。')
        return
      }
      await loadMembers(org)
    } finally {
      setSaving(false)
    }
  }

  async function handleRemoveMember(member) {
    if (!supabase || !org) return
    if (member.role === 'owner' && ownerCount() <= 1) {
      setMessage('オーナーは最低1人必要です。')
      return
    }
    const ok = window.confirm(`${memberEmail(member)} をメンバーから外しますか？`)
    if (!ok) return
    setSaving(true)
    setMessage('')
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .delete()
        .eq('profile_id', member.profile_id)
        .eq('organization_id', org.id)
        .select('profile_id')
        .maybeSingle()
      if (error) {
        setMessage(error.message)
        return
      }
      if (!data) {
        setMessage('メンバーの削除に失敗しました。オーナー権限があるか確認してください。')
        return
      }
      await loadMembers(org)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <DashShell orgSlug={orgSlug} />
  )

  const canManageMembers = currentMembership()?.role === 'owner'

  const content = (
    <div className="ui-settings-page">
      <section className="ui-settings-section">
          <div className="ui-settings-members">
            {membersLoading ? (
              <div className="ui-settings-member-note">読み込み中...</div>
            ) : (
              <div className="ui-settings-member-list">
                {members.map((member) => (
                  <div key={`${member.organization_id}-${member.profile_id}`} className="ui-settings-member-row">
                    <div>
                      {member.profiles?.slug ? (
                        <Link to={profilePath(member.profiles.slug)} className="ui-settings-member-email ui-settings-member-link">
                          {memberEmail(member)}
                        </Link>
                      ) : (
                        <div className="ui-settings-member-email">{memberEmail(member)}</div>
                      )}
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
              <form onSubmit={handleSearchMember} className="ui-settings-member-add-form">
                <div className="ui-form-label">IDで追加</div>
                <div className="ui-settings-member-add-grid">
                  <input
                    type="text"
                    value={memberSearchId}
                    onChange={(e) => {
                      setMemberSearchId(e.target.value)
                      setMemberSearchResult(null)
                      setMemberSearchMessage('')
                    }}
                    placeholder="@profile-id"
                    disabled={saving || searchingMember}
                  />
                  <select value={memberSearchRole} onChange={(e) => setMemberSearchRole(e.target.value)} disabled={saving}>
                    <option value="admin">管理者</option>
                    <option value="owner">オーナー</option>
                  </select>
                  <button type="submit" disabled={saving || searchingMember || !memberSearchId.trim()}>
                    {searchingMember ? '検索中...' : '検索'}
                  </button>
                </div>
                {memberSearchResult && (
                  <div className="ui-settings-member-add-result">
                    <div className="ui-settings-member-add-result-profile">
                      {memberSearchResult.display_name || '名前未設定'} (@{memberSearchResult.slug})
                    </div>
                    <button type="button" onClick={handleAddSearchedMember} disabled={saving}>
                      追加
                    </button>
                  </div>
                )}
                {memberSearchMessage && <div className="ui-settings-member-note">{memberSearchMessage}</div>}
              </form>
            ) : (
              <div className="ui-settings-member-note">メンバーの追加・権限変更はオーナーのみ操作できます。</div>
            )}

            {message && <div className="ui-settings-member-message">{message}</div>}
          </div>
      </section>
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
