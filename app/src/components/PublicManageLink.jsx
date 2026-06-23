import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { Icon } from './Header'

export default function PublicManageLink({ ownerType, ownerId, to, label = '管理' }) {
  const { session } = useAuth()
  const profileId = session?.user?.id
  const [canManage, setCanManage] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function resolvePermission() {
      if (!profileId || !ownerId || !to) {
        setCanManage(false)
        return
      }

      if (ownerType === 'profile') {
        setCanManage(ownerId === profileId)
        return
      }

      if (ownerType !== 'organization' || !supabase) {
        setCanManage(false)
        return
      }

      setCanManage(false)
      const { data } = await supabase
        .from('organization_members')
        .select('profile_id')
        .eq('organization_id', ownerId)
        .eq('profile_id', profileId)
        .maybeSingle()

      if (!cancelled) setCanManage(Boolean(data))
    }

    resolvePermission()
    return () => { cancelled = true }
  }, [ownerId, ownerType, profileId, to])

  if (!canManage) return null

  return (
    <Link to={to} className="ui-inline-edit-action">
      <Icon name="edit" size={15} />
      <span>{label}</span>
    </Link>
  )
}
