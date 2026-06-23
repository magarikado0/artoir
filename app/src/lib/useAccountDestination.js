import { useEffect, useState } from 'react'
import { useAuth } from './auth'
import { profilePath } from './profileRoutes'
import { supabase } from './supabase'

export function useAccountDestination() {
  const { session } = useAuth()
  const [profileSlug, setProfileSlug] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function loadProfileSlug() {
      setProfileSlug(null)

      if (!supabase || !session?.user?.id) {
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('slug')
        .eq('id', session.user.id)
        .maybeSingle()

      if (!cancelled) setProfileSlug(data?.slug || null)
    }

    loadProfileSlug()
    return () => { cancelled = true }
  }, [session?.user?.id])

  if (!session) return '/account'
  if (!profileSlug) return '/account'
  return profilePath(profileSlug)
}
