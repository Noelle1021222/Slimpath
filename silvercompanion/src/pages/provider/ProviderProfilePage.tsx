import {
  ArrowLeftRight,
  BadgeCheck,
  CalendarRange,
  ChevronRight,
  Eye,
  HandCoins,
  Hourglass,
  Landmark,
  LogOut,
  Phone,
  PhoneCall,
  RotateCcw,
  ShieldAlert,
  Star,
  Type,
  Youtube,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { AvatarUploader } from '@/components/common/AvatarUploader'
import { FontSizeControl } from '@/components/common/FontSizeControl'
import { PageContainer, PageHeader } from '@/components/common/PageHeader'
import { ProfileEditModal } from '@/components/common/ProfileEditModal'
import { AvailabilityEditorModal } from '@/components/provider/AvailabilityEditorModal'
import { BankSetupModal } from '@/components/provider/BankSetupModal'
import { OnlineToggle } from '@/components/provider/OnlineToggle'
import { RateSettingModal } from '@/components/provider/RateSettingModal'
import { ServiceSettingsForm } from '@/components/provider/ServiceSettingsForm'
import { VerificationCard } from '@/components/provider/VerificationCard'
import { YoutubeLinkModal } from '@/components/provider/YoutubeLinkModal'
import { CompanionCard } from '@/components/seeker/CompanionCard'
import { Button } from '@/components/ui/button'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useMyProvider, useProviderPublic } from '@/hooks/queries'
import { useAuth } from '@/hooks/useAuth'
import { bankName } from '@/lib/banks'
import { SUPPORT_PHONE } from '@/lib/constants'
import { errorMessage } from '@/lib/errors'
import { formatPhone, maskAccount } from '@/lib/format'
import { cn } from '@/lib/utils'
import { isDemo, profileService } from '@/services'
import { resetDemo } from '@/services/demo/store'

type Sheet = 'rate' | 'slots' | 'video' | 'bank' | 'profile' | null

