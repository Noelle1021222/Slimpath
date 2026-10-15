import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'motion/react'
import { RouterProvider } from 'react-router'
import { toast } from 'sonner'
import { errorMessage, toAppError } from '@/lib/errors'
import { router } from './router'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: (count, error) => count < 2 && !['forbidden', 'unauthorized'].includes(toAppError(error).code ?? ''),
      refetchOnWindowFocus: true,
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      // background refetch failures should not shout; the first load shows inline errors
      if (query.state.data !== undefined) toast.error(errorMessage(error), { id: 'query-error' })
    },
  }),
  mutationCache: new MutationCache({}),
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <RouterProvider router={router} />
      </MotionConfig>
    </QueryClientProvider>
  )
}
