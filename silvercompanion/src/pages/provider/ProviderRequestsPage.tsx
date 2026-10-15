import { useQueryClient } from '@tanstack/react-query'
import { Crosshair, Moon, Radio } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { PageContainer, PageHeader } from '@/components/common/PageHeader'
import { RequestCard } from '@/components/provider/RequestCard'
import { VerificationCard } from '@/components/provider/VerificationCard'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { useConfirmWithReason } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsBar, TabsContent } from '@/components/ui/tabs'
import { qk, useMyProvider, useProviderRequests } from '@/hooks/queries'
import { getCurrentPosition, getLastKnownPosition } from '@/hooks/useGeolocation'
import { useUpdateProvider } from '@/hooks/useProviderMutations'
import { errorMessage } from '@/lib/errors'
import { formatMoney } from '@/lib/format'
import { haversine } from '@/lib/geo'
import { cityCenter } from '@/lib/taiwan'
import { taipeiTimestamp } from '@/lib/time'
import { haptic } from '@/lib/utils'
import { isDemo, orderService } from '@/services'
import { demoHomeBase } from '@/services/demo/backend'
import type { LatLng, ProviderDetails, ProviderRequest } from '@/types'

type Tab = 'all' | 'direct' | 'open'
type Sort = 'soon' | 'near' | 'earning'
type OriginSource = 'gps' | 'home' | 'city'

const SORTS: { value: Sort; label: string }[] = [
  { value: 'soon', label: '時間最近' },
  { value: 'near', label: '距離最近' },
  { value: 'earning', label: '收入最高' },
]

