import type { HealthLog } from '@/types'

export type HealthLevel = 'good' | 'watch' | 'alert' | 'none'

export interface Reading {
  level: HealthLevel
  label: string
}

/** Thresholds follow the 2022 Taiwan Society of Cardiology home-BP target (<130/80). */
export function classifyBloodPressure(high?: number | null, low?: number | null): Reading {
  if (!high || !low) return { level: 'none', label: '尚無紀錄' }
  if (high >= 140 || low >= 90) return { level: 'alert', label: '偏高，請留意' }
  if (high < 90 || low < 60) return { level: 'watch', label: '偏低' }
  if (high >= 130 || low >= 80) return { level: 'watch', label: '略高' }
  return { level: 'good', label: '理想' }
}

export function classifyHeartRate(bpm?: number | null): Reading {
  if (!bpm) return { level: 'none', label: '尚無紀錄' }
  if (bpm < 50 || bpm > 110) return { level: 'alert', label: bpm < 50 ? '過慢' : '過快' }
  if (bpm < 60 || bpm > 100) return { level: 'watch', label: bpm < 60 ? '偏慢' : '偏快' }
  return { level: 'good', label: '正常' }
}

export function classifyTemperature(celsius?: number | null): Reading {
  if (!celsius) return { level: 'none', label: '尚無紀錄' }
  if (celsius >= 38) return { level: 'alert', label: '發燒' }
  if (celsius >= 37.5) return { level: 'watch', label: '微燒' }
  if (celsius < 35.5) return { level: 'watch', label: '偏低' }
  return { level: 'good', label: '正常' }
}

export const DAILY_STEP_GOAL = 4000

export function classifySteps(steps?: number | null): Reading {
  if (steps == null) return { level: 'none', label: '尚無紀錄' }
  if (steps >= DAILY_STEP_GOAL) return { level: 'good', label: '達標' }
  if (steps >= DAILY_STEP_GOAL / 2) return { level: 'watch', label: `目標 ${DAILY_STEP_GOAL.toLocaleString()}` }
  return { level: 'watch', label: '多走走' }
}

/** Latest non-null value of each metric across recent logs (newest first). */
export function latestReadings(logs: HealthLog[]) {
  const sorted = [...logs].sort((a, b) => b.recorded_at.localeCompare(a.recorded_at))
  const pick = <K extends keyof HealthLog>(key: K) => sorted.find((l) => l[key] != null) ?? null
  const bp = pick('bp_high')
  return {
    bp: bp ? { high: bp.bp_high!, low: bp.bp_low!, at: bp.recorded_at } : null,
    heartRate: pick('heart_rate'),
    temperature: pick('temperature'),
    steps: pick('steps'),
    weight: pick('weight'),
    updatedAt: sorted[0]?.recorded_at ?? null,
  }
}

/** Oldest → newest series for sparklines. */
export function series(logs: HealthLog[], key: 'bp_high' | 'bp_low' | 'heart_rate' | 'temperature' | 'steps' | 'weight', days = 14) {
  return [...logs]
    .filter((l) => l[key] != null)
    .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
    .slice(-days)
    .map((l) => Number(l[key]))
}
