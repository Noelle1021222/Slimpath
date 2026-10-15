import { createClient, type SupabaseClient, type User } from 'jsr:@supabase/supabase-js@2'
import { HttpError } from './http.ts'

let admin: SupabaseClient | null = null

/** Service-role client: bypasses RLS, so every handler checks ownership itself. */
export function adminClient(): SupabaseClient {
  if (admin) return admin
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new HttpError(500, '伺服器設定不完整。', 'misconfigured')
  admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  return admin
}

/** Resolves the signed-in caller from the `Authorization: Bearer <jwt>` header. */
export async function requireUser(req: Request): Promise<User> {
  const token = req.headers
    .get('Authorization')
    ?.replace(/^Bearer\s+/i, '')
    .trim()
  if (!token) throw new HttpError(401, '請先登入。', 'unauthorized')
  const { data, error } = await adminClient().auth.getUser(token)
  if (error || !data.user) throw new HttpError(401, '登入已過期，請重新登入。', 'unauthorized')
  return data.user
}

export interface OrderRow {
  id: string
  seeker_id: string
  provider_id: string | null
  recipient_id: number
  service_type: string
  service_date: string
  start_time: string
  end_time: string
  hours: number
  hourly_rate: number
  total_amount: number
  platform_fee: number
  provider_earning: number
  payment_method: 'linepay' | 'credit_card' | 'cash'
  payment_status: 'unpaid' | 'paid' | 'refunded'
  linepay_transaction_id: string | null
  order_status: 'pending' | 'accepted' | 'navigating' | 'in_progress' | 'completed' | 'cancelled'
}

export async function loadOrder(id: string): Promise<OrderRow> {
  const { data, error } = await adminClient().from('orders').select('*').eq('id', id).maybeSingle()
  if (error) throw new HttpError(500, '讀取訂單失敗。', 'db_error')
  if (!data) throw new HttpError(404, '找不到這筆訂單。', 'order_not_found')
  return data as OrderRow
}
