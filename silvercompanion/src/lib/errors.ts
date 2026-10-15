/**
 * Turns Supabase / Postgres / network failures into calm, specific zh-TW
 * messages. RPCs raise with a `hint` code (see the migration) that maps here.
 */
export class AppError extends Error {
  code: string | null
  constructor(message: string, code: string | null = null) {
    super(message)
    this.name = 'AppError'
    this.code = code
  }
}

const HINT_MESSAGES: Record<string, string> = {
  slot_unavailable: '這個時段已無法預約，請換一個時段試試。',
  schedule_conflict: '這個時段已經有其他行程了。',
  provider_offline: '這位陪伴者目前休息中，暫時無法預約。',
  bank_not_set: '請先設定收款銀行帳戶。',
  already_withdrawn: '本月已經提領過了，下個月 1 日起可再次申請。',
  no_balance: '目前沒有可提領的餘額。',
  already_rated: '這筆服務已經評價過了。',
  refund_required: '這筆訂單已付款，取消時會自動退款。',
}

interface PostgrestLike {
  message?: string
  code?: string
  hint?: string | null
  details?: string | null
  status?: number
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error
  const e = (error ?? {}) as PostgrestLike & { name?: string }
  const hint = e.hint ?? null

  if (hint && HINT_MESSAGES[hint]) return new AppError(e.message && /[一-鿿]/.test(e.message) ? e.message : HINT_MESSAGES[hint], hint)
  if (e.code === '23P01') return new AppError('這個時段剛剛被預約走了，請選擇其他時段。', 'schedule_conflict')
  if (e.code === '23503') return new AppError('這筆資料與其他紀錄相關聯，無法刪除。', 'in_use')
  if (e.code === '23505') return new AppError('資料重複了，請重新整理後再試一次。', 'duplicate')
  if (e.code === '42501') return new AppError('沒有權限執行這個動作，請重新登入。', 'forbidden')
  if (e.code === 'PGRST301' || e.status === 401) return new AppError('登入已過期，請重新登入。', 'unauthorized')
  if (e.name === 'TypeError' && /fetch|network/i.test(e.message ?? '')) return new AppError('網路連線不穩定，請檢查網路後再試一次。', 'network')
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return new AppError('目前沒有網路連線，恢復後會自動重試。', 'offline')
  if (e.message && /[一-鿿]/.test(e.message)) return new AppError(e.message, hint ?? e.code ?? null)
  return new AppError('發生了一點問題，請稍後再試。', e.code ?? null)
}

export function errorMessage(error: unknown) {
  return toAppError(error).message
}
