import { describe, expect, it } from 'vitest'
import { computeDaySlots, expandWeeklyTemplate, maxConsecutiveHours, pruneAvailability, toggleHour } from './availability'
import { parseBloodPressure, parseHeartRate, parseTemperature, parseWeight, readFloat32, readSFloat } from './ble'
import { toAppError } from './errors'
import { formatDateLong, formatMoney, formatPhone, isValidTaiwanPhone, monogram, orderCode, relativeDayLabel } from './format'
import { estimateRoute, formatDistance, formatEta, haversine, pointAlong, projectOntoRoute, routeLength } from './geo'
import { classifyBloodPressure, classifyHeartRate, classifyTemperature } from './health'
import { computePrice, isValidRate, snapRate } from './pricing'
import { parseAddressArea, TAIWAN_CITIES } from './taiwan'
import { addDays, diffDays, nextMonthStart, taipeiParts, taipeiTimestamp, weekday } from './time'
import { getWithdrawState } from './withdraw'
import { parseYouTubeId } from './youtube'

const view = (bytes: number[]) => new DataView(Uint8Array.from(bytes).buffer)

describe('pricing (mirrors private.prepare_order)', () => {
  it('splits 15% platform fee', () => {
    expect(computePrice(400, 2)).toEqual({ total: 800, platformFee: 120, providerEarning: 680 })
  })
  it('rounds half away from zero like Postgres numeric round()', () => {
    expect(computePrice(350, 3)).toEqual({ total: 1050, platformFee: 158, providerEarning: 892 })
  })
  it('snaps and validates the $50 steps between $200 and $1000', () => {
    expect(snapRate(374)).toBe(350)
    expect(snapRate(376)).toBe(400)
    expect(snapRate(10)).toBe(200)
    expect(snapRate(5000)).toBe(1000)
    expect(isValidRate(375)).toBe(false)
    expect(isValidRate(1000)).toBe(true)
  })
})

describe('time (Asia/Taipei)', () => {
  it('reads Taipei wall-clock from UTC', () => {
    const p = taipeiParts(new Date('2026-10-14T17:30:00Z'))
    expect(p.date).toBe('2026-10-15')
    expect(p.hour).toBe(1)
  })
  it('does date arithmetic across months and years', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(diffDays('2026-11-02', '2026-10-30')).toBe(3)
    expect(weekday('2026-10-15')).toBe(4)
  })
  it('builds absolute timestamps from Taipei local time', () => {
    expect(new Date(taipeiTimestamp('2026-10-15', '09:00')).toISOString()).toBe('2026-10-15T01:00:00.000Z')
    expect(new Date(taipeiTimestamp('2026-10-15', '24:00')).toISOString()).toBe('2026-10-15T16:00:00.000Z')
  })
  it('knows when next month starts', () => {
    expect(nextMonthStart(new Date('2026-12-20T04:00:00Z'))).toBe('2027-01-01')
  })
})

describe('availability calendar', () => {
  const slots = { '2026-10-15': ['09:00', '10:00', '11:00', '14:00'], '2026-10-16': ['08:00'] }
  const booked = [{ service_date: '2026-10-15', start_time: '10:00:00', end_time: '11:00:00' }]
  const now = new Date('2026-10-15T01:30:00Z') // 09:30 in Taipei

  it('marks booked and past hours and omits closed ones', () => {
    expect(computeDaySlots(slots, booked, '2026-10-15', now)).toEqual([
      { hour: 9, label: '09:00', state: 'past' },
      { hour: 10, label: '10:00', state: 'booked' },
      { hour: 11, label: '11:00', state: 'available' },
      { hour: 14, label: '14:00', state: 'available' },
    ])
  })
  it('counts consecutive bookable hours', () => {
    const day = computeDaySlots(slots, [], '2026-10-15', new Date('2026-10-14T00:00:00Z'))
    expect(maxConsecutiveHours(day, 9)).toBe(3)
    expect(maxConsecutiveHours(day, 14)).toBe(1)
    expect(maxConsecutiveHours(day, 12)).toBe(0)
  })
  it('expands weekly templates and prunes old days', () => {
    const t = expandWeeklyTemplate({ 4: [10, 9] }, 7, '2026-10-12')
    expect(t).toEqual({ '2026-10-15': ['09:00', '10:00'] })
    expect(pruneAvailability({ '2026-10-01': ['09:00'], '2026-10-20': [], '2026-10-21': ['10:00'] }, '2026-10-15')).toEqual({ '2026-10-21': ['10:00'] })
  })
  it('toggles hours on and off', () => {
    const on = toggleHour({}, '2026-10-15', 9)
    expect(on).toEqual({ '2026-10-15': ['09:00'] })
    expect(toggleHour(on, '2026-10-15', 9)).toEqual({})
  })
})

