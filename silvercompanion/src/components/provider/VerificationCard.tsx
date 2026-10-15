import { BadgeCheck, FileCheck2, FileUp, Hourglass, ShieldCheck, Sparkles } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { qk, useDocuments, useInvalidate } from '@/hooks/queries'
import { errorMessage } from '@/lib/errors'
import { formatMonthDay } from '@/lib/format'
import { cn } from '@/lib/utils'
import { isDemo, providerService } from '@/services'
import { demoApproveVerification } from '@/services/demo/backend'

const REQUIRED = [
  { kind: '良民證', title: '警察刑事紀錄證明（良民證）', hint: '三個月內申請的正本掃描或照片' },
  { kind: '專業證照', title: '照顧服務員證照或相關證明', hint: '照服員結業證書、護理師執照、急救證照皆可' },
] as const

const MAX_BYTES = 10 * 1024 * 1024

/**
 * Spec 4.3 / 3.2 — companions stay invisible to families until the platform
 * has checked their identity and documents (provider_details.is_verified).
 */
export function VerificationCard({ className, verified = false }: { className?: string; verified?: boolean }) {
  const documents = useDocuments()
  const invalidate = useInvalidate()
  const [uploading, setUploading] = useState<string | null>(null)
  const [approving, setApproving] = useState(false)
  const inputs = useRef<Record<string, HTMLInputElement | null>>({})
  const docs = documents.data ?? []
  const uploadedKinds = new Set(docs.map((d) => d.kind))
  const ready = REQUIRED.every((r) => uploadedKinds.has(r.kind))

  const upload = async (kind: string, file: File | undefined) => {
    if (!file) return
    if (file.size > MAX_BYTES) return void toast.error('檔案超過 10 MB，請壓縮後再上傳。')
    if (!/^(image\/|application\/pdf)/.test(file.type)) return void toast.error('請上傳照片或 PDF 檔。')
    setUploading(kind)
    try {
      await providerService.uploadDocument(file, kind)
      await invalidate(qk.documents)
      toast.success(`已上傳${kind}，審核約需 1–3 個工作天`)
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setUploading(null)
    }
  }

  const approve = async () => {
    setApproving(true)
    try {
      await demoApproveVerification()
      await invalidate(qk.myProvider, qk.notifications)
      toast.success('審核通過！現在可以開啟上線接案了')
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setApproving(false)
    }
  }

  if (verified)
    return (
      <section className={cn('flex items-center gap-4 rounded-[28px] border border-success/25 bg-success-soft p-5', className)} aria-label="認證狀態">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-success text-white">
          <BadgeCheck className="size-6" />
        </span>
        <div className="min-w-0">
          <p className="text-lg font-black text-success">已通過實名與背景審核</p>
          <p className="text-[15px] text-ink-2">家屬會在您的頁面看到「實名認證」標章。</p>
        </div>
      </section>
    )

  return (
    <section className={cn('overflow-hidden rounded-[32px] border border-warning/30 bg-surface shadow-soft', className)} aria-labelledby="verify-title">
      <div className="flex flex-col gap-4 bg-warning-soft/70 p-5 sm:flex-row sm:items-center md:p-6">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-warning text-white">
          {ready ? <Hourglass className="size-7" /> : <ShieldCheck className="size-7" />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="verify-title" className="text-xl font-black md:text-2xl">
            {ready ? '文件審核中' : '完成認證，開始接案'}
          </h2>
          <p className="mt-1 text-[15px] leading-relaxed text-ink-2">
            {ready
              ? '我們正在核對您的身分與文件，通常 1–3 個工作天完成，結果會以通知告訴您。'
              : '為了長輩的安全，所有陪伴者都需要上傳以下文件。通過審核後才會出現在家屬的搜尋結果。'}
          </p>
        </div>
        {isDemo && ready && (
          <Button variant="dark" onClick={approve} loading={approving} className="shrink-0">
            <Sparkles /> 模擬審核通過
          </Button>
        )}
      </div>

      <ul className="divide-y divide-line">
        {REQUIRED.map((r) => {
          const doc = docs.find((d) => d.kind === r.kind)
          return (
            <li key={r.kind} className="flex flex-wrap items-center gap-4 p-5 md:px-6">
              <span className={cn('grid size-11 shrink-0 place-items-center rounded-2xl', doc ? 'bg-success-soft text-success' : 'bg-surface-3 text-ink-3')}>
                {doc ? <FileCheck2 className="size-5" /> : <FileUp className="size-5" />}
              </span>
              <div className="min-w-0 flex-1 basis-56">
                <p className="text-lg font-bold">{r.title}</p>
                {documents.isLoading ? (
                  <Skeleton className="mt-1 h-4 w-40" />
                ) : (
                  <p className="truncate text-sm text-ink-3">
                    {doc ? `已上傳 ${doc.name}${doc.uploadedAt ? `・${formatMonthDay(doc.uploadedAt.slice(0, 10))}` : ''}` : r.hint}
                  </p>
                )}
              </div>
              <input
                ref={(el) => {
                  inputs.current[r.kind] = el
                }}
                type="file"
                accept="image/*,application/pdf"
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                onChange={(e) => {
                  void upload(r.kind, e.target.files?.[0])
                  e.target.value = ''
                }}
              />
              <Button
                variant={doc ? 'ghost' : 'secondary'}
                onClick={() => inputs.current[r.kind]?.click()}
                loading={uploading === r.kind}
                disabled={uploading !== null && uploading !== r.kind}
                aria-label={`${doc ? '重新上傳' : '上傳'}${r.title}`}
              >
                <FileUp /> {doc ? '重新上傳' : '上傳文件'}
              </Button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
