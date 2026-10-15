/** Mirrors private.platform_fee_rate() and private.prepare_order() in SQL. */
export const PLATFORM_FEE_RATE = 0.15
export const RATE_MIN = 200
export const RATE_MAX = 1000
export const RATE_STEP = 50
export const DEFAULT_RATE = 350

export interface PriceBreakdown {
  total: number
  platformFee: number
  providerEarning: number
}

/** Postgres `round()` on numeric rounds half away from zero; so does this. */
function roundHalfAway(n: number) {
  return Math.sign(n) * Math.round(Math.abs(n))
}

export function computePrice(hourlyRate: number, hours: number): PriceBreakdown {
  const total = hourlyRate * hours
  const platformFee = roundHalfAway(total * PLATFORM_FEE_RATE)
  return { total, platformFee, providerEarning: total - platformFee }
}

export function snapRate(rate: number) {
  const snapped = Math.round(rate / RATE_STEP) * RATE_STEP
  return Math.min(RATE_MAX, Math.max(RATE_MIN, snapped))
}

export function isValidRate(rate: number) {
  return Number.isInteger(rate) && rate >= RATE_MIN && rate <= RATE_MAX && rate % RATE_STEP === 0
}
