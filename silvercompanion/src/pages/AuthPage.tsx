import { ArrowRight, HeartHandshake, KeyRound, Mail, MessageSquareText, Smartphone, Sparkles } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { Logo, LogoMark } from '@/components/common/Logo'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { errorMessage } from '@/lib/errors'
import { isValidTaiwanPhone } from '@/lib/format'
import { cn } from '@/lib/utils'
import { authService, isDemo, rolePreviewEnabled } from '@/services'
import { demoCredentials } from '@/services/demo/backend'
import { homePathFor, useUserStore } from '@/store/useUserStore'
import type { UserRole } from '@/types'

type Mode = 'signin' | 'signup' | 'reset'
type Method = 'email' | 'phone'

export default function AuthPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const status = useUserStore((s) => s.status)
  const profile = useUserStore((s) => s.profile)
  const [mode, setMode] = useState<Mode>(params.get('mode') === 'signup' ? 'signup' : 'signin')
  const [method, setMethod] = useState<Method>('email')
  const intent = (params.get('role') as UserRole | null) ?? null
  const next = params.get('next')

  useEffect(() => {
    document.documentElement.dataset.theme = intent === 'provider' ? 'provider' : 'seeker'
  }, [intent])

  // Once the session (and profile) is known, move on.
  useEffect(() => {
    if (status === 'ready' && profile) navigate(next && next.startsWith(homePathFor(profile.role)) ? next : homePathFor(profile.role), { replace: true })
    if (status === 'needsProfile') navigate(`/onboarding${intent ? `?role=${intent}` : ''}`, { replace: true })
  }, [status, profile, navigate, next, intent])

  return (
    <div className="min-h-[100dvh] bg-bg lg:grid lg:grid-cols-[1.05fr_1fr]">
      <BrandPanel intent={intent} />
      <main className="relative flex min-h-[100dvh] flex-col px-5 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-10 sm:px-10 lg:min-h-0 lg:justify-center lg:px-16 lg:py-14">
        <div className="mb-8 flex items-center justify-between lg:hidden">
          <Link to="/">
            <span className="sr-only">回到首頁：</span>
            <Logo compact />
          </Link>
        </div>
        <div className="mx-auto w-full max-w-[460px]">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
            <p className="text-sm font-bold tracking-[0.2em] text-primary-ink">{mode === 'signup' ? 'JOIN US' : 'WELCOME BACK'}</p>
            <h1 className="mt-2 text-[34px] leading-tight md:text-[40px]">{mode === 'signup' ? '加入銀髮伴' : mode === 'reset' ? '重設密碼' : '歡迎回來'}</h1>
            <p className="mt-2 text-lg text-ink-2">
              {mode === 'signup'
                ? '一個帳號，可以預約陪伴，也可以成為陪伴者。'
                : mode === 'reset'
                  ? '我們會寄一封重設連結到您的信箱。'
                  : '登入後就能查看行程、聯絡簿與即時位置。'}
            </p>
          </motion.div>

          {mode !== 'reset' && (
            <div className="mt-8 grid grid-cols-2 gap-1.5 rounded-2xl bg-surface-3 p-1.5" role="tablist" aria-label="登入方式">
              {(
                [
                  ['email', 'Email', Mail],
                  ['phone', '手機簡訊', Smartphone],
                ] as const
              ).map(([value, label, Icon]) => (
                <button
                  key={value}
                  role="tab"
                  aria-selected={method === value}
                  onClick={() => setMethod(value)}
                  className={cn(
                    'relative flex min-h-12 items-center justify-center gap-2 rounded-xl text-base font-bold transition-colors',
                    method === value ? 'text-ink' : 'text-ink-2 hover:text-ink',
                  )}
                >
                  {method === value && (
                    <motion.span
                      layoutId="auth-method"
                      className="absolute inset-0 rounded-xl bg-surface shadow-soft"
                      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    />
                  )}
                  <Icon className="relative size-5" />
                  <span className="relative">{label}</span>
                </button>
              ))}
            </div>
          )}

          <div className="mt-6">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`${mode}-${method}`}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.22 }}
              >
                {mode === 'reset' ? (
                  <ResetForm onBack={() => setMode('signin')} />
                ) : method === 'email' ? (
                  <EmailForm mode={mode} onForgot={() => setMode('reset')} />
                ) : (
                  <PhoneForm />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {mode !== 'reset' && (
            <>
              <div className="my-7 flex items-center gap-4 text-sm font-bold text-ink-3">
                <span className="h-px flex-1 bg-line" />
                或使用
                <span className="h-px flex-1 bg-line" />
              </div>
              <SocialButtons />
              <p className="mt-7 text-center text-base text-ink-2">
                {mode === 'signin' ? '還沒有帳號？' : '已經有帳號了？'}
                <button
                  type="button"
                  onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                  className="ml-1 min-h-11 font-bold text-primary-ink underline-offset-4 hover:underline"
                >
                  {mode === 'signin' ? '免費註冊' : '直接登入'}
                </button>
              </p>
            </>
          )}

          {rolePreviewEnabled && <QuickPreview />}
        </div>
      </main>
    </div>
  )
}

