/**
 * Parsers for the Bluetooth SIG health profiles exposed by most home devices.
 * Values use IEEE-11073 20601 SFLOAT (16-bit) / FLOAT (32-bit) encodings.
 */

export function readSFloat(view: DataView, offset: number): number | null {
  const raw = view.getUint16(offset, true)
  // NaN, NRes, +INF, -INF, reserved
  if ([0x07ff, 0x0800, 0x07fe, 0x0802, 0x0801].includes(raw)) return null
  let mantissa = raw & 0x0fff
  let exponent = raw >> 12
  if (mantissa >= 0x0800) mantissa -= 0x1000
  if (exponent >= 0x8) exponent -= 0x10
  return round(mantissa * 10 ** exponent)
}

export function readFloat32(view: DataView, offset: number): number | null {
  const raw = view.getUint32(offset, true)
  if ([0x007fffff, 0x00800000, 0x007ffffe, 0x00800002, 0x00800001].includes(raw)) return null
  let mantissa = raw & 0x00ffffff
  let exponent = (raw >>> 24) & 0xff
  if (mantissa >= 0x800000) mantissa -= 0x1000000
  if (exponent >= 0x80) exponent -= 0x100
  return round(mantissa * 10 ** exponent)
}

function round(n: number, digits = 2) {
  const f = 10 ** digits
  return Math.round(n * f) / f
}

const KPA_TO_MMHG = 7.50062

/** Blood Pressure Measurement characteristic (0x2A35). */
export function parseBloodPressure(view: DataView) {
  const flags = view.getUint8(0)
  const kpa = (flags & 0x01) !== 0
  let offset = 1
  const sys = readSFloat(view, offset)
  const dia = readSFloat(view, offset + 2)
  offset += 6 // systolic, diastolic, mean arterial pressure
  let recordedAt: Date | null = null
  if (flags & 0x02) {
    const year = view.getUint16(offset, true)
    const [month, day, hours, minutes, seconds] = [2, 3, 4, 5, 6].map((i) => view.getUint8(offset + i))
    if (year > 0 && month > 0 && day > 0) recordedAt = new Date(year, month - 1, day, hours, minutes, seconds)
    offset += 7
  }
  let pulse: number | null = null
  if (flags & 0x04) pulse = readSFloat(view, offset)
  const toMmHg = (v: number | null) => (v == null ? null : Math.round(kpa ? v * KPA_TO_MMHG : v))
  return { systolic: toMmHg(sys), diastolic: toMmHg(dia), pulse: pulse == null ? null : Math.round(pulse), recordedAt }
}

/** Heart Rate Measurement characteristic (0x2A37). */
export function parseHeartRate(view: DataView) {
  const flags = view.getUint8(0)
  return (flags & 0x01) !== 0 ? view.getUint16(1, true) : view.getUint8(1)
}

/** Temperature Measurement characteristic (0x2A1C) → °C. */
export function parseTemperature(view: DataView) {
  const flags = view.getUint8(0)
  const value = readFloat32(view, 1)
  if (value == null) return null
  const celsius = (flags & 0x01) !== 0 ? ((value - 32) * 5) / 9 : value
  return Math.round(celsius * 10) / 10
}

/** Weight Measurement characteristic (0x2A9D) → kg. */
export function parseWeight(view: DataView) {
  const flags = view.getUint8(0)
  const raw = view.getUint16(1, true)
  if (raw === 0xffff) return null // measurement unsuccessful
  const kg = (flags & 0x01) !== 0 ? raw * 0.01 * 0.45359237 : raw * 0.005
  return Math.round(kg * 10) / 10
}
