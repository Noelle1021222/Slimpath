import { KeyRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { LogoMark } from '@/components/common/Logo'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { errorMessage } from '@/lib/errors'
import { authService, updatePassword } from '@/services'
import { homePathFor, useUserStore } from '@/store/useUserStore'
import { Splash } from './RootLayout'

/**
 * Landing spot for OAuth (Google), e-mail confirmation, password recovery and
 * LINE Login (`/auth/line`). Supabase's detectSessionInUrl exchanges the PKCE
 * code; we just wait for the session and route onwards.
 */
export default function AuthCallbackPage({ provider }: { provider?: 'line' }) {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const status = useUserStore((s) => s.status)
  const profile = useUserStore((s) => s.profile)
  const [error, setError] = useState<string | null>(params.get('error_description'))
  const recovery = params.get('type') === 'recovery'
  const started = useRef(false)

  useEffect(() => {
    if (provider !== 'line' || started.current) return
    started.current = true
    const code = params.get('code')
    const state = params.get('state')
    if (!code || !state) {
      setError(params.get('error_description') ?? 'LINE 登入被取消了。')
      return
    }
    authService.completeLineLogin({ code, state }).catch((e) => setError(errorMessage(e)))
  }, [provider, params])

  useEffect(() => {
    if (recovery) return
    if (status === 'ready' && profile) navigate(homePathFor(profile.role), { replace: true })
    if (status === 'needsProfile') navigate('/onboarding', { replace: true })
  }, [status, profile, navigate, recovery])

  if (error)
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-bg px-6 text-center">
        <div className="max-w-sm">
          <LogoMark className="mx-auto size-14" />
          <h1 className="mt-5 text-2xl">登入沒有完成</h1>
          <p className="mt-2 text-lg text-ink-2">{error}</p>
          <Button className="mt-6" size="lg" onClick={() => navigate('/auth', { replace: true })}>
            回到登入
          </Button>
        </div>
      </div>
    )

  if (recovery && status !== 'loading') return <NewPassword />
  return <Splash label="登入中" />
}

function NewPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-bg px-6">
      <form
        className="w-full max-w-sm space-y-5"
        onSubmit={async (e) => {
          e.preventDefault()
          if (password.length < 8) return toast.error('密碼至少需要 8 個字元。')
          setBusy(true)
          try {
            await updatePassword(password)
            toast.success('密碼已更新')
            navigate('/app', { replace: true })
          } catch (err) {
            toast.error(errorMessage(err))
          } finally {
            setBusy(false)
          }
        }}
      >
        <LogoMark className="size-14" />
        <h1 className="text-3xl">設定新密碼</h1>
        <Field label="新密碼" hint="至少 8 個字元">
          <Input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Button type="submit" size="lg" block loading={busy}>
          <KeyRound /> 更新密碼
        </Button>
      </form>
    </div>
  )
}
