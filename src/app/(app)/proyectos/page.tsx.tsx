'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Topbar } from '@/components/layout/Topbar'
import { formatDate } from '@/lib/utils'
import type { ProjectWithRelations } from '@/types'

const STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
  PLANNING:    { label: 'Planificación', bg: 'rgba(100,116,139,0.15)', text: '#94A3B8' },
  IN_PROGRESS: { label: 'En curso',      bg: 'rgba(59,130,246,0.15)',  text: '#93C5FD' },
  IN_REVIEW:   { label: 'En revisión',   bg: 'rgba(245,158,11,0.15)',  text: '#FCD34D' },
  COMPLETED:   { label: 'Completado',    bg: 'rgba(16,185,129,0.15)',  text: '#6EE7B7' },
  ON_HOLD:     { label: 'En pausa',      bg: 'rgba(139,92,246,0.15)',  text: '#C4B5FD' },
  CANCELLED:   { label: 'Cancelado',     bg: 'rgba(239,68,68,0.15)',   text: '#FCA5A5' },
}

const COLUMNS = ['PLANNING', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED'] as const

export default function ProyectosPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await fetch('/api/projects')
      const json = await res.json()
      return json.data as ProjectWithRelations[]
    },
    staleTime: 30_000,
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })

  const projects = data ?? []
  const active = projects.filter(p => p.status === 'IN_PROGRESS').length

  return (
    <>
      <Topbar
        title="Proyectos"
        subtitle={`${projects.length} proyectos · ${active} en curso`}
        primaryAction={{ label: 'Nuevo proyecto', onClick: () => {} }}
      />
      <div className="flex-1 overflow-hidden flex flex-col p-5 gap-4">
        {isLoading && (
          <div className="flex-1 flex items-center justify-center text-[13px] text-[var(--text-3)]">
            Cargando proyectos...
          </div>
        )}

        {!isLoading && (
          <div className="flex-1 overflow-x-auto">
            <div className="grid grid-cols-4 gap-3 h-full" style={{ minWidth: '900px' }}>
              {COLUMNS.map(status => {
                const meta = STATUS_META[status]
                const items = projects.filter(p => p.status === status)
                return (
                  <div key={status} className="flex flex-col">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--border)]">
                      <span className="text-[11.5px] font-semibold" style={{ color: meta.text }}>{meta.label}</span>
                      <span className="text-[10px] font-mono text-[var(--text-3)]">{items.length}</span>
                    </div>
                    <div className="space-y-2 flex-1">
                      {items.map(project => (
                        <div key={project.id} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-[8px] p-3">
                          <div className="text-[12.5px] font-medium text-[var(--text)] mb-1">{project.name}</div>
                          {project.lead?.companyName && (
                            <div className="text-[11px] text-[var(--text-3)] mb-2">{project.lead.companyName}</div>
                          )}
                          {project.dueDate && (
                            <div className="text-[10.5px] text-[var(--text-3)] mb-2">Entrega: {formatDate(project.dueDate)}</div>
                          )}
                          <select
                            value={project.status}
                            onChange={e => updateStatus.mutate({ id: project.id, status: e.target.value })}
                            className="w-full bg-[var(--surface-3)] border border-[var(--border-2)] rounded-[6px] px-2 py-1 text-[11px] text-[var(--text-2)] outline-none"
                          >
                            {Object.entries(STATUS_META).map(([value, m]) => (
                              <option key={value} value={value}>{m.label}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                      {items.length === 0 && (
                        <div className="border-2 border-dashed border-[var(--border)] rounded-[8px] h-[70px] flex items-center justify-center">
                          <span className="text-[11px] text-[var(--text-3)]">Sin proyectos</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
