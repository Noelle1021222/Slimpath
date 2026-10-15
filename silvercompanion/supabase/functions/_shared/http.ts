/** Shared HTTP plumbing for every SilverCompanion edge function. */

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code: string | null = null,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  })
}

export async function readJson<T extends Record<string, unknown>>(req: Request): Promise<Partial<T>> {
  try {
    const body = await req.json()
    return body && typeof body === 'object' ? (body as Partial<T>) : {}
  } catch {
    throw new HttpError(400, '請求格式錯誤。', 'bad_request')
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function requireUuid(value: unknown, field: string): string {
  if (typeof value !== 'string' || !UUID.test(value)) throw new HttpError(400, `${field} 格式錯誤。`, 'bad_request')
  return value
}

/** Wraps a handler with CORS, method checks and uniform error responses. */
export function serve(handler: (req: Request) => Promise<Response>) {
  Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
    if (req.method !== 'POST') return json({ error: 'Method not allowed', code: 'method_not_allowed' }, 405)
    try {
      return await handler(req)
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.message, code: error.code }, error.status)
      console.error(error)
      return json({ error: '系統忙碌中，請稍後再試。', code: 'internal_error' }, 500)
    }
  })
}

/** Fire-and-forget POST to an optional ops webhook (never fails the request). */
export async function postWebhook(event: string, payload: Record<string, unknown>) {
  const url = Deno.env.get('NOTIFY_WEBHOOK_URL')
  if (!url) return
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, ...payload, at: new Date().toISOString() }),
      signal: AbortSignal.timeout(5000),
    })
  } catch (error) {
    console.warn('webhook failed', event, error)
  }
}
