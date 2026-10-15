import { ArrowDown, SendHorizontal } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useRealtimeChat } from '@/hooks/useRealtimeChat'
import { QUICK_REPLIES } from '@/lib/constants'
import { errorMessage } from '@/lib/errors'
import { formatClock, formatDateLong } from '@/lib/format'
import { todayISO } from '@/lib/time'
import { cn } from '@/lib/utils'
import { useUserStore } from '@/store/useUserStore'

/** A single conversation: grouped by day, optimistic sends, quick replies. */
export function ChatThread({ partnerId, partnerName, className }: { partnerId: string; partnerName: string; className?: string }) {
  const { messages, isLoading, send, me } = useRealtimeChat(partnerId)
  const role = useUserStore((s) => s.profile?.role ?? 'seeker')
  const [draft, setDraft] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const [atBottom, setAtBottom] = useState(true)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = (smooth = true) => {
    const el = listRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  }

  useLayoutEffect(() => {
    if (atBottom) scrollToBottom(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length])

  useEffect(() => {
    scrollToBottom(false)
  }, [partnerId])

  const submit = (text: string) => {
    const content = text.trim()
    if (!content) return
    setDraft('')
    send.mutate(content, { onError: (e) => toast.error(errorMessage(e)) })
    requestAnimationFrame(() => scrollToBottom())
  }

  let lastDay = ''
  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <div
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget
          setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80)
        }}
        className="relative min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-1 py-4 focus-visible:ring-4 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
        tabIndex={0}
        role="log"
        aria-live="polite"
        aria-label={`與 ${partnerName} 的對話`}
      >
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="ml-auto h-12 w-1/2" />
            <Skeleton className="h-16 w-3/4" />
          </div>
        )}
        {!isLoading && messages.length === 0 && <p className="py-10 text-center text-base text-ink-3">還沒有訊息，跟 {partnerName} 打聲招呼吧！</p>}
        {messages.map((m) => {
          const mine = m.sender_id === me
          const day = m.created_at.slice(0, 10)
          const showDay = day !== lastDay
          lastDay = day
          return (
            <div key={m.id}>
              {showDay && (
                <div className="my-4 flex justify-center">
                  <span className="rounded-full bg-surface-3 px-3 py-1 text-sm font-bold text-ink-2">{formatDateLong(todayISO(new Date(m.created_at)))}</span>
                </div>
              )}
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                className={cn('flex items-end gap-2', mine ? 'justify-end' : 'justify-start')}
              >
                {mine && <MessageMeta time={m.created_at} read={m.is_read} pending={m.id < 0} />}
                <p
                  className={cn(
                    'max-w-[78%] rounded-3xl px-4 py-2.5 text-[17px] leading-relaxed break-words whitespace-pre-wrap',
                    mine ? 'rounded-br-lg bg-primary text-on-primary' : 'rounded-bl-lg border border-line bg-surface text-ink',
                    m.id < 0 && 'opacity-70',
                  )}
                >
                  {m.content}
                </p>
                {!mine && <MessageMeta time={m.created_at} />}
              </motion.div>
            </div>
          )
        })}
      </div>

      <AnimatePresence>
        {!atBottom && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            type="button"
            onClick={() => scrollToBottom()}
            className="absolute right-6 bottom-36 grid size-11 place-items-center rounded-full border border-line bg-surface shadow-lift"
            aria-label="捲到最新訊息"
          >
            <ArrowDown className="size-5" />
          </motion.button>
        )}
      </AnimatePresence>

      <div className="shrink-0 space-y-3 border-t border-line pt-3">
        <div className="-mx-1 scrollbar-none flex gap-2 overflow-x-auto px-1 pb-1" aria-label="快速回覆">
          {QUICK_REPLIES[role].map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => submit(q)}
              className="min-h-10 shrink-0 rounded-full border border-line-strong bg-surface px-4 text-[15px] font-bold whitespace-nowrap text-ink-2 transition-colors hover:border-primary hover:text-primary-ink"
            >
              {q}
            </button>
          ))}
        </div>
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            submit(draft)
            inputRef.current?.focus()
          }}
        >
          <label htmlFor={`chat-${partnerId}`} className="sr-only">
            輸入訊息
          </label>
          <textarea
            id={`chat-${partnerId}`}
            ref={inputRef}
            rows={1}
            value={draft}
            maxLength={2000}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                submit(draft)
              }
            }}
            placeholder={`傳訊息給 ${partnerName}…`}
            aria-label={`傳訊息給 ${partnerName}`}
            className="max-h-36 min-h-14 flex-1 resize-none rounded-3xl border border-line-strong bg-surface px-5 py-3.5 text-[17px] leading-snug text-ink placeholder:text-ink-3 focus:border-primary focus:ring-4 focus:ring-[var(--ring)] focus:outline-none"
          />
          <Button type="submit" size="icon" pill className="size-14" disabled={!draft.trim()} aria-label="送出">
            <SendHorizontal className="!size-6" />
          </Button>
        </form>
      </div>
    </div>
  )
}

function MessageMeta({ time, read, pending }: { time: string; read?: boolean; pending?: boolean }) {
  return (
    <span className="mb-1 flex shrink-0 flex-col items-end text-xs leading-tight text-ink-3">
      {read !== undefined && <span>{pending ? '傳送中' : read ? '已讀' : ''}</span>}
      <span className="tabular">{formatClock(time)}</span>
    </span>
  )
}
