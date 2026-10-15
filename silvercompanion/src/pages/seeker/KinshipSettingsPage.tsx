import { Accessibility, BedDouble, HandHelping, MapPin, MapPinned, Pencil, PersonStanding, Plus, Quote, Trash2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { toast } from 'sonner'
import { PageContainer, PageHeader } from '@/components/common/PageHeader'
import { KinshipFormModal } from '@/components/seeker/KinshipFormModal'
import { UserAvatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonCard } from '@/components/ui/skeleton'
import { qk, useInvalidate, useKinship } from '@/hooks/queries'
import { errorMessage } from '@/lib/errors'
import { kinshipService } from '@/services'
import type { KinshipRecipient, Mobility } from '@/types'

const MOBILITY: Record<Mobility, { icon: typeof PersonStanding; tone: string }> = {
  可自理: { icon: PersonStanding, tone: 'bg-success-soft text-success' },
  需攙扶: { icon: HandHelping, tone: 'bg-warning-soft text-warning' },
  需輪椅: { icon: Accessibility, tone: 'bg-info-soft text-info' },
  臥床: { icon: BedDouble, tone: 'bg-danger-soft text-danger-strong' },
}

/** Spec 4.2.4 — 家庭照顧中心: full CRUD for the elders in my care. */
export default function KinshipSettingsPage() {
  const { data = [], isLoading } = useKinship()
  const [editing, setEditing] = useState<KinshipRecipient | null>(null)
  const [creating, setCreating] = useState(false)
  const confirm = useConfirm()
  const invalidate = useInvalidate()

  const remove = async (r: KinshipRecipient) => {
    const ok = await confirm({
      title: `刪除 ${r.nickname ?? r.name} 的檔案？`,
      description: '健康數據也會一併刪除。有服務紀錄的長輩無法刪除，以保留聯絡簿與帳務資料。',
      confirmText: '刪除',
      tone: 'danger',
    })
    if (!ok) return
    try {
      await kinshipService.remove(r.id)
      await invalidate(qk.kinship, ['health'])
      toast.success('已刪除')
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <PageContainer>
      <PageHeader
        back="/seeker/profile"
        eyebrow="Family care centre"
        title="家庭照顧中心"
        description="記下每位長輩的行動能力、慢性病與照顧叮嚀。預約時會自動帶入地址與注意事項，陪伴者也能提前做好準備。"
        actions={
          <Button size="lg" onClick={() => setCreating(true)}>
            <Plus /> 新增長輩
          </Button>
        }
      />
      {isLoading ? (
        <div className="grid gap-5 md:grid-cols-2">
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          title="還沒有長輩的檔案"
          description="建立後就能為他們預約陪伴、記錄健康數據。"
          action={
            <Button size="lg" onClick={() => setCreating(true)}>
              <Plus /> 新增第一位長輩
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          <AnimatePresence>
            {data.map((r, i) => {
              const m = MOBILITY[r.mobility]
              return (
                <motion.article
                  key={r.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex flex-col rounded-[28px] border border-line bg-surface p-6 shadow-soft"
                >
                  <header className="flex items-start gap-4">
                    <UserAvatar name={r.nickname ?? r.name} size="lg" />
                    <div className="min-w-0 flex-1">
                      <h2 className="font-serif text-2xl font-black">{r.nickname ?? r.name}</h2>
                      <p className="text-base text-ink-2">
                        {r.nickname ? `${r.name}・` : ''}
                        {r.age} 歲
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[15px] font-bold ${m.tone}`}>
                      <m.icon className="size-4" />
                      {r.mobility}
                    </span>
                  </header>
                  {r.chronic_diseases.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {r.chronic_diseases.map((d) => (
                        <span key={d} className="rounded-full bg-surface-2 px-3 py-1 text-sm font-bold text-ink-2">
                          {d}
                        </span>
                      ))}
                    </div>
                  )}
                  {r.notes && (
                    <p className="relative mt-4 rounded-2xl bg-primary-soft/50 py-3 pr-4 pl-11 text-base leading-relaxed text-ink">
                      <Quote className="absolute top-3.5 left-4 size-5 text-primary/50" />
                      {r.notes}
                    </p>
                  )}
                  <p className="mt-4 flex items-start gap-2 text-base text-ink-2">
                    <MapPin className="mt-1 size-4 shrink-0" />
                    <span className="flex-1">{r.address}</span>
                    {r.lat != null && (
                      <span className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-success" title="已取得座標，可用於導航">
                        <MapPinned className="size-4" /> 已定位
                      </span>
                    )}
                  </p>
                  <footer className="mt-auto flex gap-2 pt-5">
                    <Button variant="secondary" className="flex-1" onClick={() => setEditing(r)}>
                      <Pencil /> 編輯
                    </Button>
                    <Button variant="ghost" onClick={() => remove(r)} aria-label={`刪除 ${r.nickname ?? r.name}`}>
                      <Trash2 />
                    </Button>
                  </footer>
                </motion.article>
              )
            })}
          </AnimatePresence>
        </div>
      )}
      <KinshipFormModal open={creating || !!editing} onOpenChange={(v) => !v && (setCreating(false), setEditing(null))} recipient={editing} />
    </PageContainer>
  )
}
