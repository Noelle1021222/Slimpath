import { ArrowLeft, ArrowRight, Check, HeartHandshake, House, Lock, PartyPopper } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { Logo } from '@/components/common/Logo'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { Field } from '@/components/ui/field'
import { Input, Select, Textarea } from '@/components/ui/input'
import { RangeSlider } from '@/components/ui/range-slider'
import { SERVICES } from '@/lib/constants'
import { errorMessage } from '@/lib/errors'
import { formatMoney, isValidTaiwanPhone, normalizePhone } from '@/lib/format'
import { computePrice, DEFAULT_RATE, RATE_MAX, RATE_MIN, RATE_STEP } from '@/lib/pricing'
import { CITY_NAMES, districtsOf } from '@/lib/taiwan'
import { cn } from '@/lib/utils'
import { profileService, providerService } from '@/services'
import { homePathFor, useUserStore } from '@/store/useUserStore'
import type { Profile, ServiceType, UserRole } from '@/types'

type Step = 0 | 1 | 2 | 3

export default function OnboardingPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const user = useUserStore((s) => s.user)
  const setProfile = useUserStore((s) => s.setProfile)
  const [step, setStep] = useState<Step>(0)
  const [dir, setDir] = useState(1)
  const [role, setRole] = useState<UserRole | null>((params.get('role') as UserRole | null) ?? null)
  const [fullName, setFullName] = useState(user?.suggestedName ?? '')
  const [nickname, setNickname] = useState('')
  const [phone, setPhone] = useState(user?.phone ? `0${user.phone.replace(/^\+?886/, '')}` : '')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [rate, setRate] = useState(DEFAULT_RATE)
  const [services, setServices] = useState<ServiceType[]>(['chat'])
  const [city, setCity] = useState('台北市')
  const [districts, setDistricts] = useState<string[]>([])
  const [bio, setBio] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  // Held back until the welcome screen is dismissed, so the route guard does
  // not whisk the user away mid-celebration.
  const [created, setCreated] = useState<Profile | null>(null)

  useEffect(() => {
    document.documentElement.dataset.theme = role === 'provider' ? 'provider' : 'seeker'
  }, [role])

  const go = (next: Step) => {
    setDir(next > step ? 1 : -1)
    setStep(next)
  }

  const validateBasics = () => {
    const e: Record<string, string> = {}
    if (fullName.trim().length < 2) e.fullName = '請填寫身分證上的真實姓名。'
    if (!isValidTaiwanPhone(phone)) e.phone = '請輸入正確的電話，例如 0912-345-678。'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const finish = async () => {
    if (!role) return
    const e: Record<string, string> = {}
    if (role === 'seeker' && contactPhone && !isValidTaiwanPhone(contactPhone)) e.contactPhone = '電話格式不正確。'
    if (role === 'provider' && services.length === 0) e.services = '請至少選擇一項服務。'
    setErrors(e)
    if (Object.keys(e).length) return
    setSaving(true)
    try {
      const profile = await profileService.create({
        role,
        full_name: fullName.trim(),
        nickname: nickname.trim() || null,
        phone: normalizePhone(phone),
        emergency_contact_name: role === 'seeker' ? contactName.trim() || null : null,
        emergency_contact_phone: role === 'seeker' && contactPhone ? normalizePhone(contactPhone) : null,
      })
      if (role === 'provider') {
        await providerService.updateMine({ hourly_rate: rate, service_types: services, city, districts, bio: bio.trim() || null })
      }
      setCreated(profile)
      go(3)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const progress = step === 3 ? 1 : (step + 1) / 3

  return (
    <div className="min-h-[100dvh] bg-bg">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 pt-[calc(1.25rem+env(safe-area-inset-top))] md:px-8 md:pt-8">
        <Logo compact />
        {step < 3 && <p className="text-base font-bold text-ink-3">步驟 {step + 1} / 3</p>}
      </header>
      <div className="mx-auto mt-5 max-w-3xl px-5 md:px-8" aria-hidden>
        <div className="h-2 overflow-hidden rounded-full bg-surface-3">
          <motion.div
            className="h-full rounded-full bg-primary"
            animate={{ width: `${progress * 100}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 30 }}
          />
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-5 pt-10 pb-16 md:px-8">
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.section
            key={step}
            custom={dir}
            initial={{ opacity: 0, x: dir * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -40 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {step === 0 && (
              <>
                <h1 className="text-[34px] leading-tight md:text-5xl">您好！請問您是…</h1>
                <p className="mt-3 text-lg text-ink-2">之後也可以在「我的」切換身分，一個帳號兩種角色都能用。</p>
                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  <RoleCard
                    selected={role === 'seeker'}
                    onSelect={() => setRole('seeker')}
                    tone="warm"
                    icon={<House className="size-8" />}
                    title="長輩・家屬"
                    text="幫爸媽或自己預約陪伴：聊天、就醫、散步、學手機。"
                  />
                  <RoleCard
                    selected={role === 'provider'}
                    onSelect={() => setRole('provider')}
                    tone="cool"
                    icon={<HeartHandshake className="size-8" />}
                    title="陪伴者"
                    text="用專業與溫暖接案，自己決定時薪與時段。"
                  />
                </div>
                <div className="mt-10 flex justify-end">
                  <Button size="lg" disabled={!role} onClick={() => go(1)}>
                    下一步 <ArrowRight />
                  </Button>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <h1 className="text-[34px] leading-tight md:text-5xl">讓我們認識您</h1>
                <p className="mt-3 text-lg text-ink-2">銀髮伴採實名制，讓每一次陪伴都安心。</p>
                <div className="mt-8 space-y-6 rounded-[28px] border border-line bg-surface p-6 shadow-soft md:p-8">
                  <Field
                    label="真實姓名"
                    error={errors.fullName}
                    hint={
                      <span className="inline-flex items-start gap-1.5">
                        <Lock className="mt-0.5 size-4 shrink-0" />
                        {role === 'provider' ? '提領時會核對銀行戶名，通過審核後無法自行修改。' : '只用於身分核對，不會公開顯示。'}
                      </span>
                    }
                  >
                    <Input autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="王小明" />
                  </Field>
                  <Field label="稱呼" optional hint={role === 'provider' ? '家屬看到的名字，例如「小君」' : '例如「怡君」、「陳媽媽」'}>
                    <Input value={nickname} maxLength={20} onChange={(e) => setNickname(e.target.value)} placeholder={role === 'provider' ? '小君' : '怡君'} />
                  </Field>
                  <Field label="聯絡電話" error={errors.phone}>
                    <Input type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0912-345-678" />
                  </Field>
                </div>
                <StepNav onBack={() => go(0)} onNext={() => validateBasics() && go(2)} />
              </>
            )}

            {step === 2 && role === 'seeker' && (
              <>
                <h1 className="text-[34px] leading-tight md:text-5xl">緊急聯絡人</h1>
                <p className="mt-3 text-lg text-ink-2">按下 SOS 時，我們會把定位傳給這位家人。建議填寫，稍後也能修改。</p>
                <div className="mt-8 space-y-6 rounded-[28px] border border-line bg-surface p-6 shadow-soft md:p-8">
                  <Field label="聯絡人姓名" optional>
                    <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="陳志明（哥哥）" />
                  </Field>
                  <Field label="聯絡人電話" optional error={errors.contactPhone}>
                    <Input type="tel" inputMode="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="0922-111-222" />
                  </Field>
                </div>
                <StepNav onBack={() => go(1)} onNext={finish} nextLabel="完成設定" loading={saving} />
              </>
            )}

            {step === 2 && role === 'provider' && (
              <>
                <h1 className="text-[34px] leading-tight md:text-5xl">設定您的服務</h1>
                <p className="mt-3 text-lg text-ink-2">這些都能隨時在「個人檔案」調整。</p>
                <div className="mt-8 space-y-8 rounded-[28px] border border-line bg-surface p-6 shadow-soft md:p-8">
                  <div>
                    <p className="text-base font-bold">基本時薪</p>
                    <RangeSlider
                      value={rate}
                      onChange={setRate}
                      min={RATE_MIN}
                      max={RATE_MAX}
                      step={RATE_STEP}
                      label="基本時薪"
                      format={(v) => `$${v}`}
                      suffix=" / 小時"
                      marks={[600]}
                    />
                    <p className="mt-3 rounded-2xl bg-primary-soft px-4 py-3 text-base text-primary-ink">
                      每小時實拿 <b className="font-num text-lg">{formatMoney(computePrice(rate, 1).providerEarning)}</b>（平台服務費 15%）
                    </p>
                  </div>
                  <fieldset>
                    <legend className="mb-3 text-base font-bold">提供的服務</legend>
                    <div className="flex flex-wrap gap-2.5">
                      {SERVICES.map((s) => (
                        <Chip
                          key={s.id}
                          size="lg"
                          selected={services.includes(s.id)}
                          icon={<s.icon />}
                          onClick={() => setServices((cur) => (cur.includes(s.id) ? cur.filter((x) => x !== s.id) : [...cur, s.id]))}
                        >
                          {s.label}
                        </Chip>
                      ))}
                    </div>
                    {errors.services && <p className="mt-2 text-sm font-bold text-danger-strong">{errors.services}</p>}
                  </fieldset>
                  <div className="grid gap-5 md:grid-cols-2">
                    <Field label="服務縣市">
                      <Select
                        value={city}
                        onChange={(e) => {
                          setCity(e.target.value)
                          setDistricts([])
                        }}
                      >
                        {CITY_NAMES.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="主要服務區域" hint="可複選，留白表示全縣市">
                      <Select value="" onChange={(e) => e.target.value && setDistricts((d) => (d.includes(e.target.value) ? d : [...d, e.target.value]))}>
                        <option value="">新增行政區…</option>
                        {districtsOf(city).map((d) => (
                          <option key={d}>{d}</option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                  {districts.length > 0 && (
                    <div className="-mt-3 flex flex-wrap gap-2">
                      {districts.map((d) => (
                        <Chip key={d} selected showCheck onClick={() => setDistricts((cur) => cur.filter((x) => x !== d))} aria-label={`移除 ${d}`}>
                          {d}
                        </Chip>
                      ))}
                    </div>
                  )}
                  <Field label="一句話介紹自己" optional>
                    <Textarea
                      value={bio}
                      maxLength={1000}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="例如：護理系畢業，喜歡聽長輩說故事。"
                      className="min-h-24"
                    />
                  </Field>
                </div>
                <StepNav onBack={() => go(1)} onNext={finish} nextLabel="完成設定" loading={saving} />
              </>
            )}

            {step === 3 && (
              <div className="py-6 text-center md:py-14">
                <motion.div
                  initial={{ scale: 0.4, rotate: -20, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.1 }}
                  className="mx-auto grid size-24 place-items-center rounded-full bg-primary text-on-primary shadow-glow"
                >
                  <PartyPopper className="size-11" />
                </motion.div>
                <h1 className="mt-8 text-[34px] leading-tight md:text-5xl">歡迎加入銀髮伴！</h1>
                <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-ink-2">
                  {role === 'provider' ? '您的資料已送出審核。上傳良民證與證照後，通過審核即可上線接案。' : '下一步，建立長輩的照顧檔案，就能開始預約陪伴了。'}
                </p>
                <Button
                  size="xl"
                  className="mt-10"
                  onClick={() => {
                    if (created) setProfile(created)
                    navigate(role ? homePathFor(role) : '/app', { replace: true })
                  }}
                >
                  {role === 'provider' ? '前往工作台' : '開始使用'} <ArrowRight />
                </Button>
              </div>
            )}
          </motion.section>
        </AnimatePresence>
      </main>
    </div>
  )
}

function StepNav({ onBack, onNext, nextLabel = '下一步', loading }: { onBack: () => void; onNext: () => void; nextLabel?: string; loading?: boolean }) {
  return (
    <div className="mt-10 flex items-center justify-between gap-3">
      <Button variant="ghost" size="lg" onClick={onBack}>
        <ArrowLeft /> 上一步
      </Button>
      <Button size="lg" onClick={onNext} loading={loading}>
        {nextLabel} <ArrowRight />
      </Button>
    </div>
  )
}

function RoleCard({
  selected,
  onSelect,
  tone,
  icon,
  title,
  text,
}: {
  selected: boolean
  onSelect: () => void
  tone: 'warm' | 'cool'
  icon: React.ReactNode
  title: string
  text: string
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'group relative overflow-hidden rounded-[28px] border-2 p-7 text-left transition-all duration-300 focus-visible:ring-4 focus-visible:ring-[var(--ring)] focus-visible:outline-none',
        tone === 'warm' ? 'bg-[linear-gradient(150deg,#fff6ec,#fde3cc)] text-[#3a1d0c]' : 'bg-[linear-gradient(150deg,#e8f5f4,#cfe9e6)] text-[#0b2a33]',
        selected
          ? tone === 'warm'
            ? 'border-[#b5481b] shadow-lift'
            : 'border-[#0f6670] shadow-lift'
          : 'border-transparent hover:-translate-y-1 hover:shadow-soft',
      )}
    >
      <span
        className={cn(
          'absolute -right-10 -bottom-10 size-40 rounded-full transition-transform duration-500 group-hover:scale-110',
          tone === 'warm' ? 'bg-[#f2a065]/30' : 'bg-[#2fb5a5]/25',
        )}
      />
      <span className={cn('relative grid size-16 place-items-center rounded-2xl text-white', tone === 'warm' ? 'bg-[#b5481b]' : 'bg-[#0f6670]')}>{icon}</span>
      <span className="relative mt-6 block font-serif text-3xl font-black">{title}</span>
      <span className="relative mt-2 block text-lg leading-relaxed opacity-80">{text}</span>
      <span
        className={cn(
          'absolute top-6 right-6 grid size-9 place-items-center rounded-full border-2 transition-all',
          selected ? (tone === 'warm' ? 'border-[#b5481b] bg-[#b5481b] text-white' : 'border-[#0f6670] bg-[#0f6670] text-white') : 'border-black/15',
        )}
      >
        {selected && <Check className="size-5" strokeWidth={3} />}
      </span>
    </button>
  )
}
