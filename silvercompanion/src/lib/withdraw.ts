import { currentMonth, nextMonthStart } from './time'

export type WithdrawBlocker = 'bank_not_set' | 'already_withdrawn' | 'no_balance'

export interface WithdrawState {
  canWithdraw: boolean
  blocker: WithdrawBlocker | null
  /** First day the next withdrawal opens when blocked by the monthly limit. */
  nextOpenDate: string | null
}

/** Client-side mirror of public.request_withdrawal()'s guards (same order). */
export function getWithdrawState(
  input: { bankCode: string | null; bankAccount: string | null; balance: number; lastWithdrawMonth: string | null },
  now: Date = new Date(),
): WithdrawState {
  if (!input.bankCode || !input.bankAccount) return { canWithdraw: false, blocker: 'bank_not_set', nextOpenDate: null }
  if (input.lastWithdrawMonth === currentMonth(now)) return { canWithdraw: false, blocker: 'already_withdrawn', nextOpenDate: nextMonthStart(now) }
  if (input.balance <= 0) return { canWithdraw: false, blocker: 'no_balance', nextOpenDate: null }
  return { canWithdraw: true, blocker: null, nextOpenDate: null }
}
