// =============================================================================
// HOOKS — React Query hooks para todos los módulos
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { LeadWithRelations } from '@/types'

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? 'Request failed')
  }
  return res.json()
}

// LEADS
export function useLeads(filters?: {
  stage?: string
  priority?: string
  industry?: string
  search?: string
  isHot?: boolean
}) {
  const params = new URLSearchParams()
  if (filters?.stage) params.set('stage', filters.stage)
  if (filters?.priority) params.set('priority', filters.priority)
  if (filters?.industry) params.set('industry', filters.industry)
  if (filters?.search) params.set('search', filters.search)
  if (filters?.isHot) params.set('isHot', 'true')

  return useQuery({
    queryKey: ['leads', filters],
    queryFn: () => fetchJSON<{ data: LeadWithRelations[]; total: number }>(`/api/leads?${params}`),
    staleTime: 30_000,
  })
}

export function useCreateLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<LeadWithRelations>) =>
      fetchJSON('/api/leads', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  })
}

export function useUpdateLeadStage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) =>
      fetchJSON(`/api/pipeline/${id}/stage`, { method: 'PATCH', body: JSON.stringify({ stage }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] })
      qc.invalidateQueries({ queryKey: ['pipeline'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
