import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { chatService, isDemo, notificationService, orderService } from '@/services'
import { startPresenceHeartbeat } from '@/services/demo/backend'
import { useUserStore } from '@/store/useUserStore'
import { qk } from './queries'

/**
 * Subscribes the signed-in user to Supabase Realtime (orders, notifications,
 * messages) and turns every event into cache invalidations, so every screen
 * updates without polling.
 */
export function useRealtimeBridge() {
  const uid = useUserStore((s) => s.user?.id ?? null)
  const client = useQueryClient()

  useEffect(() => {
    if (!uid) return
    const invalidate = (...keys: (readonly unknown[])[]) => keys.forEach((queryKey) => void client.invalidateQueries({ queryKey }))

    const offOrders = orderService.subscribe(uid, (order) => {
      invalidate(['orders'], qk.requests, qk.stats, qk.careLogs, qk.myProvider, ['booked'], qk.conversations)
      if (order.id) invalidate(qk.order(order.id))
    })
    const offNotifications = notificationService.subscribe(uid, (n) => {
      invalidate(qk.notifications)
      const urgent = n.type === 'sos'
      ;(urgent ? toast.error : toast)(n.title, { description: n.body ?? undefined, duration: urgent ? 15_000 : 6000 })
    })
    const offMessages = chatService.subscribe(uid, (m) => {
      const partner = m.sender_id === uid ? m.receiver_id : m.sender_id
      invalidate(qk.thread(partner), qk.conversations)
    })
    const offPresence = isDemo ? startPresenceHeartbeat() : () => undefined

    return () => {
      offOrders()
      offNotifications()
      offMessages()
      offPresence()
    }
  }, [uid, client])
}
