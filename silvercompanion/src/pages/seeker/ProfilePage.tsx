import { ArrowLeftRight, BookHeart, CalendarDays, ChevronRight, LogOut, Phone, PhoneCall, RotateCcw, ShieldAlert, Type, Users } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { AvatarUploader } from '@/components/common/AvatarUploader'
import { FontSizeControl } from '@/components/common/FontSizeControl'
import { PageContainer, PageHeader } from '@/components/common/PageHeader'
import { ProfileEditModal } from '@/components/common/ProfileEditModal'
import { Button } from '@/components/ui/button'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { useKinship, useMyOrders } from '@/hooks/queries'
import { useAuth } from '@/hooks/useAuth'
import { SUPPORT_PHONE } from '@/lib/constants'
import { errorMessage } from '@/lib/errors'
import { formatPhone } from '@/lib/format'
import { isDemo, profileService } from '@/services'
import { resetDemo } from '@/services/demo/store'

export default function ProfilePage() {
  const { profile, user, signOut, setProfile } = useAuth()
  const kinship = useKinship()
  const orders = useMyOrders('seeker')
  const navigate = useNavigate()
  const confirm = useConfirm()
  const [editing, setEditing] = useState(false)
  if (!profile) return null
  const active = (orders.data ?? []).filter((o) => ['pending', 'accepted', 'navigating', 'in_progress'].includes(o.order_status)).length

  return (
    <PageContainer>
      <PageHeader eyebrow="My account" title="我的" />
      <section className="relative overflow-hidden rounded-[32px] bg-hero p-6 text-hero-ink md:p-9">
        <div
          className="pointer-events-none absolute -top-20 -right-16 size-72 rounded-full bg-[radial-gradient(circle,#e9803f_0%,transparent_65%)] opacity-60"
          aria-hidden
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <AvatarUploader />
          <div className="min-w-0 flex-1">
            <p className="font-serif text-3xl font-black md:text-4xl">{profile.full_name}</p>
            <p className="mt-1 text-base text-hero-ink/75">
              {profile.nickname ? `稱呼「${profile.nickname}」・` : ''}
              {formatPhone(profile.phone)}
              {user?.email ? `・${user.email}` : ''}
            </p>
          </div>
          <Button variant="secondary" className="self-start sm:self-center" onClick={() => setEditing(true)}>
            編輯資料
          </Button>
        </div>
      </section>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <MenuGroup title="照顧">
          <MenuRow to="/seeker/profile/family" icon={<Users />} label="家庭照顧中心" detail={kinship.data ? `${kinship.data.length} 位長輩` : undefined} />
          <MenuRow to="/seeker/orders" icon={<CalendarDays />} label="歷史訂單與評價" detail={active ? `${active} 筆進行中` : undefined} />
          <MenuRow to="/seeker/care-logs" icon={<BookHeart />} label="數位聯絡簿" />
        </MenuGroup>

        <MenuGroup title="安全">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex min-h-[72px] w-full items-center gap-4 px-5 text-left transition-colors hover:bg-surface-2"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-danger-soft text-danger-strong">
              <ShieldAlert className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-bold">緊急聯絡人</span>
              <span className="block truncate text-[15px] text-ink-2">
                {profile.emergency_contact_name
                  ? `${profile.emergency_contact_name}・${formatPhone(profile.emergency_contact_phone ?? '')}`
                  : '尚未設定，SOS 時無法通知家人'}
              </span>
            </span>
            <ChevronRight className="size-5 text-ink-3" />
          </button>
          <a href={`tel:${SUPPORT_PHONE.replace(/-/g, '')}`} className="flex min-h-[72px] items-center gap-4 px-5 transition-colors hover:bg-surface-2">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-success-soft text-success">
              <PhoneCall className="size-5" />
            </span>
            <span className="flex-1">
              <span className="block text-lg font-bold">客服專線</span>
              <span className="block text-[15px] text-ink-2">{SUPPORT_PHONE}（每天 8:00–22:00）</span>
            </span>
            <Phone className="size-5 text-ink-3" />
          </a>
        </MenuGroup>

        <MenuGroup title="閱讀與顯示">
          <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center">
            <span className="flex flex-1 items-center gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-info-soft text-info">
                <Type className="size-5" />
              </span>
              <span>
                <span className="block text-lg font-bold">字體大小</span>
                <span className="block text-[15px] text-ink-2">整個 App 的文字都會一起放大</span>
              </span>
            </span>
            <FontSizeControl className="w-full sm:w-56" />
          </div>
        </MenuGroup>

        <MenuGroup title="帳號">
          <button
            type="button"
            onClick={async () => {
              if (
                !(await confirm({ title: '切換為陪伴者身分？', description: '同一個帳號也能擔任陪伴者。首次切換需完成實名與背景審核。', confirmText: '切換' }))
              )
                return
              try {
                const next = await profileService.switchRole('provider')
                setProfile(next)
                navigate('/provider')
              } catch (e) {
                toast.error(errorMessage(e))
              }
            }}
            className="flex min-h-[72px] w-full items-center gap-4 px-5 text-left transition-colors hover:bg-surface-2"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary-ink">
              <ArrowLeftRight className="size-5" />
            </span>
            <span className="flex-1 text-lg font-bold">切換為陪伴者身分</span>
            <ChevronRight className="size-5 text-ink-3" />
          </button>
          {isDemo && (
            <button
              type="button"
              onClick={async () => {
                if (await confirm({ title: '重設示範資料？', description: '新增的預約、訊息與紀錄都會還原成初始狀態。', confirmText: '重設' })) {
                  resetDemo()
                  window.location.reload()
                }
              }}
              className="flex min-h-[72px] w-full items-center gap-4 px-5 text-left transition-colors hover:bg-surface-2"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-surface-3 text-ink-2">
                <RotateCcw className="size-5" />
              </span>
              <span className="flex-1 text-lg font-bold">重設示範資料</span>
            </button>
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
      </div>
      <p className="mt-10 text-center text-sm text-ink-3">銀髮伴 SilverCompanion v1.0{isDemo ? '・示範模式（資料只存在這台裝置）' : ''}</p>
      <ProfileEditModal open={editing} onOpenChange={setEditing} />
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

function MenuRow({ to, icon, label, detail }: { to: string; icon: ReactNode; label: string; detail?: string }) {
  return (
    <Link
      to={to}
      className="flex min-h-[72px] items-center gap-4 px-5 transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary-ink [&_svg]:size-5">{icon}</span>
      <span className="flex-1 text-lg font-bold">{label}</span>
      {detail && <span className="text-[15px] text-ink-3">{detail}</span>}
      <ChevronRight className="size-5 text-ink-3" />
    </Link>
  )
}