function BrandPanel({ intent }: { intent: UserRole | null }) {
  const provider = intent === 'provider'
  return (
    <aside
      className={cn(
        'relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-14',
        provider ? 'bg-[#0b2531] text-white' : 'bg-[#2b1f18] text-[#fbf6ef]',
      )}
      aria-hidden
    >
      <div
        className="absolute -top-40 -right-32 size-[620px] rounded-full opacity-90 blur-[2px]"
        style={{
          background: provider
            ? 'radial-gradient(circle at 35% 35%, #8fe3d6 0%, #2fb5a5 35%, #0f6670 70%, transparent 71%)'
            : 'radial-gradient(circle at 35% 35%, #ffd3a3 0%, #ef8c45 38%, #b5481b 70%, transparent 71%)',
        }}
      />
      <div className="absolute -bottom-24 -left-20 size-80 rounded-full border border-white/10" />
      <div className="absolute -bottom-10 -left-4 size-48 rounded-full border border-white/10" />
      <span className="relative z-10 w-fit">
        <Logo tone="light" />
      </span>
      <div className="relative z-10 max-w-md">
        <p className="font-display text-[15px] tracking-[0.3em] text-white/60 uppercase">{provider ? 'For companions' : 'For families'}</p>
        <p className="mt-5 font-serif text-[52px] leading-[1.15] font-black">
          {provider ? (
            <>
              用專業與溫暖，
              <br />
              陪一段路。
            </>
          ) : (
            <>
              你不在身邊的時候，
              <br />
              有人陪著他們。
            </>
          )}
        </p>
        <ul className="mt-10 space-y-4 text-lg text-white/85">
          {(provider
            ? ['時薪自己訂，每月可提領一次', '平台代收款項，免追帳', '透明 15% 服務費，沒有隱藏費用']
            : ['每位陪伴者皆通過實名與良民證審核', '即時 GPS，知道陪伴者走到哪裡', '數位聯絡簿，照片與心情一目了然']
          ).map((t) => (
            <li key={t} className="flex items-center gap-3">
              <span
                className={cn('grid size-7 place-items-center rounded-full', provider ? 'bg-[#2fb5a5]/25 text-[#8fe3d6]' : 'bg-[#e9803f]/25 text-[#ffc48f]')}
              >
                <Sparkles className="size-4" />
              </span>
              {t}
            </li>
          ))}
        </ul>
      </div>
      <p className="relative z-10 text-base text-white/50">緊急狀況請直接撥打 119</p>
    </aside>
  )
}

