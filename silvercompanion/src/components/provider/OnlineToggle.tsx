import { Moon, Radio } from 'lucide-react'
import { motion } from 'motion/react'
import { Switch } from '@/components/ui/switch'
import { useUpdateProvider } from '@/hooks/useProviderMutations'
import { cn, haptic } from '@/lib/utils'
import type { ProviderDetails } from '@/types'

/**
 * Spec 4.3.1 — the prominent 上線接案 / 休息模式 switch. Resting companions
 * disappear from family search immediately (service_switch_is_online).
 */
export function OnlineToggle({ details, className, compact }: { details: ProviderDetails; className?: string; compact?: boolean }) {
  const update = useUpdateProvider()
  const online = details.service_switch_is_online
  const locked = !details.is_verified

  return (
    <label
      className={cn(
        'relative flex cursor-pointer items-center gap-4 overflow-hidden rounded-3xl border transition-colors duration-500',
        compact ? 'p-3' : 'p-4 md:p-5',
        online ? 'border-[#2fb5a5]/40 bg-[#2fb5a5]/15' : 'border-white/15 bg-white/[0.06]',
        locked && 'cursor-not-allowed opacity-80',
        className,
      )}
    >
      {online && (
        <motion.span
          aria-hidden
          className="absolute -left-10 size-32 rounded-full bg-[#2fb5a5]/30 blur-2xl"
          animate={{ opacity: [0.4, 0.9, 0.4] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      )}
      <span
        className={cn(
          'relative grid shrink-0 place-items-center rounded-2xl',
          compact ? 'size-10' : 'size-12',
          online ? 'bg-[#0f7c74] text-white' : 'bg-white/10 text-white/80',
        )}
      >
        {online ? <Radio className="size-6" /> : <Moon className="size-6" />}
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="flex items-center gap-2 text-lg font-black text-white md:text-xl">
          {online && <span className="size-2.5 animate-pulse-dot rounded-full bg-[#8fe3d6]" />}
          {online ? '上線接案中' : '休息模式'}
        </span>
        {!compact && (
          <span className="block text-[15px] text-white/70">
            {locked ? '完成實名與背景審核後即可上線' : online ? '家屬現在可以搜尋並預約您' : '暫時不會出現在家屬的搜尋結果'}
          </span>
        )}
      </span>
      <Switch
        checked={online}
        disabled={locked || update.isPending}
        onCheckedChange={(v) => {
          haptic(12)
          update.mutate({ service_switch_is_online: v })
        }}
        aria-label={online ? '切換為休息模式' : '開始上線接案'}
        className="relative h-10 w-[72px] bg-white/20 data-[state=checked]:bg-[#2fb5a5] [&>span]:size-8 [&>span]:data-[state=checked]:translate-x-9"
      />
    </label>
  )
}
