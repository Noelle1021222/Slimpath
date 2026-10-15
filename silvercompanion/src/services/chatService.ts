import type { Message } from '@/types'
import type { ChatService } from './contracts'
import { demoBackend } from './demo/backend'
import { isDemo } from './env'
import { currentUserId, db, unwrap } from './supabaseClient'

const supabaseChat: ChatService = {
  async conversations() {
    return unwrap(await db().rpc('get_conversations')) ?? []
  },
  async thread(partnerId) {
    const me = await currentUserId()
    return unwrap(
      await db()
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${me},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${me})`)
        .order('created_at', { ascending: true })
        .limit(300),
    )
  },
  async send(partnerId, content) {
    const me = await currentUserId()
    return unwrap(await db().from('messages').insert({ sender_id: me, receiver_id: partnerId, content: content.trim() }).select('*').single())
  },
  async markRead(partnerId) {
    const me = await currentUserId()
    const { error } = await db().from('messages').update({ is_read: true }).eq('receiver_id', me).eq('sender_id', partnerId).eq('is_read', false)
    if (error) throw error
  },
  subscribe(userId, onMessage) {
    // Spec 2: Supabase Realtime for the chat room. RLS limits rows to my threads.
    const channel = db()
      .channel(`messages:${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${userId}` }, (p) => onMessage(p.new as Message))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=eq.${userId}` }, (p) => onMessage(p.new as Message))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `sender_id=eq.${userId}` }, (p) => onMessage(p.new as Message))
      .subscribe()
    return () => {
      void db().removeChannel(channel)
    }
  },
}

export const chatService: ChatService = isDemo ? demoBackend.chat : supabaseChat