function EmailForm({ mode, onForgot }: { mode: Mode; onForgot: () => void }) {
  const demo = isDemo ? demoCredentials() : null
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('請輸入有效的 Email。')
    if (password.length < (mode === 'signup' ? 8 : 6)) return setError(mode === 'signup' ? '密碼至少需要 8 個字元。' : '請輸入密碼。')
    setBusy(true)
    try {
      if (mode === 'signup') {
        const { needsConfirmation } = await authService.signUpWithPassword(email, password)
        if (needsConfirmation) setSent(true)
      } else {
        await authService.signInWithPassword(email, password)
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (sent)
    return (
      <div className="rounded-3xl border border-line bg-surface p-6 text-center">
        <Mail className="mx-auto size-10 text-primary" />
        <p className="mt-3 text-xl font-bold">請到信箱收取確認信</p>
        <p className="mt-2 text-base text-ink-2">點擊信中的連結後，就會回到銀髮伴完成註冊。</p>
      </div>
    )

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <Field label="Email">
        <Input type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
      </Field>
      <Field
        label="密碼"
        error={error}
        aside={
          mode === 'signin' && (
            <button type="button" onClick={onForgot} className="min-h-10 text-[15px] font-bold text-primary-ink hover:underline">
              忘記密碼？
            </button>
          )
        }
        hint={mode === 'signup' ? '至少 8 個字元' : undefined}
      >
        <Input
          type="password"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      <Button type="submit" size="lg" block loading={busy}>
        {mode === 'signup' ? '建立帳號' : '登入'} <ArrowRight />
      </Button>
      {demo && mode === 'signin' && (
        <button
          type="button"
          onClick={() => {
            setEmail(demo.seekerEmail)
            setPassword(demo.password)
          }}
          className="w-full rounded-2xl border border-dashed border-line-strong px-4 py-3 text-left text-[15px] leading-relaxed text-ink-2 transition-colors hover:border-primary hover:text-ink"
        >
          <span className="font-bold text-ink">示範帳號：</span>
          {demo.seekerEmail}（家屬）或 {demo.providerEmail}（陪伴者），密碼 {demo.password}。點此自動帶入。
        </button>
      )}
    </form>
  )
}

function PhoneForm() {
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [stage, setStage] = useState<'phone' | 'code'>('phone')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const send = async () => {
    setError(null)
    if (!isValidTaiwanPhone(phone)) return setError('請輸入正確的手機號碼，例如 0912-345-678。')
    setBusy(true)
    try {
      await authService.sendPhoneOtp(phone)
      setStage('code')
      setCooldown(60)
      toast.success('驗證碼已寄出', { description: isDemo ? '示範模式請輸入 123456' : '請查看手機簡訊' })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const verify = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!/^\d{6}$/.test(code)) return setError('請輸入 6 位數驗證碼。')
    setBusy(true)
    try {
      await authService.verifyPhoneOtp(phone, code)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return stage === 'phone' ? (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void send()
      }}
      className="space-y-5"
      noValidate
    >
      <Field label="手機號碼" error={error} hint="我們會傳送 6 位數驗證碼到這支手機">
        <Input type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0912-345-678" />
      </Field>
      <Button type="submit" size="lg" block loading={busy}>
        <MessageSquareText /> 傳送驗證碼
      </Button>
    </form>
  ) : (
    <form onSubmit={verify} className="space-y-5" noValidate>
      <Field label={`輸入傳到 ${phone} 的驗證碼`} error={error}>
        <Input
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          className="text-center font-num text-3xl tracking-[0.6em]"
          placeholder="••••••"
        />
      </Field>
      <Button type="submit" size="lg" block loading={busy}>
        <KeyRound /> 驗證並登入
      </Button>
      <div className="flex justify-between text-[15px]">
        <button type="button" className="min-h-10 font-bold text-ink-2 hover:text-ink" onClick={() => setStage('phone')}>
          換一支號碼
        </button>
        <button type="button" disabled={cooldown > 0} className="min-h-10 font-bold text-primary-ink disabled:text-ink-3" onClick={() => void send()}>
          {cooldown > 0 ? `${cooldown} 秒後可重寄` : '重新寄送'}
        </button>
      </div>
    </form>
  )
}

function ResetForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  return done ? (
    <div className="rounded-3xl border border-line bg-surface p-6 text-center">
      <Mail className="mx-auto size-10 text-primary" />
      <p className="mt-3 text-xl font-bold">重設連結已寄出</p>
      <p className="mt-2 text-base text-ink-2">請查看 {email} 的收件匣（也看看垃圾郵件）。</p>
      <Button variant="secondary" className="mt-5" onClick={onBack}>
        回到登入
      </Button>
    </div>
  ) : (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        try {
          await authService.resetPassword(email)
          setDone(true)
        } catch (err) {
          toast.error(errorMessage(err))
        } finally {
          setBusy(false)
        }
      }}
    >
      <Field label="註冊時使用的 Email">
        <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </Field>
      <Button type="submit" size="lg" block loading={busy}>
        寄送重設連結
      </Button>
      <Button type="button" variant="ghost" size="lg" block onClick={onBack}>
        回到登入
      </Button>
    </form>
  )
}

