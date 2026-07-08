import { useQuery } from '@tanstack/react-query'
import type { DashboardMetrics } from '@/types'

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard')
      if (!res.ok) throw new Error('Failed to fetch dashboard')
      const { data } = await res.json()
      return data as DashboardMetrics
    },
    staleTime: 300_000, // 5 min
    refetchInterval: 300_000,
  })
}
