import {
  ArrowLeftRight,
  BookHeart,
  CalendarClock,
  CalendarDays,
  ChevronDown,
  House,
  Inbox,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  RotateCcw,
  Search,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { motion } from 'motion/react'
import { DropdownMenu } from 'radix-ui'
import { useEffect, useRef, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { UserAvatar } from '@/components/ui/avatar'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { useConversations, useProviderRequests } from '@/hooks/queries'
import { useAuth } from '@/hooks/useAuth'
import { errorMessage } from '@/lib/errors'
import { formatMonthDay, formatWeekday } from '@/lib/format'
import { todayISO } from '@/lib/time'
import { cn } from '@/lib/utils'
import { isDemo, profileService } from '@/services'
import { resetDemo } from '@/services/demo/store'
import { homePathFor } from '@/store/useUserStore'
import type { UserRole } from '@/types'
import { FontSizeControl } from './FontSizeControl'
import { Logo } from './Logo'
import { NotificationBell } from './NotificationBell'
import { SOSButton } from './SOSModal'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  badge?: number
  sidebarOnly?: boolean
}

function useNavItems(role: UserRole): NavItem[] {
  const conversations = useConversations()
  const unread = (conversations.data ?? []).reduce((n, c) => n + c.unread_count, 0)
  const requests = useProviderRequests(role === 'provider')
  const pending = role === 'provider' ? (requests.data ?? []).length : 0

  if (role === 'provider') {
    return [
      { to: '/provider', label: '儀表板', icon: LayoutDashboard, end: true },
      { to: '/provider/requests', label: '接案大廳', icon: Inbox, badge: pending },
      { to: '/provider/schedule', label: '我的行程', icon: CalendarClock },
      { to: '/provider/messages', label: '訊息', icon: MessageCircle, badge: unread },
      { to: '/provider/profile', label: '個人檔案', icon: UserRound },
    ]
  }
  return [
    { to: '/seeker', label: '首頁', icon: House, end: true },
    { to: '/seeker/search', label: '找陪伴', icon: Search },
    { to: '/seeker/orders', label: '訂單', icon: CalendarDays },
    { to: '/seeker/messages', label: '訊息', icon: MessageCircle, badge: unread },
    { to: '/seeker/care-logs', label: '數位聯絡簿', icon: BookHeart, sidebarOnly: true },
    { to: '/seeker/profile/family', label: '家庭照顧中心', icon: Users, sidebarOnly: true },
    { to: '/seeker/profile', label: '我的', icon: UserRound, end: true },
  ]
}

/**
 * Spec 6.1 — bottom navigation below 768px, a fixed 18rem sidebar above it,
 * with the content column scrolling on its own.
 */
export function AppShell({ role, children }: { role: UserRole; children?: ReactNode }) {
  const items = useNavItems(role)
  const scrollRef = useRef<HTMLDivElement>(null)
  const location = useLocation()

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  return (
    <div className="min-h-[100dvh] bg-bg md:flex md:h-[100dvh] md:overflow-hidden">
      <a href="#main" className="sr-only z-[90] rounded-xl bg-ink px-4 py-3 font-bold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        跳到主要內容
      </a>
      <Sidebar role={role} items={items} />
      <div ref={scrollRef} className="relative min-w-0 flex-1 md:h-[100dvh] md:overflow-y-auto">
        <TopBar role={role} />
        <main id="main" className="pb-nav md:pb-16" tabIndex={-1}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            {children ?? <Outlet />}
          </motion.div>
        </main>
      </div>
      <BottomNav items={items.filter((i) => !i.sidebarOnly)} />
    </div>
  )
}

function Sidebar({ role, items }: { role: UserRole; items: NavItem[] }) {
  const provider = role === 'provider'
  return (
    <aside className="hidden h-[100dvh] w-72 shrink-0 flex-col bg-nav text-nav-ink md:flex" aria-label="主選單">
      <div className="px-6 pt-7 pb-6">
        <NavLink to={homePathFor(role)} className="inline-block rounded-xl focus-visible:ring-4 focus-visible:ring-[var(--ring)] focus-visible:outline-none">
          <Logo tone={provider ? 'light' : 'ink'} />
        </NavLink>
        <p className={cn('mt-4 inline-flex rounded-full px-3 py-1 text-sm font-bold', provider ? 'bg-white/10 text-nav-muted' : 'bg-white/70 text-nav-muted')}>
          {provider ? '陪伴者工作台' : '長輩・家屬版'}
        </p>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-4">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'group relative flex min-h-14 items-center gap-3.5 rounded-2xl px-4 text-[17px] font-bold transition-colors',
                'focus-visible:ring-4 focus-visible:ring-[var(--ring)] focus-visible:outline-none',
                isActive ? 'bg-nav-active text-nav-active-ink shadow-soft' : 'text-nav-muted hover:bg-black/[0.04] hover:text-nav-ink',
                provider && !isActive && 'hover:bg-white/[0.06]',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="sidebar-active"
                    className={cn('absolute top-3 bottom-3 left-0 w-1 rounded-full', provider ? 'bg-accent' : 'bg-primary')}
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  />
                )}
                <item.icon className="size-[22px] shrink-0" strokeWidth={isActive ? 2.4 : 2} />
                <span className="flex-1">{item.label}</span>
                {!!item.badge && (
                  <span className="grid h-6 min-w-6 place-items-center rounded-full bg-danger px-1.5 text-xs font-bold text-white">{item.badge}</span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="space-y-3 p-4">
        <div className={cn('rounded-2xl p-4', provider ? 'bg-white/[0.06]' : 'bg-white/60')}>
          <p className={cn('mb-2 text-sm font-bold', provider ? 'text-nav-muted' : 'text-ink-3')}>字體大小</p>
          <FontSizeControl dark={provider} />
        </div>
        <UserMenu role={role} variant="sidebar" />
      </div>
    </aside>
  )
}

const SECTION_LABELS: [RegExp, string][] = [
  [/^\/seeker\/search/, '找陪伴'],
  [/^\/seeker\/companions/, '陪伴者介紹'],
  [/^\/seeker\/orders/, '我的訂單'],
  [/^\/seeker\/care-logs/, '數位聯絡簿'],
  [/^\/(seeker|provider)\/messages/, '訊息'],
  [/^\/seeker\/profile\/family/, '家庭照顧中心'],
  [/^\/seeker\/profile/, '我的'],
  [/^\/seeker/, '首頁'],
  [/^\/provider\/requests/, '接案大廳'],
  [/^\/provider\/schedule/, '我的行程'],
  [/^\/provider\/profile/, '個人檔案'],
  [/^\/provider/, '儀表板'],
]

function TopBar({ role }: { role: UserRole }) {
  const location = useLocation()
  const today = todayISO()
  const section = SECTION_LABELS.find(([re]) => re.test(location.pathname))?.[1]
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/85 pt-safe backdrop-blur-xl supports-[backdrop-filter]:bg-bg/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 md:h-20 md:px-8">
        <NavLink to={homePathFor(role)} className="rounded-xl md:hidden">
          <span className="sr-only">回首頁：</span>
          <Logo compact />
        </NavLink>
        <p className="hidden items-center gap-3 text-base text-ink-3 md:flex">
          <span className="font-bold text-ink">{section}</span>
          <span className="h-4 w-px bg-line-strong" aria-hidden />
          {formatMonthDay(today)} {formatWeekday(today)}
        </p>
        <div className="ml-auto flex items-center gap-2 md:gap-3">
          <NotificationBell />
          <SOSButton withLabel />
          <div className="hidden md:block">
            <UserMenu role={role} variant="topbar" />
          </div>
        </div>
      </div>
    </header>
  )
}

