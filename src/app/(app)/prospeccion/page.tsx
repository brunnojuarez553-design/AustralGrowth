'use client'

import { useState } from 'react'
import { useLeads, useCreateLead } from '@/hooks/useLeads'
import { Topbar } from '@/components/layout/Topbar'
import { formatRelativeTime } from '@/lib/utils'

const SOURCE_LABELS: Record<string, string> = {
  MANUAL: 'Manual', INSTAGRAM: 'Instagram', WHATSAPP: 'WhatsApp', EMAIL: 'Email',
  REFERRAL: 'Referido', COLD_OUTREACH: 'Outreach en frío', INBOUND: 'Inbound',
  CSV_IMPORT: 'Importado', AI_DETECTED: 'Detectado por IA',
}

export default function ProspeccionPage() {
  const { data, isLoading } = useLeads({ stage: 'DETECTED' })
  const createLead = useCreateLead()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ companyName: '', contactName: '', whatsapp: '', industry: '', country: '', source: 'MANUAL' })

  const leads = data?.data ?? []

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.companyName.trim()) return
    createLead.mutate(
      { ...form, stage: 'DETECTED' } as never,
      { onSuccess: () => { setForm({ companyName: '', contactName: '', whatsapp: '', industry: '', country: '', source: 'MANUAL' }); setShowForm(false) } }
    )
  }

  return (
    <>
      <Topbar
        title="Prospección"
        subtitle={`${leads.length} leads recién detectados, sin contactar todavía`}
        primaryAction={{ label: showForm ? 'Cancelar' : 'Nuevo lead', onClick: () => setShowForm(v => !v) }}
      />
      <div className="future-canvas flex-1 overflow-y-auto p-4 md:p-7 space-y-5">
        {showForm && (
          <form onSubmit={handleSubmit} className="future-panel p-5 md:p-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input required placeholder="Empresa *" value={form.companyName}
              onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
              className="bg-[var(--surface-2)] border border-[var(--border-2)] rounded-[14px] px-3 py-2 text-[12.5px] text-[var(--text)] outline-none focus:border-[var(--accent)]" />
            <input placeholder="Contacto" value={form.contactName}
              onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
              className="bg-[var(--surface-2)] border border-[var(--border-2)] rounded-[14px] px-3 py-2 text-[12.5px] text-[var(--text)] outline-none focus:border-[var(--accent)]" />
            <input placeholder="WhatsApp" value={form.whatsapp}
              onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
              className="bg-[var(--surface-2)] border border-[var(--border-2)] rounded-[14px] px-3 py-2 text-[12.5px] text-[var(--text)] outline-none focus:border-[var(--accent)]" />
            <input placeholder="Rubro" value={form.industry}
              onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
              className="bg-[var(--surface-2)] border border-[var(--border-2)] rounded-[14px] px-3 py-2 text-[12.5px] text-[var(--text)] outline-none focus:border-[var(--accent)]" />
            <input placeholder="País" value={form.country}
              onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
              className="bg-[var(--surface-2)] border border-[var(--border-2)] rounded-[14px] px-3 py-2 text-[12.5px] text-[var(--text)] outline-none focus:border-[var(--accent)]" />
            <button type="submit" disabled={createLead.isPending}
              className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-[14px] text-[12.5px] font-medium px-3 py-2 transition-all disabled:opacity-50">
              {createLead.isPending ? 'Guardando...' : 'Agregar lead'}
            </button>
          </form>
        )}

        <div className="future-panel overflow-x-auto">
          <div className="min-w-[560px]">
          <div className="grid grid-cols-[1fr_140px_140px_120px] gap-3 px-4 py-2.5 border-b border-[var(--border)] text-[10.5px] font-semibold uppercase tracking-wide text-[var(--text-3)]">
            <span>Empresa / Contacto</span>
            <span>Origen</span>
            <span>Ubicación</span>
            <span>Detectado</span>
          </div>

          {isLoading && (
            <div className="px-4 py-8 text-center text-[12.5px] text-[var(--text-3)]">Cargando prospectos...</div>
          )}

          {!isLoading && leads.length === 0 && (
            <div className="px-4 py-8 text-center text-[12.5px] text-[var(--text-3)]">
              No hay leads nuevos por contactar. Agregá uno con el botón de arriba.
            </div>
          )}

          {leads.map(lead => (
            <div key={lead.id} className="grid grid-cols-[1fr_140px_140px_120px] gap-3 px-5 py-4 border-b border-[var(--border)] last:border-0 hover:bg-cyan-300/[.025] transition-all">
              <div>
                <div className="text-[12.5px] font-medium text-[var(--text)]">{lead.companyName}</div>
                {lead.contactName && <div className="text-[11px] text-[var(--text-3)]">{lead.contactName}</div>}
              </div>
              <div className="text-[11.5px] text-[var(--text-3)] self-center">{SOURCE_LABELS[lead.source] ?? lead.source}</div>
              <div className="text-[11.5px] text-[var(--text-3)] self-center">{[lead.city, lead.country].filter(Boolean).join(', ') || '—'}</div>
              <div className="text-[11.5px] text-[var(--text-3)] self-center">{formatRelativeTime(lead.createdAt)}</div>
            </div>
          ))}
          </div>
        </div>
      </div>
    </>
  )
}
