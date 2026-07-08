import { useQuery } from '@tanstack/react-query'
import type { PipelineColumn } from '@/types'

export function usePipeline() {
  return useQuery({
    queryKey: ['pipeline'],
    queryFn: async () => {
      const res = await fetch('/api/pipeline')
      if (!res.ok) throw new Error('Failed to fetch pipeline')
      const { data } = await res.json()
      return data as { columns: PipelineColumn[]; summary: Record<string, number> }
    },
    staleTime: 15_000,
    refetchInterval: 60_000,
  })
}
