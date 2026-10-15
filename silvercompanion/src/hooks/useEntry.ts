import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { errorMessage } from '@/lib/errors'
import { authService, rolePreviewEnabled } from '@/services'
import { homePathFor, useUserStore } from '@/store/useUserStore'
import type { UserRole } from '@/types'

function waitUntilReady(timeoutMs = 4000) {
  return new Promise<void>((resolve) => {
    if (useUserStore.getState().status === 'ready') return resolve()
    let unsubscribe = () => {}
    const timer = setTimeout(() => {
      unsubscribe()
      resolve()
    }, timeoutMs)
    unsubscribe = useUserStore.subscribe((s) => {
      if (s.status !== 'ready') return
      clearTimeout(timer)
      unsubscribe()
      resolve()
    })
  })
}

/** Where each call-to-action should lead for the current visitor. */
export function useEntry() {
  const status = useUserStore((s) => s.status)
  const profile = useUserStore((s) => s.profile)
  const navigate = useNavigate()
  const [busy, setBusy] = useState<UserRole | null>(null)
  const signedIn = status === 'ready' && !!profile

  const seekerHref = !signedIn ? '/auth?role=seeker&mode=signup' : profile.role === 'seeker' ? '/seeker/search' : homePathFor(profile.role)
  const providerHref = !signedIn ? '/auth?role=provider&mode=signup' : homePathFor(profile.role)

  const preview = async (role: UserRole) => {
    setBusy(role)
    try {
      await authService.previewAs(role)
      await waitUntilReady()
      navigate(homePathFor(role))
    } catch (e) {
      toast.error(errorMessage(e))
      setBusy(null)
    }
  }

  return { signedIn, profile, seekerHref, providerHref, preview, busy, canPreview: rolePreviewEnabled && !signedIn }
}