/** Where distances are measured from: live GPS if already permitted, else home base / service city. */
function useOrigin(details: ProviderDetails | null | undefined) {
  const [gps, setGps] = useState<LatLng | null>(() => getLastKnownPosition())
  const [locating, setLocating] = useState(false)

  useEffect(() => {
    if (gps || isDemo || !navigator.permissions) return
    let cancelled = false
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((status) => {
        if (status.state !== 'granted') return
        return getCurrentPosition(8000).then((p) => !cancelled && setGps(p))
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [gps])

  const locate = async () => {
    setLocating(true)
    try {
      setGps(await getCurrentPosition(8000))
      toast.success('已改用您目前的位置計算距離')
    } catch {
      toast.error('無法取得定位，請確認瀏覽器已允許位置權限。')
    } finally {
      setLocating(false)
    }
  }

  const home = isDemo ? demoHomeBase(details?.provider_id) : null
  const city = cityCenter(details?.city)
  const origin: { point: LatLng; source: OriginSource } | null = gps
    ? { point: gps, source: 'gps' }
    : home
      ? { point: home, source: 'home' }
      : city
        ? { point: city, source: 'city' }
        : null
  return { origin, locate, locating }
}

/** Spec 4.3.2 — 接案大廳: bookings addressed to me plus open matches near me. */
export default function ProviderRequestsPage() {
  const details = useMyProvider()
  const requests = useProviderRequests()
  const client = useQueryClient()
  const navigate = useNavigate()
  const confirm = useConfirmWithReason()
  const update = useUpdateProvider()
  const [tab, setTab] = useState<Tab>('all')
  const [sort, setSort] = useState<Sort>('soon')
  const [busy, setBusy] = useState<{
    id: string
    kind: 'accept' | 'decline'
  } | null>(null)
  const { origin, locate, locating } = useOrigin(details.data)
  const d = details.data

  const list = useMemo(() => {
    const rows = (requests.data ?? []).map((r) => ({
      request: r,
      distance:
        origin && r.approx_lat != null && r.approx_lng != null && !r.is_online ? haversine(origin.point, { lat: r.approx_lat, lng: r.approx_lng }) : null,
      startsAt: taipeiTimestamp(r.service_date, r.start_time),
    }))
    const filtered = rows.filter((x) => (tab === 'all' ? true : tab === 'direct' ? !x.request.is_open : x.request.is_open))
    return filtered.sort((a, b) => {
      if (sort === 'earning') return b.request.provider_earning - a.request.provider_earning
      if (sort === 'near') return (a.distance ?? Number.POSITIVE_INFINITY) - (b.distance ?? Number.POSITIVE_INFINITY) || a.startsAt - b.startsAt
      // Direct bookings first — a family chose this companion specifically.
      return Number(a.request.is_open) - Number(b.request.is_open) || a.startsAt - b.startsAt
    })
  }, [requests.data, origin, tab, sort])

  const all = requests.data ?? []
  const directCount = all.filter((r) => !r.is_open).length
  const openCount = all.length - directCount
  const potential = all.reduce((sum, r) => sum + r.provider_earning, 0)

  const refresh = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: qk.requests }),
      client.invalidateQueries({ queryKey: ['orders'] }),
      client.invalidateQueries({ queryKey: qk.stats }),
      client.invalidateQueries({ queryKey: qk.notifications }),
    ])

  const accept = async (r: ProviderRequest) => {
    setBusy({ id: r.order_id, kind: 'accept' })
    try {
      await orderService.accept(r.order_id)
      haptic([12, 40, 12])
      toast.success(`已接下 ${r.recipient_name} 的預約`, {
        description: '家屬已收到通知，行程加入「我的行程」。',
        action: {
          label: '查看行程',
          onClick: () => navigate('/provider/schedule'),
        },
      })
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      await refresh()
      setBusy(null)
    }
  }

  const decline = async (r: ProviderRequest) => {
    if (r.is_open) {
      setBusy({ id: r.order_id, kind: 'decline' })
      try {
        await orderService.decline(r.order_id)
        toast('已略過這筆需求，不會再出現在您的大廳。')
      } catch (e) {
        toast.error(errorMessage(e))
      } finally {
        await refresh()
        setBusy(null)
      }
      return
    }
    const refund = r.payment_method === 'linepay' && r.payment_status === 'paid'
    const { confirmed, reason } = await confirm({
      title: `婉拒 ${r.seeker_name} 的預約？`,
      description: refund ? '家屬的 LINE Pay 款項會全額退回。婉拒原因會轉告家屬，讓他們能盡快另約時間。' : '婉拒原因會轉告家屬，讓他們能盡快另約時間。',
      confirmText: '婉拒預約',
      cancelText: '再想想',
      tone: 'danger',
      reasonOptions: ['該時段已有安排', '距離太遠', '不熟悉這項服務', '身體不適'],
    })
    if (!confirmed) return
    setBusy({ id: r.order_id, kind: 'decline' })
    try {
      await orderService.decline(r.order_id, reason || undefined)
      toast.success(refund ? '已婉拒，款項將退回家屬的 LINE Pay' : '已婉拒並通知家屬')
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      await refresh()
      setBusy(null)
    }
  }

  const offline = d != null && d.is_verified && !d.service_switch_is_online

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Requests"
        title="接案大廳"
        description="家屬指定您的預約，和附近符合您服務的公開需求。接單後，家屬會立刻收到通知。"
        actions={
          all.length > 0 ? (
            <div className="rounded-3xl border border-line bg-surface px-5 py-3 text-right shadow-soft">
              <p className="text-sm font-bold text-ink-3">全部接下可得</p>
              <p className="font-num text-[30px] leading-none font-extrabold text-primary-ink">{formatMoney(potential)}</p>
            </div>
          ) : undefined
        }
      />

      {d && !d.is_verified && <VerificationCard className="mb-6" />}

      {offline && (
        <div className="mb-6 flex flex-col gap-4 rounded-[28px] bg-hero p-5 text-hero-ink sm:flex-row sm:items-center md:p-6">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/10">
            <Moon className="size-6" />
          </span>
          <p className="min-w-0 flex-1">
            <span className="block text-lg font-black text-white">目前是休息模式</span>
            <span className="block text-[15px] text-hero-ink/75">指定給您的預約仍會送達；開啟上線後，附近的公開需求也會出現在這裡。</span>
          </p>
          <Button
            size="lg"
            className="bg-[#0f7c74] text-white shadow-none hover:bg-[#0c6b64]"
            loading={update.isPending}
            onClick={() =>
              update.mutate(
                { service_switch_is_online: true },
                {
                  onSuccess: () => toast.success('已上線，家屬現在可以找到您'),
                },
              )
            }
          >
            <Radio /> 開始上線接案
          </Button>
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <TabsBar
            value={tab}
            className="lg:w-[460px]"
            items={[
              { value: 'all', label: '全部', count: all.length },
              { value: 'direct', label: '指定給我', count: directCount },
              { value: 'open', label: '公開媒合', count: openCount },
            ]}
          />
          <div className="-mx-4 scrollbar-none flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0 lg:pb-0" role="group" aria-label="排序方式">
            {SORTS.map((s) => (
              <Chip key={s.value} selected={sort === s.value} onClick={() => setSort(s.value)} showCheck>
                {s.label}
              </Chip>
            ))}
          </div>
        </div>

        {origin && list.some((x) => x.distance != null) && (
          <p className="mt-4 text-[15px] leading-relaxed text-ink-3">
            <Crosshair className="mr-1.5 inline size-4 align-[-3px]" />
            {origin.source === 'gps'
              ? '距離依您目前的位置估算'
              : origin.source === 'home'
                ? '距離依您的常用出發地估算'
                : `距離依${d?.city ?? '服務縣市'}市中心估算`}
            ・公開需求只顯示大略位置
            {origin.source !== 'gps' && (
              <button
                type="button"
                onClick={locate}
                disabled={locating}
                className="ml-2 inline-flex min-h-11 items-center align-middle font-bold text-primary-ink underline-offset-4 hover:underline disabled:opacity-60"
              >
                {locating ? '定位中…' : '改用目前位置'}
              </button>
            )}
          </p>
        )}

        <TabsContent value={tab} className="mt-5 focus-visible:outline-none">
          {requests.isLoading ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {Array.from({ length: 2 }, (_, i) => (
                <Skeleton key={i} className="h-[420px] rounded-[28px]" />
              ))}
            </div>
          ) : list.length ? (
            <motion.ul layout className="grid gap-4 lg:grid-cols-2">
              <AnimatePresence initial={false} mode="popLayout">
                {list.map((x, i) => (
                  <motion.li
                    key={x.request.order_id}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      transition: { delay: Math.min(i, 6) * 0.04 },
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0.96,
                      transition: { duration: 0.22 },
                    }}
                  >
                    <RequestCard
                      request={x.request}
                      distance={x.distance}
                      onAccept={() => void accept(x.request)}
                      onDecline={() => void decline(x.request)}
                      busy={busy?.id === x.request.order_id ? busy.kind : null}
                    />
                  </motion.li>
                ))}
              </AnimatePresence>
            </motion.ul>
          ) : (
            <EmptyState
              illustration="calendar"
              title={tab === 'open' && d && !d.service_switch_is_online ? '上線後才會收到公開需求' : '目前沒有新的請求'}
              description={
                d && !d.is_verified
                  ? '完成上方的文件審核後，家屬就能找到並預約您。'
                  : '有新的預約時，我們會立刻通知您。先把未來兩週的空檔設定好，被預約的機會更高。'
              }
              action={
                <Button asChild size="lg" variant="secondary">
                  <Link to="/provider">回到工作台</Link>
                </Button>
              }
            />
          )}
        </TabsContent>
      </Tabs>
    </PageContainer>
  )
}
