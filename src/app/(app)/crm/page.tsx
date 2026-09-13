'use client'

import { useState } from 'react'
import { usePipeline } from '@/hooks/usePipeline'
import { useUpdateLeadStage } from '@/hooks/useLeads'
import { Topbar } from '@/components/layout/Topbar'
import { LeadFormModal } from '@/components/crm/LeadFormModal'
import { formatCurrency } from '@/lib/utils'
import type { LeadWithRelations, PipelineColumn } from '@/types'

const STAGE_COLORS: Record<string, { border: string; text: string }> = {
  DETECTED:    { border: '#475569', text: '#94A3B8' },
  CONTACTED:   { border: '#3B82F6', text: '#93C5FD' },
  REPLIED:     { border: '#22C55E', text: '#86EFAC' },
  MEETING:     { border: '#8B5CF6', text: '#C4B5FD' },
  DEMO:        { border: '#A855F7', text: '#D8B4FE' },
  PROPOSAL:    { border: '#F59E0B', text: '#FDE68A' },
  NEGOTIATION: { border: '#10B981', text: '#6EE7B7' },
  WON:         { border: '#059669', text: '#6EE7B7' },
  LOST:        { border: '#EF4444', text: '#FCA5A5' },
}

function LeadCard({ lead, onOpen, onDragStart }: {
  lead: LeadWithRelations
  onOpen: () => void
  onDragStart: (e: React.DragEvent, lead: LeadWithRelations) => void
}) {
  const colors = STAGE_COLORS[lead.stage] ?? STAGE_COLORS.DETECTED
  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, lead)}
      onClick={onOpen}
      className={`future-lead group/card border p-4 mb-3 cursor-pointer transition-all active:cursor-grabbing ${
        lead.isHot ? 'border-[rgba(249,115,22,0.35)] shadow-[0_0_12px_rgba(249,115,22,0.12)]' : 'border-[var(--border)]'
      }`}
    >
      <div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="truncate text-[12px] font-semibold text-white">{lead.companyName}</div>{lead.contactName && <div className="mt-1 truncate text-[10px] text-zinc-600">{lead.contactName}</div>}</div><i className="ti ti-grip-vertical text-[14px] text-zinc-700 opacity-0 transition group-hover/card:opacity-100" /></div>
      <div className="mt-3 flex flex-wrap gap-1.5"><span className="rounded-full bg-white/[.04] px-2 py-1 text-[8.5px] text-zinc-500">{lead.industry || 'Sin rubro'}</span><span className="rounded-full bg-white/[.04] px-2 py-1 text-[8.5px] text-zinc-500">{lead.country || 'Sin ubicación'}</span></div>
      {lead.estimatedValue && (
        <div className="mt-4 font-mono text-[13px] font-semibold text-emerald-300">
          {formatCurrency(lead.estimatedValue)}
        </div>
      )}
      <div className="flex items-center gap-[6px] mt-3 border-t border-white/[.045] pt-3">
        <div className="w-[5px] h-[5px] rounded-full" style={{ background: lead.isHot ? 'var(--accent)' : colors.border }} />
        <span className="text-[10.5px]" style={{ color: lead.isHot ? '#FDBA74' : 'var(--text-3)' }}>
          {lead.isHot ? 'Caliente 🔥' : (lead.probability ? `${lead.probability}%` : 'Nuevo')}
        </span>
        {lead.priority === 'URGENT' && <span className="ml-auto text-[9px] bg-[rgba(239,68,68,0.15)] text-[#FCA5A5] border border-[rgba(239,68,68,0.2)] rounded-full px-[5px] py-[1px]">URGENTE</span>}
      </div>
    </div>
  )
}

function PipelineCol({ column, onOpenLead, onDragStart, onDrop }: {
  column: PipelineColumn
  onOpenLead: (lead: LeadWithRelations) => void
  onDragStart: (e: React.DragEvent, lead: LeadWithRelations) => void
  onDrop: (stage: string) => void
}) {
  const [isOver, setIsOver] = useState(false)
  const colors = STAGE_COLORS[column.stage] ?? STAGE_COLORS.DETECTED

  return (
    <div
      className={`future-board min-w-[250px] w-[250px] shrink-0 transition-all ${isOver ? 'border-cyan-300/25 bg-cyan-300/[.045]' : ''}`}
      onDragOver={e => { e.preventDefault(); setIsOver(true) }}
      onDragLeave={() => setIsOver(false)}
      onDrop={e => { e.preventDefault(); setIsOver(false); onDrop(column.stage) }}
    >
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[.055]">
        <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.1em]" style={{ color: colors.text }}><i className="h-1.5 w-1.5 rounded-full shadow-[0_0_10px_currentColor]" style={{background:colors.border}} />{column.label}</span>
        <span className="grid h-6 min-w-6 place-items-center rounded-full bg-white/[.05] px-1.5 text-[9px] font-mono text-zinc-500">{column.leads.length}</span>
      </div>
      <div className="min-h-[250px]">
        {column.leads.map(lead => (
          <LeadCard key={lead.id} lead={lead} onOpen={() => onOpenLead(lead)} onDragStart={onDragStart} />
        ))}
        {column.leads.length === 0 && (
          <div className="border-2 border-dashed border-[var(--border)] rounded-[14px] h-[80px] flex items-center justify-center">
            <span className="text-[11px] text-[var(--text-3)]">Sin leads</span>
          </div>
        )}
      </div>
      {column.totalValue > 0 && (
        <div className="mt-4 flex items-center justify-between border-t border-white/[.05] pt-3 text-[9px] uppercase tracking-wider text-zinc-600">
          <span>Valor etapa</span><strong className="font-mono text-[10px] text-zinc-400">{formatCurrency(column.totalValue)}</strong>
        </div>
      )}
    </div>
  )
}

