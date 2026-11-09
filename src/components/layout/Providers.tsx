'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'
import { MotionConfig } from 'framer-motion'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
        staleTime: 30_000,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
