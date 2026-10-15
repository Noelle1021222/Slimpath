import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import type { SearchFilters, UserRole } from '@/types'
import { addDays, todayISO } from '@/lib/time'
import { careLogService, chatService, healthService, kinshipService, notificationService, orderService, providerService } from '@/services'
import { useUserStore } from '@/store/useUserStore'

export const qk = {
  kinship: ['kinship'] as const,
  health: (recipientId: number | null) => ['health', recipientId] as const,
  providers: (f: SearchFilters) => ['providers', f] as const,
  provider: (id: string) => ['provider', id] as const,
  reviews: (id: string) => ['reviews', id] as const,
  booked: (id: string) => ['booked', id] as const,
  orders: (role: UserRole) => ['orders', role] as const,
  order: (id: string) => ['order', id] as const,
  requests: ['requests'] as const,
  careLogs: ['careLogs'] as const,
  photos: (paths: string[]) => ['photos', ...paths] as const,
  conversations: ['conversations'] as const,
  thread: (partnerId: string) => ['thread', partnerId] as const,
  notifications: ['notifications'] as const,
  myProvider: ['myProvider'] as const,
  stats: ['stats'] as const,
  withdrawals: ['withdrawals'] as const,
  documents: ['documents'] as const,
  contact: (orderId: string) => ['contact', orderId] as const,
}

/** Invalidate several query families at once. */
export function useInvalidate() {
  const client = useQueryClient()
  return (...keys: QueryKey[]) => Promise.all(keys.map((queryKey) => client.invalidateQueries({ queryKey })))
}

const useUid = () => useUserStore((s) => s.user?.id ?? null)

export function useKinship() {
  const uid = useUid()
  return useQuery({ queryKey: qk.kinship, queryFn: () => kinshipService.list(), enabled: !!uid })
}

export function useHealthLogs(recipientId: number | null, enabled = true) {
  const uid = useUid()
  return useQuery({ queryKey: qk.health(recipientId), queryFn: () => healthService.list(recipientId, 14), enabled: !!uid && enabled })
}

export function useProviderSearch(filters: SearchFilters) {
  return useQuery({
    queryKey: qk.providers(filters),
    queryFn: () => providerService.search(filters),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
}

export function useProviderPublic(id: string | undefined) {
  return useQuery({ queryKey: qk.provider(id ?? ''), queryFn: () => providerService.getPublic(id!), enabled: !!id })
}

export function useProviderReviews(id: string | undefined) {
  return useQuery({ queryKey: qk.reviews(id ?? ''), queryFn: () => providerService.reviews(id!), enabled: !!id })
}

export function useBookedSlots(id: string | undefined, days = 14) {
  return useQuery({
    queryKey: qk.booked(id ?? ''),
    queryFn: () => providerService.bookedSlots(id!, todayISO(), addDays(todayISO(), days)),
    enabled: !!id,
    refetchInterval: 60_000,
  })
}

export function useMyOrders(role: UserRole) {
  const uid = useUid()
  return useQuery({ queryKey: qk.orders(role), queryFn: () => orderService.listMine(role), enabled: !!uid })
}

export function useOrder(id: string | null | undefined) {
  return useQuery({ queryKey: qk.order(id ?? ''), queryFn: () => orderService.get(id!), enabled: !!id })
}

export function useProviderRequests(enabled = true) {
  const uid = useUid()
  return useQuery({ queryKey: qk.requests, queryFn: () => orderService.requests(), refetchInterval: 30_000, enabled: enabled && !!uid })
}

export function useCareLogs() {
  const uid = useUid()
  return useQuery({ queryKey: qk.careLogs, queryFn: () => careLogService.list(), enabled: !!uid })
}

export function usePhotoUrls(paths: string[]) {
  return useQuery({
    queryKey: qk.photos(paths),
    queryFn: () => careLogService.photoUrls(paths),
    enabled: paths.length > 0,
    staleTime: 50 * 60_000,
  })
}

export function useConversations() {
  const uid = useUid()
  return useQuery({ queryKey: qk.conversations, queryFn: () => chatService.conversations(), enabled: !!uid })
}

export function useNotifications() {
  const uid = useUid()
  return useQuery({ queryKey: qk.notifications, queryFn: () => notificationService.list(), enabled: !!uid })
}

export function useMyProvider() {
  const uid = useUid()
  return useQuery({ queryKey: qk.myProvider, queryFn: () => providerService.getMine(), enabled: !!uid })
}

export function useProviderStats() {
  return useQuery({ queryKey: qk.stats, queryFn: () => providerService.stats() })
}

export function useWithdrawals() {
  return useQuery({ queryKey: qk.withdrawals, queryFn: () => providerService.withdrawals() })
}

export function useDocuments() {
  return useQuery({ queryKey: qk.documents, queryFn: () => providerService.documents() })
}

export function useOrderContact(orderId: string | null | undefined) {
  return useQuery({ queryKey: qk.contact(orderId ?? ''), queryFn: () => orderService.contact(orderId!), enabled: !!orderId })
}

export function useMarkNotificationRead() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: number | 'all') => (id === 'all' ? notificationService.markAllRead() : notificationService.markRead(id)),
    onSuccess: () => invalidate(qk.notifications),
  })
}