export default function CRMPage() {
  const { data: pipeline, isLoading } = usePipeline()
  const updateStage = useUpdateLeadStage()
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<LeadWithRelations | null>(null)
  const [draggingLead, setDraggingLead] = useState<LeadWithRelations | null>(null)

  function openEdit(lead: LeadWithRelations) {
    setSelectedLead(lead)
    setModalOpen(true)
  }

  function openCreate() {
    setSelectedLead(null)
    setModalOpen(true)
  }

  function handleDragStart(e: React.DragEvent, lead: LeadWithRelations) {
    setDraggingLead(lead)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDrop(stage: string) {
    if (draggingLead && draggingLead.stage !== stage) {
      updateStage.mutate({ id: draggingLead.id, stage })
    }
    setDraggingLead(null)
  }

  if (isLoading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-[var(--text-3)] text-[13px]">Cargando pipeline...</div>
    </div>
  )

  const columns = pipeline?.columns ?? []
  const summary = pipeline?.summary ?? {}

  return (
    <>
      <Topbar title="CRM Pipeline" subtitle={`${summary.totalLeads ?? 0} leads activos · Arrastrá para cambiar de etapa`} primaryAction={{ label: 'Nuevo lead', onClick: openCreate }} />
      <div className="future-canvas flex-1 overflow-hidden flex flex-col p-4 md:p-7 gap-5">
        <div className="flex shrink-0 flex-col justify-between gap-3 md:flex-row md:items-end">
          <div><div className="future-status"><span />Pipeline live</div><h1 className="mt-3 text-[28px] font-semibold tracking-[-.055em] text-white md:text-[40px]">Control comercial</h1><p className="mt-2 text-[11px] text-zinc-600">Mové oportunidades, priorizá contactos y controlá el valor de cada etapa.</p></div>
          <div className="hidden items-center gap-2 rounded-full border border-white/[.065] bg-white/[.03] px-3 py-2 text-[9px] text-zinc-600 md:flex"><i className="ti ti-arrows-move" />Arrastrá las tarjetas para avanzar</div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
          {[
            { label: 'Valor en pipeline', value: formatCurrency(summary.totalPipelineValue ?? 0), icon:'ti-wave-sine', color:'#22d3ee' },
            { label: 'Leads calientes', value: String(summary.hotLeads ?? 0), icon:'ti-flame', color:'#ff7a1a' },
            { label: 'Ticket promedio', value: formatCurrency(summary.avgTicket ?? 0), icon:'ti-diamond', color:'#a78bfa' },
            { label: 'Total de leads', value: String(summary.totalLeads ?? 0), icon:'ti-users-group', color:'#34d399' },
          ].map((s, i) => (
            <div key={i} className="future-panel future-kpi group">
              <div className="flex items-start justify-between"><div><div className="future-label">{s.label}</div><div className="mt-3 text-[24px] font-semibold tracking-[-.05em] text-white font-mono">{s.value}</div></div><div className="grid h-9 w-9 place-items-center rounded-xl bg-white/[.045]" style={{color:s.color}}><i className={`ti ${s.icon} text-[16px]`} /></div></div>
              <div className="mt-5 h-px overflow-hidden bg-white/[.045]"><div className="metric-beam h-full w-3/4" style={{background:s.color}} /></div>
            </div>
          ))}
        </div>
        <div className="pipeline-shell flex-1 overflow-x-auto">
          <div className="flex gap-3 min-h-full p-2" style={{ minWidth: 'max-content' }}>
            {columns.map(col => (
              <PipelineCol key={col.stage} column={col} onOpenLead={openEdit} onDragStart={handleDragStart} onDrop={handleDrop} />
            ))}
          </div>
        </div>
      </div>

      <LeadFormModal open={modalOpen} onClose={() => setModalOpen(false)} lead={selectedLead} />
    </>
  )
}
