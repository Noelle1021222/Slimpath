import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { env, isDemo } from './env'

export type TypedSupabaseClient = SupabaseClient<Database>

let client: TypedSupabaseClient | null = null
let loading: Promise<void> | null = null

/**
 * Loads supabase-js on demand. The demo build never calls it, so the ~100 kB
 * client stays out of the bundle the landing page downloads; with Supabase
 * configured, main.tsx awaits it once before the first render.
 */
export function initSupabase(): Promise<void> {
  if (isDemo || client) return Promise.resolve()
  loading ??= import('@supabase/supabase-js').then(({ createClient }) => {
    client = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
      realtime: { params: { eventsPerSecond: 10 } },
      global: { headers: { 'x-client-info': 'silvercompanion-web/1.0' } },
    })
  })
  return loading
}

/** The configured client; only reachable from the non-demo code paths. */
export function db(): TypedSupabaseClient {
  if (!client) throw new Error(isDemo ? 'Supabase is not configured (demo mode).' : 'Supabase client is still loading.')
  return client
}

/** Throws the PostgREST error so callers can map it with toAppError(). */
export function unwrap<T>(result: { data: T | null; error: unknown }): T {
  if (result.error) throw result.error
  if (result.data === null) throw Object.assign(new Error('No data returned'), { code: 'PGRST116' })
  return result.data
}

/** Like unwrap, for queries where "no row" is a valid answer (maybeSingle). */
export function unwrapMaybe<T>(result: { data: T | null; error: unknown }): T | null {
  if (result.error) throw result.error
  return result.data
}

export async function currentUserId(): Promise<string> {
  const { data } = await db().auth.getSession()
  const id = data.session?.user.id
  if (!id) throw Object.assign(new Error('Not signed in'), { status: 401 })
  return id
}

/** Supabase Functions client that surfaces the function's JSON error body. */
export async function invokeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await db().functions.invoke<T>(name, { body })
  if (error) {
    let payload: { error?: string; code?: string } | null = null
    const context = (error as { context?: Response }).context
    if (context && typeof context.json === 'function') payload = await context.json().catch(() => null)
    throw Object.assign(new Error(payload?.error ?? error.message), { hint: payload?.code ?? null })
  }
  return data as T
}
