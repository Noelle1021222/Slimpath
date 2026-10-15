import { Activity, Bluetooth, HeartPulse, Plus, Scale, Thermometer, TrendingDown, TrendingUp } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Sparkline } from '@/components/common/Sparkline'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useHealthLogs } from '@/hooks/queries'
import { formatNumber, formatRelativeTime } from '@/lib/format'
import {
  classifyBloodPressure,
  classifyHeartRate,
  classifySteps,
  classifyTemperature,
  DAILY_STEP_GOAL,
  latestReadings,
  series,
  type HealthLevel,
} from '@/lib/health'
import { cn } from '@/lib/utils'
import type { KinshipRecipient } from '@/types'
import { HealthDataModal } from './HealthDataModal'

const LEVEL: Record<HealthLevel, string> = {
  good: 'bg-success-soft text-success',
  watch: 'bg-warning-soft text-warning',
  alert: 'bg-danger-soft text-danger-strong',
  none: 'bg-surface-3 text-ink-3',
}

/** Spec 4.2.1 — today's vitals at a glance, with a 14-day trend. */
export function HealthTodayCard({ recipient, className }: { recipient: KinshipRecipient | null; className?: string }) {
  const { data = [], isLoading } = useHealthLogs(recipient?.id ?? null, !!recipient)
  const [open, setOpen] = useState(false)
  const r = latestReadings(data)
  const bp = classifyBloodPressure(r.bp?.high, r.bp?.low)
  const hr = classifyHeartRate(r.heartRate?.heart_rate)
  const temp = classifyTemperature(r.temperature?.temperature)
  const steps = classifySteps(r.steps?.steps)
  const weights = series(data, 'weight', 14)
  const weightDelta = weights.length > 1 ? weights[weights.length - 1] - weights[0] : 0
  const lastDevice = data.find((l) => l.source === 'device')

  return (
    <section className={cn('rounded-[28px] border border-line bg-surface p-5 shadow-soft md:p-7', className)} aria-labelledby="health-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="health-title" className="text-2xl">
            今日健康
          </h2>
          <p className="mt-1 text-[15px] text-ink-3">
            {r.updatedAt ? `更新於 ${formatRelativeTime(r.updatedAt)}` : '還沒有紀錄'}
            {lastDevice && (
              <span className="ml-2 inline-flex items-center gap-1">
                ・<Bluetooth className="size-3.5" /> 藍牙裝置
              </span>
            )}
          </p>
        </div>
        <Button variant="soft" onClick={() => setOpen(true)} disabled={!recipient}>
          <Plus /> 記錄數據
        </Button>
      </div>

      {isLoading ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-36 sm:col-span-2" />
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="col-span-2 flex flex-col rounded-3xl bg-[linear-gradient(140deg,var(--surface-2),var(--surface))] p-5 text-left ring-1 ring-line transition-shadow hover:shadow-soft lg:row-span-2"
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-base font-bold text-ink-2">
                <HeartPulse className="size-5 text-primary" /> 血壓
              </span>
              <span className={cn('rounded-full px-2.5 py-0.5 text-sm font-bold', LEVEL[bp.level])}>{bp.label}</span>
            </div>
            <p className="mt-2 font-num text-[44px] leading-none font-semibold tracking-tight text-ink tabular">
              {r.bp ? (
                <>
                  {r.bp.high}
                  <span className="mx-0.5 text-ink-3">/</span>
                  {r.bp.low}
                </>
              ) : (
                '— / —'
              )}
              <span className="ml-2 font-sans text-base font-bold text-ink-3">mmHg</span>
            </p>
            <Sparkline values={series(data, 'bp_high')} className="mt-auto h-16 pt-3" />
            <span className="mt-2 text-sm text-ink-3">近 14 天收縮壓趨勢</span>
          </button>
          <Metric icon={<Activity className="size-5" />} label="心率" value={r.heartRate?.heart_rate ?? null} unit="次/分" status={hr} />
          <Metric icon={<Thermometer className="size-5" />} label="體溫" value={r.temperature?.temperature ?? null} unit="°C" status={temp} digits={1} />
          <div className="rounded-3xl p-4 ring-1 ring-line">
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
              <span className="text-base font-bold whitespace-nowrap text-ink-2">步數</span>
              <span className={cn('rounded-full px-2 py-0.5 text-xs font-bold', LEVEL[steps.level])}>{steps.label}</span>
            </div>
            <p className="mt-2 font-num text-3xl font-semibold text-ink tabular">{r.steps?.steps != null ? formatNumber(r.steps.steps) : '—'}</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-3" aria-hidden>
              <div className="h-full rounded-full bg-success" style={{ width: `${Math.min(100, ((r.steps?.steps ?? 0) / DAILY_STEP_GOAL) * 100)}%` }} />
            </div>
          </div>
          <div className="rounded-3xl p-4 ring-1 ring-line">
            <span className="inline-flex items-center gap-1.5 text-base font-bold text-ink-2">
              <Scale className="size-5" /> 體重
            </span>
            <p className="mt-2 font-num text-3xl font-semibold text-ink tabular">
              {r.weight?.weight != null ? Number(r.weight.weight).toFixed(1) : '—'}
              <span className="ml-1 font-sans text-sm font-bold text-ink-3">公斤</span>
            </p>
            {weights.length > 1 && (
              <p
                className={cn(
                  'mt-1 inline-flex items-center gap-1 text-sm font-bold',
                  Math.abs(weightDelta) < 0.3 ? 'text-ink-3' : weightDelta > 0 ? 'text-warning' : 'text-info',
                )}
              >
                {weightDelta >= 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
                兩週 {weightDelta >= 0 ? '+' : ''}
                {weightDelta.toFixed(1)}
              </p>
            )}
          </div>
        </div>
      )}
      <HealthDataModal open={open} onOpenChange={setOpen} recipient={recipient} last={data[0]} />
    </section>
  )
}

function Metric({
  icon,
  label,
  value,
  unit,
  status,
  digits = 0,
}: {
  icon: ReactNode
  label: string
  value: number | null
  unit: string
  status: { level: HealthLevel; label: string }
  digits?: number
}) {
  return (
    <div className="rounded-3xl p-4 ring-1 ring-line">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <span className="inline-flex items-center gap-1.5 text-base font-bold whitespace-nowrap text-ink-2">
          {icon}
          {label}
        </span>
        <span className={cn('rounded-full px-2 py-0.5 text-xs font-bold', LEVEL[status.level])}>{status.label}</span>
      </div>
      <p className="mt-2 font-num text-3xl font-semibold text-ink tabular">
        {value != null ? Number(value).toFixed(digits) : '—'}
        <span className="ml-1 font-sans text-sm font-bold text-ink-3">{unit}</span>
      </p>
    </div>
  )
}
