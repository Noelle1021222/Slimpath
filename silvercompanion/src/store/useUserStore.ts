import { create } from 'zustand'
import type { Profile, SessionUser, UserRole } from '@/types'

export type AuthStatus = 'loading' | 'signedOut' | 'needsProfile' | 'ready'

interface UserState {
  status: AuthStatus
  user: SessionUser | null
  profile: Profile | null
  setSession: (user: SessionUser | null, profile: Profile | null) => void
  setProfile: (profile: Profile) => void
}

export const useUserStore = create<UserState>((set) => ({
  status: 'loading',
  user: null,
  profile: null,
  setSession: (user, profile) => set({ user, profile, status: !user ? 'signedOut' : profile ? 'ready' : 'needsProfile' }),
  setProfile: (profile) => set((s) => ({ profile, status: s.user ? 'ready' : s.status })),
}))

export const homePathFor = (role: UserRole) => (role === 'provider' ? '/provider' : '/seeker')