function SocialButtons() {
  const [busy, setBusy] = useState<'google' | 'line' | null>(null)
  const run = async (kind: 'google' | 'line') => {
    setBusy(kind)
    try {
      if (kind === 'google') await authService.signInWithGoogle()
      else await authService.startLineLogin()
    } catch (err) {
      toast.message(errorMessage(err))
      setBusy(null)
    }
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Button variant="line" size="lg" loading={busy === 'line'} onClick={() => void run('line')}>
        <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
          <path
            fill="currentColor"
            d="M12 3C6.48 3 2 6.6 2 11.05c0 3.99 3.55 7.33 8.35 7.96.33.07.77.21.88.49.1.25.06.64.03.9l-.14.85c-.04.25-.2.98.86.53 1.06-.44 5.72-3.37 7.81-5.77C21.21 14.43 22 12.82 22 11.05 22 6.6 17.52 3 12 3Zm-3.6 10.3H6.42a.52.52 0 0 1-.52-.52V8.83a.52.52 0 1 1 1.04 0v3.43H8.4a.52.52 0 1 1 0 1.04Zm2.05-.52a.52.52 0 1 1-1.04 0V8.83a.52.52 0 1 1 1.04 0v3.95Zm4.75 0a.52.52 0 0 1-.94.31l-2.03-2.76v2.45a.52.52 0 1 1-1.04 0V8.83a.52.52 0 0 1 .94-.31l2.03 2.76V8.83a.52.52 0 1 1 1.04 0v3.95Zm3.2-2.5a.52.52 0 1 1 0 1.04h-1.46v.94h1.46a.52.52 0 1 1 0 1.04h-1.98a.52.52 0 0 1-.52-.52V8.83c0-.29.23-.52.52-.52h1.98a.52.52 0 1 1 0 1.04h-1.46v.93h1.46Z"
          />
        </svg>
        LINE 登入
      </Button>
      <Button variant="secondary" size="lg" loading={busy === 'google'} onClick={() => void run('google')}>
        <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
          />
          <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84Z" />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
          />
        </svg>
        Google 登入
      </Button>
    </div>
  )
}

/** Spec 4.1.3 — test environments may preview either identity instantly. */
function QuickPreview() {
  const [busy, setBusy] = useState<UserRole | null>(null)
  const go = async (role: UserRole) => {
    setBusy(role)
    try {
      await authService.previewAs(role)
    } catch (err) {
      toast.error(errorMessage(err))
      setBusy(null)
    }
  }
  return (
    <section className="mt-10 rounded-[28px] border border-line bg-surface p-5 shadow-soft" aria-labelledby="preview-title">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-bold text-primary-ink">{isDemo ? '示範模式' : '測試環境'}</span>
        <h2 id="preview-title" className="font-sans text-base font-bold">
          快速體驗身分
        </h2>
      </div>
      <p className="mt-1 text-[15px] text-ink-2">不用註冊，直接用示範帳號逛一圈。開兩個分頁分別登入，就能看到即時同步。</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => void go('seeker')}
          disabled={!!busy}
          className="group relative overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#fde7d4,#f7c9a2)] p-4 text-left text-[#4a2410] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          <LogoMark className="absolute -right-3 -bottom-3 size-20 opacity-25 transition-transform duration-500 group-hover:rotate-12" />
          <span className="text-sm font-bold opacity-75">長輩・家屬</span>
          <span className="mt-0.5 block text-xl font-black">陳怡君</span>
          <span className="mt-2 inline-flex items-center gap-1 text-[15px] font-bold">
            {busy === 'seeker' ? '登入中…' : '進入家屬版'} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </span>
        </button>
        <button
          type="button"
          onClick={() => void go('provider')}
          disabled={!!busy}
          className="group relative overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#0f3442,#0f6670)] p-4 text-left text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          <HeartHandshake className="absolute -right-2 -bottom-2 size-20 opacity-20 transition-transform duration-500 group-hover:-rotate-12" />
          <span className="text-sm font-bold text-white/75">陪伴者</span>
          <span className="mt-0.5 block text-xl font-black">林小君</span>
          <span className="mt-2 inline-flex items-center gap-1 text-[15px] font-bold">
            {busy === 'provider' ? '登入中…' : '進入陪伴者版'} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </span>
        </button>
      </div>
    </section>
  )
}
