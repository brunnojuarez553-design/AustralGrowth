'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Topbar } from '@/components/layout/Topbar'
import { formatRelativeTime } from '@/lib/utils'

interface Automation {
  id: string
  name: string
  description: string | null
  isActive: boolean
  trigger: string
  runCount: number
  lastRunAt: string | null
}

const TRIGGER_LABELS: Record<string, string> = {
  LEAD_STAGE_CHANGED: 'Lead cambia de etapa',
  LEAD_CREATED: 'Nuevo lead creado',
  NO_CONTACT_DAYS: 'Sin contacto por X días',
  PROPOSAL_SENT: 'Propuesta enviada',
  PROPOSAL_VIEWED: 'Propuesta vista',
  PROPOSAL_ACCEPTED: 'Propuesta aceptada',
  TASK_OVERDUE: 'Tarea vencida',
  DEAL_WON: 'Negocio ganado',
  DEAL_LOST: 'Negocio perdido',
}

export default function AutomatizacionesPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['automations'],
    queryFn: async () => {
      const res = await fetch('/api/automations')
      const json = await res.json()
      return json.data as Automation[]
    },
    staleTime: 30_000,
  })

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      fetch(`/api/automations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automations'] }),
  })

  const automations = data ?? []
  const activeCount = automations.filter(a => a.isActive).length
  const totalRuns = automations.reduce((sum, a) => sum + a.runCount, 0)

  return (
    <>
      <Topbar
        title="Automatizaciones"
        subtitle={`${activeCount} de ${automations.length} activas · ${totalRuns} ejecuciones totales`}
        primaryAction={{ label: 'Nueva automatización', onClick: () => {} }}
      />
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {isLoading && (
          <div className="text-center py-8 text-[12.5px] text-[var(--text-3)]">Cargando automatizaciones...</div>
        )}

        {!isLoading && automations.length === 0 && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[10px] px-4 py-8 text-center text-[12.5px] text-[var(--text-3)]">
            Todavía no configuraste ninguna automatización. Se disparan solas cuando pasa algo en tu pipeline
            (por ejemplo: mover un lead a "Ganado", o que una propuesta sea vista).
          </div>
        )}

        {automations.map(a => (
          <div key={a.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-[10px] p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[13px] font-semibold text-[var(--text)]">{a.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(249,115,22,0.15)] text-[#FDBA74] font-medium">
                  {TRIGGER_LABELS[a.trigger] ?? a.trigger}
                </span>
              </div>
              {a.description && <div className="text-[11.5px] text-[var(--text-3)] mb-1">{a.description}</div>}
              <div className="text-[10.5px] text-[var(--text-3)]">
                {a.runCount} ejecuciones{a.lastRunAt ? ` · última vez ${formatRelativeTime(a.lastRunAt)}` : ' · nunca se ejecutó'}
              </div>
            </div>
            <button
              onClick={() => toggleActive.mutate({ id: a.id, isActive: !a.isActive })}
              className={`relative w-9 h-5 rounded-full transition-all flex-shrink-0 ${a.isActive ? 'bg-[var(--accent)]' : 'bg-[var(--surface-3)]'}`}
              aria-label={a.isActive ? 'Desactivar' : 'Activar'}
            >
              <span
                className="absolute top-[2px] w-4 h-4 rounded-full bg-white transition-all"
                style={{ left: a.isActive ? '18px' : '2px' }}
              />
            </button>
          </div>
        ))}
      </div>
    </>
  )
}
