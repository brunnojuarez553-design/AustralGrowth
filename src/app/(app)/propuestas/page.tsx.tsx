'use client'

import { useQuery } from '@tanstack/react-query'
import { Topbar } from '@/components/layout/Topbar'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { ProposalWithRelations } from '@/types'

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  DRAFT:    { bg: 'rgba(100,116,139,0.15)', text: '#94A3B8', label: 'Borrador' },
  SENT:     { bg: 'rgba(59,130,246,0.15)',  text: '#93C5FD', label: 'Enviada' },
  VIEWED:   { bg: 'rgba(245,158,11,0.15)',  text: '#FCD34D', label: 'Vista' },
  ACCEPTED: { bg: 'rgba(16,185,129,0.15)',  text: '#6EE7B7', label: 'Aceptada' },
  REJECTED: { bg: 'rgba(239,68,68,0.15)',   text: '#FCA5A5', label: 'Rechazada' },
  EXPIRED:  { bg: 'rgba(100,116,139,0.15)', text: '#94A3B8', label: 'Expirada' },
}

export default function PropuestasPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['proposals'],
    queryFn: async () => {
      const res = await fetch('/api/proposals')
      const json = await res.json()
      return json.data as ProposalWithRelations[]
    },
    staleTime: 30_000,
  })

  const proposals = data ?? []
  const totalValue = proposals.reduce((sum, p) => sum + p.amount, 0)
  const accepted = proposals.filter(p => p.status === 'ACCEPTED')
  const pending = proposals.filter(p => p.status === 'SENT' || p.status === 'VIEWED')
  const acceptRate = proposals.length > 0 ? Math.round((accepted.length / proposals.length) * 100) : 0

  return (
    <>
      <Topbar
        title="Propuestas"
        subtitle={`${proposals.length} propuestas · ${formatCurrency(totalValue)} en total`}
        primaryAction={{ label: 'Nueva propuesta', onClick: () => {} }}
      />
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Valor total', value: formatCurrency(totalValue) },
            { label: 'Pendientes de respuesta', value: String(pending.length) },
            { label: 'Aceptadas', value: String(accepted.length) },
            { label: 'Tasa de aceptación', value: `${acceptRate}%` },
          ].map((s, i) => (
            <div key={i} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-[10px] p-4">
              <div className="text-[11px] text-[var(--text-3)] mb-[6px]">{s.label}</div>
              <div className="text-[20px] font-bold font-mono tracking-tight text-[var(--text)]">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[10px] overflow-hidden">
          <div className="grid grid-cols-[1fr_140px_110px_110px_110px] gap-3 px-4 py-2.5 border-b border-[var(--border)] text-[10.5px] font-semibold uppercase tracking-wide text-[var(--text-3)]">
            <span>Cliente / Propuesta</span>
            <span>Monto</span>
            <span>Estado</span>
            <span>Válida hasta</span>
            <span>Creada</span>
          </div>

          {isLoading && (
            <div className="px-4 py-8 text-center text-[12.5px] text-[var(--text-3)]">Cargando propuestas...</div>
          )}

          {!isLoading && proposals.length === 0 && (
            <div className="px-4 py-8 text-center text-[12.5px] text-[var(--text-3)]">
              Todavía no creaste ninguna propuesta.
            </div>
          )}

          {proposals.map(p => {
            const style = STATUS_STYLES[p.status] ?? STATUS_STYLES.DRAFT
            return (
              <div
                key={p.id}
                className="grid grid-cols-[1fr_140px_110px_110px_110px] gap-3 px-4 py-3 border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-3)] transition-all"
              >
                <div>
                  <div className="text-[12.5px] font-medium text-[var(--text)]">{p.lead?.companyName ?? '—'}</div>
                  <div className="text-[11px] text-[var(--text-3)]">{p.title}</div>
                </div>
                <div className="text-[12.5px] font-semibold font-mono text-[var(--green)] self-center">
                  {formatCurrency(p.amount, p.currency)}
                </div>
                <div className="self-center">
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium"
                    style={{ background: style.bg, color: style.text }}
                  >
                    {style.label}
                  </span>
                </div>
                <div className="text-[11.5px] text-[var(--text-3)] self-center">
                  {p.validUntil ? formatDate(p.validUntil) : '—'}
                </div>
                <div className="text-[11.5px] text-[var(--text-3)] self-center">
                  {formatDate(p.createdAt)}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
