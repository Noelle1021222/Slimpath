import {
  Bell,
  BellRing,
  CalendarCheck,
  CalendarX,
  CheckCheck,
  CreditCard,
  Landmark,
  MapPin,
  NotebookPen,
  ShieldAlert,
  Sparkles,
  Star,
  Undo2,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Popover } from 'radix-ui'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useMarkNotificationRead, useNotifications } from '@/hooks/queries'
import { NOTIFICATION_ROUTE } from '@/lib/constants'
import { formatRelativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useUserStore } from '@/store/useUserStore'
import type { AppNotification, NotificationType } from '@/types'

const ICONS: Record<NotificationType, { icon: typeof Bell; tone: string }> = {
  order_new: { icon: CalendarCheck, tone: 'bg-primary-soft text-primary-ink' },
  order_paid: { icon: CreditCard, tone: 'bg-success-soft text-success' },
  order_accepted: { icon: CalendarCheck, tone: 'bg-success-soft text-success' },
  order_declined: { icon: CalendarX, tone: 'bg-warning-soft text-warning' },
  order_cancelled: { icon: CalendarX, tone: 'bg-danger-soft text-danger-strong' },
  order_navigating: { icon: MapPin, tone: 'bg-info-soft text-info' },
  order_arrived: { icon: MapPin, tone: 'bg-success-soft text-success' },
  order_completed: { icon: NotebookPen, tone: 'bg-primary-soft text-primary-ink' },
  order_refunded: { icon: Undo2, tone: 'bg-info-soft text-info' },
  rating: { icon: Star, tone: 'bg-warning-soft text-warning' },
  withdrawal: { icon: Landmark, tone: 'bg-success-soft text-success' },
  sos: { icon: ShieldAlert, tone: 'bg-danger text-white' },
  system: { icon: Sparkles, tone: 'bg-surface-3 text-ink-2' },
}

/** Spec 4.3.1 — notification dropdown with per-item and mark-all read. */
export function NotificationBell({ className, tone = 'default' }: { className?: string; tone?: 'default' | 'onDark' }) {
  const [open, setOpen] = useState(false)
  const { data = [] } = useNotifications()
  const mark = useMarkNotificationRead()
  const navigate = useNavigate()
  const role = useUserStore((s) => s.profile?.role ?? 'seeker')
  const unread = data.filter((n) => !n.is_read).length

  const openItem = (n: AppNotification) => {
    if (!n.is_read) mark.mutate(n.id)
    const route = NOTIFICATION_ROUTE[n.type]?.[role]
    if (route) {
      setOpen(false)
      navigate(route)
    }
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        aria-label={unread ? `通知，${unread} 則未讀` : '通知'}
        className={cn(
          'relative grid size-11 shrink-0 place-items-center rounded-full transition-colors focus-visible:ring-4 focus-visible:ring-[var(--ring)] focus-visible:outline-none',
          tone === 'onDark' ? 'text-white hover:bg-white/10' : 'border border-line bg-surface text-ink-2 hover:text-ink',
          className,
        )}
      >
        {unread ? <BellRing className="size-5" /> : <Bell className="size-5" />}
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              key={unread}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-xs leading-none font-bold text-white ring-2 ring-surface"
            >
              {unread > 9 ? '9+' : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={10}
          collisionPadding={12}
          className="z-50 w-[min(calc(100vw-24px),400px)] overflow-hidden rounded-3xl border border-line bg-surface shadow-lift outline-none data-[state=open]:animate-pop-in"
        >
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <p className="text-lg font-bold text-ink">通知中心</p>
            <button
              type="button"
              disabled={!unread || mark.isPending}
              onClick={() => mark.mutate('all')}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-[15px] font-bold text-primary-ink transition-colors hover:bg-primary-soft disabled:opacity-40"
            >
              <CheckCheck className="size-4" /> 全部已讀
            </button>
          </div>
          <ul className="max-h-[min(70dvh,520px)] overflow-y-auto overscroll-contain py-1">
            {data.length === 0 && <li className="px-5 py-10 text-center text-base text-ink-3">目前沒有通知</li>}
            {data.map((n) => {
              const meta = ICONS[n.type]
              const Icon = meta.icon
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => openItem(n)}
                    className={cn(
                      'flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none',
                      !n.is_read && 'bg-primary-soft/35',
                    )}
                  >
                    <span className={cn('mt-0.5 grid size-10 shrink-0 place-items-center rounded-2xl', meta.tone)}>
                      <Icon className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className={cn('text-base leading-snug text-ink', !n.is_read ? 'font-bold' : 'font-medium')}>{n.title}</span>
                        {!n.is_read && <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-primary" aria-label="未讀" />}
                      </span>
                      {n.body && <span className="mt-0.5 line-clamp-2 block text-[15px] leading-snug text-ink-2">{n.body}</span>}
                      <span className="mt-1 block text-sm text-ink-3">{formatRelativeTime(n.created_at)}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