describe('withdrawal guard (mirrors public.request_withdrawal)', () => {
  const now = new Date('2026-10-14T04:00:00Z')
  it('requires a bank account first', () => {
    expect(getWithdrawState({ bankCode: null, bankAccount: null, balance: 100, lastWithdrawMonth: null }, now).blocker).toBe('bank_not_set')
  })
  it('allows only one withdrawal per month', () => {
    const s = getWithdrawState({ bankCode: '822', bankAccount: '123456', balance: 100, lastWithdrawMonth: '2026-10' }, now)
    expect(s).toEqual({ canWithdraw: false, blocker: 'already_withdrawn', nextOpenDate: '2026-11-01' })
  })
  it('needs a positive balance', () => {
    expect(getWithdrawState({ bankCode: '822', bankAccount: '123456', balance: 0, lastWithdrawMonth: '2026-09' }, now).blocker).toBe('no_balance')
  })
  it('passes when everything is in order', () => {
    expect(getWithdrawState({ bankCode: '822', bankAccount: '123456', balance: 12450, lastWithdrawMonth: '2026-09' }, now).canWithdraw).toBe(true)
  })
})

describe('YouTube id parsing', () => {
  const id = 'aqz-KE-bpKQ'
  it.each([
    id,
    `https://www.youtube.com/watch?v=${id}`,
    `https://youtube.com/watch?feature=share&v=${id}&t=42s`,
    `https://m.youtube.com/watch?v=${id}`,
    `https://music.youtube.com/watch?v=${id}&list=RD`,
    `https://youtu.be/${id}`,
    `https://youtu.be/${id}?si=abcdef`,
    `youtu.be/${id}`,
    `https://www.youtube.com/embed/${id}?start=10`,
    `https://www.youtube-nocookie.com/embed/${id}`,
    `https://www.youtube.com/shorts/${id}`,
    `https://www.youtube.com/live/${id}?feature=share`,
    `https://www.youtube.com/v/${id}`,
    `  https://www.youtube.com/watch?v=${id}  `,
  ])('extracts the id from %s', (url) => {
    expect(parseYouTubeId(url)).toBe(id)
  })
  it.each(['', 'hello', 'https://vimeo.com/123', 'https://youtube.com/watch?v=short', 'https://www.youtube.com/@channel'])('rejects %s', (url) =>
    expect(parseYouTubeId(url)).toBeNull(),
  )
})

describe('geo', () => {
  const taipei101 = { lat: 25.0339, lng: 121.5645 }
  const mainStation = { lat: 25.0478, lng: 121.517 }
  it('measures distances', () => {
    const d = haversine(taipei101, mainStation)
    expect(d).toBeGreaterThan(4900)
    expect(d).toBeLessThan(5100)
  })
  it('walks along and projects onto a route', () => {
    const route = estimateRoute(mainStation, taipei101)
    const len = routeLength(route.coordinates)
    expect(route.distanceMeters).toBeCloseTo(len, 3)
    const mid = pointAlong(route.coordinates, len / 2).point
    const proj = projectOntoRoute(route.coordinates, mid)
    expect(proj.offRoute).toBeLessThan(1)
    expect(proj.along).toBeGreaterThan(len / 2 - 5)
    expect(proj.along).toBeLessThan(len / 2 + 5)
    expect(pointAlong(route.coordinates, len * 2).point.lat).toBeCloseTo(taipei101.lat, 6)
  })
  it('formats distance and ETA for elders', () => {
    expect(formatDistance(834)).toBe('830 公尺')
    expect(formatDistance(2400)).toBe('2.4 公里')
    expect(formatEta(30)).toBe('即將抵達')
    expect(formatEta(8 * 60)).toBe('8 分鐘')
    expect(formatEta(65 * 60)).toBe('1 小時 5 分')
  })
})

