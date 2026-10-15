import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { errorMessage } from '@/lib/errors'
import { providerService } from '@/services'
import type { ProviderDetails, ProviderSettingsInput } from '@/types'
import { qk } from './queries'

/** Optimistic provider settings update (online switch, rate, services…). */
export function useUpdateProvider(successMessage?: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (patch: ProviderSettingsInput) => providerService.updateMine(patch),
    onMutate: async (patch) => {
      await client.cancelQueries({ queryKey: qk.myProvider })
      const previous = client.getQueryData<ProviderDetails | null>(qk.myProvider)
      if (previous) client.setQueryData(qk.myProvider, { ...previous, ...patch })
      return { previous }
    },
    onError: (e, _patch, ctx) => {
      if (ctx?.previous) client.setQueryData(qk.myProvider, ctx.previous)
      toast.error(errorMessage(e))
    },
    onSuccess: (data) => {
      client.setQueryData(qk.myProvider, data)
      if (successMessage) toast.success(successMessage)
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey: qk.stats })
      void client.invalidateQueries({ queryKey: ['provider'] })
      void client.invalidateQueries({ queryKey: qk.requests })
    },
  })
}