/** Spec 4.3 — the companion's account, public profile and service settings. */
export default function ProviderProfilePage() {
  const { profile, user, signOut, setProfile } = useAuth()
  const details = useMyProvider()
  const pub = useProviderPublic(profile?.id)
  const navigate = useNavigate()
  const confirm = useConfirm()
  const [sheet, setSheet] = useState<Sheet>(null)
  const d = details.data
  if (!profile) return null
  const openHours = d ? Object.values(d.availability_slots ?? {}).reduce((n, h) => n + h.length, 0) : 0
  const sheetProps = (name: Exclude<Sheet, null>) => ({ open: sheet === name, onOpenChange: (v: boolean) => setSheet(v ? name : null) })

  return (
    <PageContainer>
      <PageHeader eyebrow="My profile" title="我的" />

      <section className="grain relative overflow-hidden rounded-[32px] bg-hero p-6 text-hero-ink md:p-9">
        <div
          className="pointer-events-none absolute -top-28 -right-20 size-96 rounded-full bg-[radial-gradient(circle,rgba(47,181,165,0.4),transparent_65%)]"
          aria-hidden
        />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_400px] lg:items-center">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <AvatarUploader />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-3xl font-black text-white md:text-4xl">{profile.full_name}</p>
                {d &&
                  (d.is_verified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#2fb5a5]/20 px-3 py-1 text-sm font-bold text-[#8fe3d6]">
                      <BadgeCheck className="size-4" /> 實名認證
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-sm font-bold text-white/80">
                      <Hourglass className="size-4" /> 審核中
                    </span>
                  ))}
              </div>
              <p className="mt-1 text-base text-hero-ink/75">
                {profile.nickname ? `家屬稱呼您「${profile.nickname}」・` : ''}
                {formatPhone(profile.phone)}
                {user?.email ? `・${user.email}` : ''}
              </p>
              {d && (
                <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px] text-hero-ink/85">
                  <span className="inline-flex items-center gap-1">
                    <Star className="size-4 fill-[#f2b45a] text-[#f2b45a]" />
                    <b className="font-num text-white">{Number(d.rating_avg).toFixed(2)}</b>・{d.review_count} 則評價
                  </span>
                  <span>已服務 {d.completed_orders} 次</span>
                </p>
              )}
            </div>
            <Button
              variant="secondary"
              className="self-start border-white/20 bg-white/10 text-white hover:bg-white/15 sm:self-center"
              onClick={() => setSheet('profile')}
            >
              編輯資料
            </Button>
          </div>
          {d ? <OnlineToggle details={d} /> : <Skeleton className="h-24 rounded-3xl opacity-20" />}
        </div>
      </section>

      {d && <VerificationCard className="mt-5" verified={d.is_verified} />}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-6">{d ? <ServiceSettingsForm details={d} /> : <Skeleton className="h-[640px] rounded-[32px]" />}</div>

        <aside className="space-y-6">
          <section aria-labelledby="preview-title">
            <h2 id="preview-title" className="mb-2 flex items-center gap-2 px-1 font-sans text-sm font-bold tracking-wider text-ink-3">
              <Eye className="size-4" /> 家屬看到的您
            </h2>
            {/* Rendered in the families' warm theme, exactly as it appears in search. */}
            <div data-theme="seeker" className="rounded-[32px] bg-bg p-3">
              {pub.data ? (
                <CompanionCard provider={pub.data} preview />
              ) : pub.isLoading ? (
                <Skeleton className="h-80 rounded-[28px]" />
              ) : (
                <p className="rounded-[28px] bg-surface p-6 text-center text-base text-ink-3">完成審核並上線後，家屬就能在搜尋中看到您。</p>
              )}
            </div>
          </section>

          <MenuGroup title="接案設定">
            <MenuButton icon={<HandCoins />} label="時薪" detail={d ? `$${d.hourly_rate} / 小時` : undefined} onClick={() => setSheet('rate')} disabled={!d} />
            <MenuButton
              icon={<CalendarRange />}
              label="空檔時段"
              detail={d ? `未來兩週 ${openHours} 小時` : undefined}
              onClick={() => setSheet('slots')}
              disabled={!d}
            />
            <MenuButton
              icon={<Youtube />}
              label="自我介紹影片"
              detail={d?.youtube_video_id ? '已上傳' : '尚未上傳'}
              onClick={() => setSheet('video')}
              disabled={!d}
            />
            <MenuButton
              icon={<Landmark />}
              label="收款帳戶"
              detail={d?.bank_account ? `${bankName(d.bank_code)} ${maskAccount(d.bank_account)}` : '尚未設定'}
              onClick={() => setSheet('bank')}
              disabled={!d}
            />
          </MenuGroup>

          <MenuGroup title="閱讀與顯示">
            <div className="space-y-4 px-5 py-5">
              <span className="flex items-center gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-info-soft text-info">
                  <Type className="size-5" />
                </span>
                <span>
                  <span className="block text-lg font-bold">字體大小</span>
                  <span className="block text-[15px] text-ink-2">整個 App 的文字都會一起放大</span>
                </span>
              </span>
              <FontSizeControl />
            </div>
          </MenuGroup>

          <MenuGroup title="安全">
            <MenuButton
              icon={<ShieldAlert />}
              tone="danger"
              label="緊急聯絡人"
              detail={profile.emergency_contact_name ? profile.emergency_contact_name : '尚未設定'}
              onClick={() => setSheet('profile')}
            />
            <a href={`tel:${SUPPORT_PHONE.replace(/-/g, '')}`} className="flex min-h-[72px] items-center gap-4 px-5 transition-colors hover:bg-surface-2">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-success-soft text-success">
                <PhoneCall className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-bold">陪伴者專線</span>
                <span className="block text-[15px] text-ink-2">
                  <span className="font-num">{SUPPORT_PHONE}</span>・每天 8–22 點
                </span>
              </span>
              <Phone className="size-5 text-ink-3" />
            </a>
          </MenuGroup>

          <MenuGroup title="帳號">
            <MenuButton
              icon={<ArrowLeftRight />}
              label="切換為家屬身分"
              onClick={async () => {
                if (!(await confirm({ title: '切換為家屬身分？', description: '同一個帳號也能為自己的長輩預約陪伴。隨時可以切換回來。', confirmText: '切換' })))
                  return
                try {
                  const next = await profileService.switchRole('seeker')
                  setProfile(next)
                  navigate('/seeker')
                } catch (e) {
                  toast.error(errorMessage(e))
                }
              }}
            />
            {isDemo && (
              <MenuButton
                icon={<RotateCcw />}
                tone="neutral"
                label="重設示範資料"
                onClick={async () => {
                  if (await confirm({ title: '重設示範資料？', description: '新增的預約、訊息與紀錄都會還原成初始狀態。', confirmText: '重設' })) {
                    resetDemo()
                    window.location.reload()
                  }
                }}
              />
            )}
            <button
              type="button"
              onClick={async () => {
                await signOut()
                navigate('/')
              }}
              className="flex min-h-[72px] w-full items-center gap-4 px-5 text-left text-danger-strong transition-colors hover:bg-danger-soft/50"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-danger-soft">
                <LogOut className="size-5" />
              </span>
              <span className="flex-1 text-lg font-bold">登出</span>
            </button>
          </MenuGroup>
        </aside>
      </div>

      <p className="mt-10 text-center text-sm text-ink-3">銀髮伴 SilverCompanion v1.0{isDemo ? '・示範模式（資料只存在這台裝置）' : ''}</p>

      <ProfileEditModal {...sheetProps('profile')} />
      {d && (
        <>
          <RateSettingModal {...sheetProps('rate')} details={d} />
          <AvailabilityEditorModal {...sheetProps('slots')} details={d} />
          <YoutubeLinkModal {...sheetProps('video')} details={d} />
          <BankSetupModal {...sheetProps('bank')} details={d} />
        </>
      )}
    </PageContainer>
  )
}

function MenuGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <h2 className="mb-2 px-1 font-sans text-sm font-bold tracking-wider text-ink-3">{title}</h2>
      <div className="divide-y divide-line overflow-hidden rounded-[28px] border border-line bg-surface shadow-soft">{children}</div>
    </section>
  )
}

function MenuButton({
  icon,
  label,
  detail,
  onClick,
  disabled,
  tone = 'primary',
}: {
  icon: ReactNode
  label: string
  detail?: string
  onClick: () => void
  disabled?: boolean
  tone?: 'primary' | 'danger' | 'neutral'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-[72px] w-full items-center gap-4 px-5 text-left transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none disabled:opacity-60"
    >
      <span
        className={cn(
          'grid size-11 shrink-0 place-items-center rounded-2xl [&_svg]:size-5',
          tone === 'primary' && 'bg-primary-soft text-primary-ink',
          tone === 'danger' && 'bg-danger-soft text-danger-strong',
          tone === 'neutral' && 'bg-surface-3 text-ink-2',
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-bold">{label}</span>
        {detail && <span className="block truncate text-[15px] text-ink-3">{detail}</span>}
      </span>
      <ChevronRight className="size-5 shrink-0 text-ink-3" />
    </button>
  )
}