describe('Bluetooth health profiles (IEEE-11073)', () => {
  it('decodes SFLOAT and FLOAT', () => {
    expect(readSFloat(view([0x78, 0x00]), 0)).toBe(120)
    expect(readSFloat(view([0xb0, 0xf4]), 0)).toBe(120) // 1200 × 10^-1
    expect(readSFloat(view([0xff, 0x0f]), 0)).toBe(-1)
    expect(readSFloat(view([0xff, 0x07]), 0)).toBeNull() // NaN
    expect(readFloat32(view([0x6e, 0x01, 0x00, 0xff]), 0)).toBe(36.6)
  })
  it('parses a blood pressure measurement with pulse', () => {
    const bp = parseBloodPressure(view([0x04, 0x78, 0x00, 0x50, 0x00, 0x5a, 0x00, 0x48, 0x00]))
    expect(bp).toEqual({ systolic: 120, diastolic: 80, pulse: 72, recordedAt: null })
  })
  it('converts kPa readings and skips the timestamp', () => {
    const bp = parseBloodPressure(view([0x07, 0xa0, 0xf0, 0x6b, 0xf0, 0x00, 0x00, 0xea, 0x07, 10, 15, 8, 30, 0, 0x46, 0x00]))
    expect(bp.systolic).toBe(120)
    expect(bp.diastolic).toBe(80)
    expect(bp.pulse).toBe(70)
    expect(bp.recordedAt?.getFullYear()).toBe(2026)
  })
  it('parses heart rate, temperature and weight', () => {
    expect(parseHeartRate(view([0x00, 72]))).toBe(72)
    expect(parseHeartRate(view([0x01, 0x2c, 0x01]))).toBe(300)
    expect(parseTemperature(view([0x00, 0x6e, 0x01, 0x00, 0xff]))).toBe(36.6)
    expect(parseTemperature(view([0x01, 0xda, 0x03, 0x00, 0xff]))).toBe(37) // 98.6 °F
    expect(parseWeight(view([0x00, 0xf0, 0x28]))).toBe(52.4)
  })
})

describe('health classification', () => {
  it('flags blood pressure', () => {
    expect(classifyBloodPressure(118, 76).level).toBe('good')
    expect(classifyBloodPressure(132, 78).level).toBe('watch')
    expect(classifyBloodPressure(145, 92).level).toBe('alert')
  })
  it('flags heart rate and temperature', () => {
    expect(classifyHeartRate(72).level).toBe('good')
    expect(classifyHeartRate(120).level).toBe('alert')
    expect(classifyTemperature(37.6).label).toBe('微燒')
    expect(classifyTemperature(38.2).level).toBe('alert')
  })
})

describe('formatting', () => {
  it('formats money, order codes and phones', () => {
    expect(formatMoney(12450)).toBe('$12,450')
    expect(formatMoney(-60)).toBe('−$60')
    expect(orderCode('1a2b3c4d-0000-4000-8000-000000000000')).toBe('SC-1A2B3C4D')
    expect(formatPhone('0912345678')).toBe('0912-345-678')
    expect(isValidTaiwanPhone('0912-345-678')).toBe(true)
    expect(isValidTaiwanPhone('+886912345678')).toBe(true)
    expect(isValidTaiwanPhone('12345')).toBe(false)
  })
  it('speaks in relative days', () => {
    expect(relativeDayLabel('2026-10-15', '2026-10-14')).toBe('明天')
    expect(formatDateLong('2026-10-14', '2026-10-14')).toBe('今天 · 10月14日（三）')
  })
  it('picks a monogram character', () => {
    expect(monogram('小君')).toBe('君')
    expect(monogram('淑芬老師')).toBe('芬')
    expect(monogram('明德大哥')).toBe('德')
  })
})

describe('Taiwan districts', () => {
  it('lists all 368 townships', () => {
    expect(TAIWAN_CITIES).toHaveLength(22)
    expect(TAIWAN_CITIES.reduce((n, c) => n + c.districts.length, 0)).toBe(368)
  })
  it('reads the area from an address', () => {
    expect(parseAddressArea('106 臺北市大安區仁愛路四段 300 巷')).toEqual({ city: '台北市', district: '大安區' })
    expect(parseAddressArea('新北市板橋區文化路一段')).toEqual({ city: '新北市', district: '板橋區' })
    expect(parseAddressArea('火星')).toEqual({ city: null, district: null })
  })
})

describe('error mapping', () => {
  it('maps RPC hints and SQLSTATE codes to friendly messages', () => {
    expect(toAppError({ code: '23P01', message: 'conflicting key value violates exclusion constraint' }).code).toBe('schedule_conflict')
    expect(toAppError({ code: 'P0001', hint: 'already_withdrawn', message: '本月已經提領過了，下個月 1 日起可再次申請。' }).message).toContain('本月')
    expect(toAppError(new Error('boom')).message).toBe('發生了一點問題，請稍後再試。')
  })
})
