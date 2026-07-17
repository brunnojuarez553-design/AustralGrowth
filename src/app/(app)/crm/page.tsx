'use client'

import { useState } from 'react'
import { usePipeline } from '@/hooks/usePipeline'
import { useUpdateLeadStage } from '@/hooks/useLeads'
import { Topbar } from '@/components/layout/Topbar'
import { formatCurrency, STAGE_LABELS } from '@/lib/utils'
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

function LeadCard({ lead, onStageChange }: { lead: LeadWithRelations; onStageChange: (id: string, stage: string) => void }) {
  const colors = STAGE_COLORS[lead.stage] ?? STAGE_COLORS.DETECTED
  return (
    <div className={`bg-[var(--surface-2)] border rounded-[7px] p-[10px] mb-[7px] cursor-grab transition-all hover:bg-[var(--surface-3)] hover:-translate-y-[1px] ${
      lead.isHot ? 'border-[rgba(249,115,22,0.35)] shadow-[0_0_12px_rgba(249,115,22,0.12)]' : 'border-[var(--border)]'
    }`}>
      <div className="text-[12px] font-medium text-[var(--text)] mb-[3px]">{lead.companyName}</div>
      {lead.contactName && <div className="text-[11px] text-[var(--text-3)]">{lead.contactName}</div>}
      <div className="text-[11px] text-[var(--text-3)]">{lead.industry} · {lead.country}</div>
      {lead.estimatedValue && (
        <div className="text-[11.5px] font-semibold text-[var(--green)] font-mono mt-[5px]">
          {formatCurrency(lead.estimatedValue)}
        </div>
      )}
      <div className="flex items-center gap-[5px] mt-[6px]">
        <div className="w-[5px] h-[5px] rounded-full" style={{ background: lead.isHot ? '#F97316' : colors.border }} />
        <span className="text-[10.5px]" style={{ color: lead.isHot ? '#FDBA74' : 'var(--text-3)' }}>
          {lead.isHot ? 'Caliente 🔥' : (lead.probability ? `${lead.probability}%` : 'Nuevo')}
        </span>
        {lead.priority === 'URGENT' && <span className="ml-auto text-[9px] bg-[rgba(239,68,68,0.15)] text-[#FCA5A5] border border-[rgba(239,68,68,0.2)] rounded-full px-[5px] py-[1px]">URGENTE</span>}
      </div>
    </div>
  )
}

function PipelineCol({ column, onStageChange }: { column: PipelineColumn; onStageChange: (id: string, stage: string) => void }) {
  const colors = STAGE_COLORS[column.stage] ?? STAGE_COLORS.DETECTED
  return (
    <div className="min-w-[168px] w-[168px] shrink-0">
      <div className="flex items-center justify-between mb-3 pb-2" style={{ borderBottom: `2px solid ${colors.border}20` }}>
        <span className="text-[11px] font-semibold" style={{ color: colors.text }}>{column.label}</span>
        <span className="text-[10px] font-mono text-[var(--text-3)]">{column.leads.length}</span>
      </div>
      <div className="min-h-[200px]">
        {column.leads.map(lead => (
          <LeadCard key={lead.id} lead={lead} onStageChange={onStageChange} />
        ))}
        {column.leads.length === 0 && (
          <div className="border-2 border-dashed border-[var(--border)] rounded-[7px] h-[80px] flex items-center justify-center">
            <span className="text-[11px] text-[var(--text-3)]">Sin leads</span>
          </div>
        )}
      </div>
      {column.totalValue > 0 && (
        <div className="mt-2 text-[10.5px] text-[var(--text-3)] font-mono">
          Total: {formatCurrency(column.totalValue)}
        </div>
      )}
    </div>
  )
}

export default function CRMPage() {
  const { data: pipeline, isLoading } = usePipeline()
  const updateStage = useUpdateLeadStage()

  if (isLoading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-[var(--text-3)] text-[13px]">Cargando pipeline...</div>
    </div>
  )

  const columns = pipeline?.columns ?? []
  const summary = pipeline?.summary ?? {}

  return (
    <>
      <Topbar title="CRM Pipeline" subtitle={`${summary.totalLeads ?? 24} leads activos · Vista Kanban`} primaryAction={{ label: 'Nuevo lead', onClick: () => {} }} />
      <div className="flex-1 overflow-hidden flex flex-col p-5 gap-4">
        {/* Summary */}
        <div className="grid grid-cols-4 gap-3 shrink-0">
          {[
            { label: 'Valor en pipeline', value: formatCurrency(summary.totalPipelineValue ?? 14280) },
            { label: 'Leads calientes', value: String(summary.hotLeads ?? 6) },
            { label: 'Ticket promedio', value: formatCurrency(summary.avgTicket ?? 595) },
            { label: 'Tiempo prom. cierre', value: '18 días' },
          ].map((s, i) => (
            <div key={i} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-[8px] p-3">
              <div className="text-[10.5px] text-[var(--text-3)] mb-1">{s.label}</div>
              <div className="text-[16px] font-bold text-[var(--text)] font-mono">{s.value}</div>
            </div>
          ))}
        </div>
        {/* Kanban */}
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-[10px] h-full pb-2" style={{ minWidth: 'max-content' }}>
            {columns.map(col => (
              <PipelineCol key={col.stage} column={col} onStageChange={(id, stage) => updateStage.mutate({ id, stage })} />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
