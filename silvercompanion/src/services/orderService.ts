import type { Order } from '@/types'
import type { OrderService } from './contracts'
import { demoBackend } from './demo/backend'
import { isDemo } from './env'
import { db, invokeFunction, unwrap, unwrapMaybe } from './supabaseClient'

const supabaseOrders: OrderService = {
  async listMine(role) {
    const { data: session } = await db().auth.getSession()
    const uid = session.session?.user.id
    if (!uid) return []
    const column = role === 'seeker' ? 'seeker_id' : 'provider_id'
    return unwrap(
      await db()
        .from('order_details')
        .select('*')
        .eq(column, uid)
        .order('service_date', { ascending: false })
        .order('start_time', { ascending: false })
        .limit(100),
    )
  },
  async get(id) {
    return unwrapMaybe(await db().from('order_details').select('*').eq('id', id).maybeSingle())
  },
  async create(input) {
    const { data: session } = await db().auth.getSession()
    const seeker_id = session.session?.user.id
    if (!seeker_id) throw Object.assign(new Error('請先登入。'), { status: 401 })
    // total_amount / platform_fee / provider_earning are recomputed by the
    // orders_prepare trigger from the companion's current rate.
    return unwrap(
      await db()
        .from('orders')
        .insert({ ...input, seeker_id })
        .select('*')
        .single(),
    )
  },
  async requests() {
    return unwrap(await db().rpc('get_provider_requests')) ?? []
  },
  async accept(id) {
    return unwrap(await db().rpc('accept_order', { p_order_id: id }))
  },
  async decline(id, reason) {
    const { error } = await db().rpc('decline_order', { p_order_id: id, p_reason: reason })
    if (!error) return
    if ((error as { hint?: string }).hint === 'refund_required') {
      await invokeFunction('linepay-refund', { orderId: id, reason })
      return
    }
    throw error
  },
  async cancel(order, reason) {
    if (order.payment_method === 'linepay' && order.payment_status === 'paid') {
      await invokeFunction('linepay-refund', { orderId: order.id, reason })
      return
    }
    unwrap(await db().rpc('cancel_order', { p_order_id: order.id, p_reason: reason }))
  },
  async startNavigation(id) {
    return unwrap(await db().rpc('start_navigation', { p_order_id: id }))
  },
  async markArrived(id) {
    return unwrap(await db().rpc('mark_arrived', { p_order_id: id }))
  },
  async contact(id) {
    const rows = unwrap(await db().rpc('get_order_contact', { p_order_id: id }))
    return rows?.[0] ?? null
  },
  subscribe(userId, onChange) {
    const channel = db()
      .channel(`orders:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `seeker_id=eq.${userId}` }, (p) => onChange(p.new as Partial<Order>))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `provider_id=eq.${userId}` }, (p) => onChange(p.new as Partial<Order>))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'care_logs' }, () => onChange({}))
      .subscribe()
    return () => {
      void db().removeChannel(channel)
    }
  },
}

export const orderService: OrderService = isDemo ? demoBackend.orders : supabaseOrders
