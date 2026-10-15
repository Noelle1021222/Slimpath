import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import type { Message } from '@/types'
import { chatService } from '@/services'
import { useUserStore } from '@/store/useUserStore'
import { qk } from './queries'

/**
 * One conversation: history, optimistic sending and read receipts. New
 * messages arrive through useRealtimeBridge (Supabase Realtime), which
 * invalidates this thread.
 */
export function useRealtimeChat(partnerId: string | null) {
  const uid = useUserStore((s) => s.user?.id ?? null)
  const client = useQueryClient()
  const key = qk.thread(partnerId ?? '')

  const thread = useQuery({
    queryKey: key,
    queryFn: () => chatService.thread(partnerId!),
    enabled: !!partnerId && !!uid,
  })

  const unread = (thread.data ?? []).filter((m) => m.receiver_id === uid && !m.is_read).length
  useEffect(() => {
    if (!partnerId || unread === 0) return
    void chatService.markRead(partnerId).then(() => {
      void client.invalidateQueries({ queryKey: qk.conversations })
      void client.invalidateQueries({ queryKey: key })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId, unread])

  const send = useMutation({
    mutationFn: (content: string) => chatService.send(partnerId!, content),
    onMutate: async (content) => {
      await client.cancelQueries({ queryKey: key })
      const previous = client.getQueryData<Message[]>(key)
      const optimistic: Message = {
        id: -Date.now(),
        sender_id: uid!,
        receiver_id: partnerId!,
        content,
        is_read: false,
        created_at: new Date().toISOString(),
      }
      client.setQueryData<Message[]>(key, (old) => [...(old ?? []), optimistic])
      return { previous }
    },
    onError: (_err, _content, context) => {
      if (context?.previous) client.setQueryData(key, context.previous)
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey: key })
      void client.invalidateQueries({ queryKey: qk.conversations })
    },
  })

  return { messages: thread.data ?? [], isLoading: thread.isLoading, isError: thread.isError, send, me: uid }
}
