import { ChevronLeft, MessageCircle, Phone } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { ChatThread } from '@/components/common/ChatThread'
import { PageContainer, PageHeader } from '@/components/common/PageHeader'
import { UserAvatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useConversations, useOrderContact } from '@/hooks/queries'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { formatRelativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useUserStore } from '@/store/useUserStore'
import type { Conversation } from '@/types'

/** Spec 2 — realtime chat between families and companions who share an order. */
export default function MessagesPage() {
  const { partnerId } = useParams()
  const desktop = useIsDesktop()
  const navigate = useNavigate()
  const role = useUserStore((s) => s.profile?.role ?? 'seeker')
  const base = role === 'provider' ? '/provider/messages' : '/seeker/messages'
  const { data = [], isLoading } = useConversations()
  const active = data.find((c) => c.partner_id === partnerId) ?? (desktop && !partnerId ? data[0] : undefined)

  const list = (
    <ul className="divide-y divide-line">
      {isLoading &&
        Array.from({ length: 3 }, (_, i) => (
          <li key={i} className="flex gap-3 p-4">
            <Skeleton className="size-14 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </li>
        ))}
      {data.map((c) => (
        <li key={c.partner_id}>
          <Link
            to={`${base}/${c.partner_id}`}
            replace={desktop}
            className={cn(
              'flex items-center gap-3.5 px-4 py-4 transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none',
              active?.partner_id === c.partner_id && desktop && 'bg-primary-soft/60 hover:bg-primary-soft/60',
            )}
          >
            <UserAvatar name={c.partner_name} src={c.partner_avatar} size="md" />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate text-lg font-bold">{c.partner_name}</span>
                {c.last_message_at && <span className="shrink-0 text-sm text-ink-3">{formatRelativeTime(c.last_message_at)}</span>}
              </span>
              <span className="flex items-center justify-between gap-2">
                <span className={cn('truncate text-[15px]', c.unread_count ? 'font-bold text-ink' : 'text-ink-2')}>
                  {c.last_message ?? (c.partner_role === 'provider' ? '陪伴者' : '家屬')}
                </span>
                {c.unread_count > 0 && (
                  <span className="grid h-6 min-w-6 shrink-0 place-items-center rounded-full bg-danger px-1.5 text-xs font-bold text-white">
                    {c.unread_count}
                  </span>
                )}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )

  if (!desktop && partnerId) {
    const c = data.find((x) => x.partner_id === partnerId)
    return (
      <div className="flex h-[calc(100dvh-64px-72px-env(safe-area-inset-bottom)-env(safe-area-inset-top))] flex-col px-4">
        <div className="flex items-center gap-2 border-b border-line py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(base)} aria-label="返回對話列表">
            <ChevronLeft />
          </Button>
          {c && <ThreadHeader c={c} />}
        </div>
        {c ? (
          <ChatThread partnerId={partnerId} partnerName={c.partner_name} className="min-h-0 flex-1 pb-3" />
        ) : isLoading ? (
          <Skeleton className="m-4 h-40" />
        ) : null}
      </div>
    )
  }

  return (
    <PageContainer>
      <PageHeader eyebrow="Messages" title="訊息" description="與有預約關係的家屬或陪伴者即時聯絡。" />
      {!isLoading && data.length === 0 ? (
        <EmptyState illustration="chat" title="還沒有對話" description="預約成立後，就可以在這裡和對方傳訊息。" />
      ) : desktop ? (
        <div className="grid h-[min(72dvh,760px)] grid-cols-[340px_1fr] overflow-hidden rounded-[28px] border border-line bg-surface shadow-soft">
          <div className="overflow-y-auto border-r border-line">{list}</div>
          <div className="relative flex min-h-0 flex-col px-6">
            {active ? (
              <>
                <div className="flex items-center gap-3 border-b border-line py-4">
                  <ThreadHeader c={active} />
                </div>
                <ChatThread key={active.partner_id} partnerId={active.partner_id} partnerName={active.partner_name} className="min-h-0 flex-1 pb-5" />
              </>
            ) : (
              <div className="grid flex-1 place-items-center text-ink-3">
                <MessageCircle className="size-10" />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[28px] border border-line bg-surface shadow-soft">{list}</div>
      )}
    </PageContainer>
  )
}

function ThreadHeader({ c }: { c: Conversation }) {
  const contact = useOrderContact(c.active_order_id)
  return (
    <>
      <UserAvatar name={c.partner_name} src={c.partner_avatar} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-lg font-bold">{c.partner_name}</span>
        <span className="block text-sm text-ink-3">
          {c.partner_role === 'provider' ? '陪伴者' : '家屬'}
          {c.active_order_id ? '・有進行中的預約' : ''}
        </span>
      </span>
      {contact.data && (
        <Button asChild variant="secondary" size="icon" aria-label={`打電話給 ${c.partner_name}`}>
          <a href={`tel:${contact.data.phone}`}>
            <Phone />
          </a>
        </Button>
      )}
    </>
  )
}
