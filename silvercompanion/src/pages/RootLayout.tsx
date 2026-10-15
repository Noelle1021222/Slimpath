import { Suspense, useEffect, type ReactNode } from 'react'
import { Navigate, Outlet, ScrollRestoration, useLocation, useRouteError } from 'react-router'
import { useApplyFontScale } from '@/hooks/useFontScale'
import { LogoMark } from '@/components/common/Logo'
import { Button } from '@/components/ui/button'
import { ConfirmHost } from '@/components/ui/confirm-dialog'
import { Toaster } from '@/components/ui/toaster'
import { useAuthBootstrap } from '@/hooks/useAuth'
import { homePathFor, useUserStore } from '@/store/useUserStore'
import type { UserRole } from '@/types'

export function RootLayout() {
  useAuthBootstrap()
  useApplyFontScale()
  return (
    <>
      <Suspense fallback={<Splash />}>
        <Outlet />
      </Suspense>
      <Toaster />
      <ConfirmHost />
      <ScrollRestoration />
    </>
  )
}

/** Branded loading screen: the persimmon breathes while we restore the session. */
export function Splash({ label = '載入中' }: { label?: string }) {
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-bg" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-4">
        <LogoMark className="size-16 animate-[float_2.4s_ease-in-out_infinite]" />
        <p className="text-base font-bold tracking-[0.3em] text-ink-3">{label}</p>
      </div>
    </div>
  )
}

/** Signed in (profile optional) — used by onboarding. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const status = useUserStore((s) => s.status)
  const profile = useUserStore((s) => s.profile)
  const location = useLocation()
  if (status === 'loading') return <Splash />
  if (status === 'signedOut') return <Navigate to={`/auth?next=${encodeURIComponent(location.pathname + location.search)}`} replace />
  if (status === 'ready' && profile && location.pathname === '/onboarding' && !new URLSearchParams(location.search).get('role'))
    return <Navigate to={homePathFor(profile.role)} replace />
  return <>{children}</>
}

/**
 * Spec 4.1.3 — routes by profiles.role. Without `role` it simply forwards to
 * the right dashboard (used by /app and after sign-in).
 */
export function RequireRole({ role, children }: { role?: UserRole; children?: ReactNode }) {
  const status = useUserStore((s) => s.status)
  const profile = useUserStore((s) => s.profile)
  const location = useLocation()

  useEffect(() => {
    if (role) {
      document.documentElement.dataset.theme = role
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', role === 'provider' ? '#0b2531' : '#fbf6ef')
    }
  }, [role])

  if (status === 'loading') return <Splash />
  if (status === 'signedOut') return <Navigate to={`/auth?next=${encodeURIComponent(location.pathname + location.search)}`} replace />
  if (status === 'needsProfile' || !profile) return <Navigate to="/onboarding" replace />
  if (!role || profile.role !== role) return <Navigate to={homePathFor(profile.role)} replace />
  return <>{children}</>
}

export function RouteError() {
  const error = useRouteError() as Error | undefined
  const chunk = /Failed to fetch dynamically imported module|Importing a module script failed/i.test(error?.message ?? '')
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-bg px-6 text-center">
      <div className="max-w-md">
        <LogoMark className="mx-auto size-16" />
        <h1 className="mt-6 text-3xl">{chunk ? '有新版本了' : '頁面發生了一點問題'}</h1>
        <p className="mt-3 text-lg leading-relaxed text-ink-2">
          {chunk ? '我們剛更新了銀髮伴，重新整理一下就好。' : '別擔心，您的資料都還在。請重新整理，或回到首頁再試一次。'}
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button size="lg" onClick={() => window.location.reload()}>
            重新整理
          </Button>
          <Button size="lg" variant="secondary" onClick={() => (window.location.href = import.meta.env.BASE_URL)}>
            回首頁
          </Button>
        </div>
        <p className="mt-8 text-base text-ink-3">緊急狀況請直接撥打 119</p>
      </div>
    </div>
  )
}
