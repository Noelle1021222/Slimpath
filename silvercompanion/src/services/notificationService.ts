import type { AppNotification } from '@/types'
import type { NotificationService } from './contracts'
import { demoBackend } from './demo/backend'
import { isDemo } from './env'
import { currentUserId, db, unwrap } from './supabaseClient'

const supabaseNotifications: NotificationService = {
  async list() {
    return unwrap(await db().from('notifications').select('*').order('created_at', { ascending: false }).limit(50))
  },
  async markRead(id) {
    const { error } = await db().from('notifications').update({ is_read: true }).eq('id', id)
    if (error) throw error
  },
  async markAllRead() {
    const me = await currentUserId()
    const { error } = await db().from('notifications').update({ is_read: true }).eq('user_id', me).eq('is_read', false)
    if (error) throw error
  },
  subscribe(userId, onNotification) {
    const channel = db()
      .channel(`notifications:${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (p) =>
        onNotification(p.new as AppNotification),
      )
      .subscribe()
    return () => {
      void db().removeChannel(channel)
    }
  },
}

export const notificationService: NotificationService = isDemo ? demoBackend.notifications : supabaseNotifications
