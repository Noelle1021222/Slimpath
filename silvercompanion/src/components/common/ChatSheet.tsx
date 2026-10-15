import { ResponsiveModal } from '@/components/ui/responsive-modal'
import { UserAvatar } from '@/components/ui/avatar'
import { useUIStore } from '@/store/useUIStore'
import { ChatThread } from './ChatThread'

/** Chat as an overlay, so a conversation never pulls you out of what you were doing. */
export function ChatSheet() {
  const chat = useUIStore((s) => s.chat)
  const close = useUIStore((s) => s.closeChat)
  return (
    <ResponsiveModal
      open={!!chat}
      onOpenChange={(v) => !v && close()}
      size="md"
      title={
        chat ? (
          <span className="flex items-center gap-3">
            <UserAvatar name={chat.name} src={chat.avatar} size="sm" />
            <span>{chat.name}</span>
          </span>
        ) : (
          ''
        )
      }
      bodyClassName="flex flex-col h-[min(70dvh,640px)] pb-[calc(1rem+env(safe-area-inset-bottom))]"
    >
      {chat && <ChatThread partnerId={chat.partnerId} partnerName={chat.name} className="h-full" />}
    </ResponsiveModal>
  )
}