function BottomNav({ items }: { items: NavItem[] }) {
  return (
    <nav
      aria-label="主選單"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/92 pb-safe shadow-[0_-8px_30px_-16px_rgb(var(--shadow-rgb)/0.3)] backdrop-blur-xl md:hidden"
    >
      <ul className="mx-auto grid h-[72px] max-w-lg grid-cols-5">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'relative flex h-full flex-col items-center justify-center gap-1 text-xs font-bold transition-colors',
                  'focus-visible:outline-none focus-visible:[&>span:first-child]:ring-4 focus-visible:[&>span:first-child]:ring-[var(--ring)]',
                  isActive ? 'text-primary-ink' : 'text-ink-3',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className="relative grid h-8 w-14 place-items-center rounded-full">
                    {isActive && (
                      <motion.span
                        layoutId="bottom-active"
                        className="absolute inset-0 rounded-full bg-primary-soft"
                        transition={{ type: 'spring', stiffness: 520, damping: 38 }}
                      />
                    )}
                    <item.icon className="relative size-6" strokeWidth={isActive ? 2.4 : 2} />
                    {!!item.badge && (
                      <span className="absolute -top-1 right-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-xs leading-none text-white ring-2 ring-surface">
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    )}
                  </span>
                  <span className="text-[13px] leading-none">{item.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function UserMenu({ role, variant }: { role: UserRole; variant: 'sidebar' | 'topbar' }) {
  const { profile, signOut, setProfile } = useAuth()
  const navigate = useNavigate()
  const confirm = useConfirm()
  if (!profile) return null
  const other: UserRole = role === 'provider' ? 'seeker' : 'provider'
  const provider = role === 'provider'

  const switchRole = async () => {
    const ok = await confirm({
      title: other === 'provider' ? '切換為陪伴者身分？' : '切換為長輩・家屬身分？',
      description:
        other === 'provider'
          ? '同一個帳號也可以擔任陪伴者。第一次切換需完成實名與背景審核，才會出現在搜尋結果中。'
          : '切換後可以預約陪伴、管理家人檔案。您的陪伴者資料會完整保留。',
      confirmText: '切換',
    })
    if (!ok) return
    try {
      const next = await profileService.switchRole(other)
      setProfile(next)
      navigate(homePathFor(other))
      toast.success(other === 'provider' ? '已切換為陪伴者身分' : '已切換為長輩・家屬身分')
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={cn(
          'flex items-center gap-3 rounded-2xl text-left transition-colors focus-visible:ring-4 focus-visible:ring-[var(--ring)] focus-visible:outline-none',
          variant === 'sidebar'
            ? cn('w-full p-3', provider ? 'hover:bg-white/[0.06]' : 'hover:bg-white/60')
            : 'border border-line bg-surface py-1.5 pr-3 pl-1.5 hover:bg-surface-2',
        )}
      >
        <span className="sr-only">帳號選單：{profile.full_name}</span>
        <UserAvatar name={profile.nickname ?? profile.full_name} src={profile.avatar_url} size={variant === 'sidebar' ? 'md' : 'sm'} />
        {variant === 'sidebar' ? (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-base font-bold">{profile.full_name}</span>
            <span className={cn('block text-sm', provider ? 'text-nav-muted' : 'text-ink-3')}>{provider ? '陪伴者' : '長輩・家屬'}</span>
          </span>
        ) : null}
        <ChevronDown className="size-4 opacity-60" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side={variant === 'sidebar' ? 'top' : 'bottom'}
          align="end"
          sideOffset={8}
          className="z-50 min-w-64 rounded-2xl border border-line bg-surface p-2 text-ink shadow-lift data-[state=open]:animate-pop-in"
        >
          <div className="px-3 py-2">
            <p className="font-bold">{profile.full_name}</p>
            <p className="text-sm text-ink-3">{provider ? '陪伴者' : '長輩・家屬'}</p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <MenuItem icon={ArrowLeftRight} onSelect={switchRole}>
            切換為{other === 'provider' ? '陪伴者' : '長輩・家屬'}
          </MenuItem>
          {isDemo && (
            <MenuItem
              icon={RotateCcw}
              onSelect={async () => {
                if (await confirm({ title: '重設示範資料？', description: '所有在示範模式中新增的預約、訊息與紀錄都會還原。', confirmText: '重設' })) {
                  resetDemo()
                  window.location.reload()
                }
              }}
            >
              重設示範資料
            </MenuItem>
          )}
          <MenuItem
            icon={LogOut}
            danger
            onSelect={async () => {
              await signOut()
              navigate('/')
            }}
          >
            登出
          </MenuItem>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

function MenuItem({ icon: Icon, children, onSelect, danger }: { icon: LucideIcon; children: ReactNode; onSelect: () => void; danger?: boolean }) {
  return (
    <DropdownMenu.Item
      onSelect={onSelect}
      className={cn(
        'flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-3 text-base font-bold outline-none select-none data-[highlighted]:bg-surface-2',
        danger && 'text-danger-strong',
      )}
    >
      <Icon className="size-5" />
      {children}
    </DropdownMenu.Item>
  )
}
