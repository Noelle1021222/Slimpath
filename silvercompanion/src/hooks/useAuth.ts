import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef } from 'react'
import type { SessionUser } from '@/types'
import { authService, profileService } from '@/services'
import { useUserStore } from '@/store/useUserStore'

/** Mount once at the root: keeps the user + profile in sync with Supabase Auth. */
export function useAuthBootstrap() {
  const setSession = useUserStore((s) => s.setSession)
  const client = useQueryClient()
  const lastUser = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    let alive = true
    const load = async (user: SessionUser | null) => {
      if (lastUser.current !== undefined && lastUser.current !== (user?.id ?? null)) client.clear()
      lastUser.current = user?.id ?? null
      if (!user) {
        if (alive) setSession(null, null)
        return
      }
      try {
        const profile = await profileService.getMine()
        if (alive) setSession(user, profile)
      } catch {
        if (alive) setSession(user, null)
      }
    }
    void authService.getSessionUser().then(load)
    // Supabase advises not to await other client calls inside this callback.
    const off = authService.onAuthChange((user) => setTimeout(() => void load(user), 0))
    return () => {
      alive = false
      off()
    }
  }, [setSession, client])
}

export function useAuth() {
  const status = useUserStore((s) => s.status)
  const user = useUserStore((s) => s.user)
  const profile = useUserStore((s) => s.profile)
  const setProfile = useUserStore((s) => s.setProfile)

  const refreshProfile = useCallback(async () => {
    const next = await profileService.getMine()
    if (next) setProfile(next)
    return next
  }, [setProfile])

  const signOut = useCallback(async () => {
    await authService.signOut()
    useUserStore.getState().setSession(null, null)
  }, [])

  return { status, user, profile, refreshProfile, signOut, setProfile }
}
