'use client'

import { useState, useEffect } from 'react'
import { Modal, Field, Input, Select } from '@/components/ui/Modal'
import { useCreateLead, useUpdateLead, useDeleteLead } from '@/hooks/useLeads'
import type { LeadWithRelations } from '@/types'

const STAGE_OPTIONS = ['DETECTED', 'CONTACTED', 'REPLIED', 'MEETING', 'DEMO', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']
const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
const SOURCE_OPTIONS = ['MANUAL', 'INSTAGRAM', 'WHATSAPP', 'EMAIL', 'REFERRAL', 'COLD_OUTREACH', 'INBOUND', 'CSV_IMPORT', 'AI_DETECTED']
const SIZE_OPTIONS = ['SOLO', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE']

const emptyForm = {
  companyName: '', contactName: '', email: '', whatsapp: '', instagram: '', website: '',
  country: '', city: '', industry: '', companySize: '', source: 'MANUAL', stage: 'DETECTED',
  priority: 'MEDIUM', estimatedValue: '', probability: '', isHot: false,
}

interface Props {
  open: boolean
  onClose: () => void
  lead?: LeadWithRelations | null
}

export function LeadFormModal({ open, onClose, lead }: Props) {
  const [form, setForm] = useState(emptyForm)
  const createLead = useCreateLead()
  const updateLead = useUpdateLead()
  const deleteLead = useDeleteLead()
  const isEdit = Boolean(lead)

  useEffect(() => {
    if (lead) {
      setForm({
        companyName: lead.companyName ?? '',
        contactName: lead.contactName ?? '',
        email: lead.email ?? '',
        whatsapp: lead.whatsapp ?? '',
        instagram: lead.instagram ?? '',
        website: lead.website ?? '',
        country: lead.country ?? '',
        city: lead.city ?? '',
        industry: lead.industry ?? '',
        companySize: lead.companySize ?? '',
        source: lead.source ?? 'MANUAL',
        stage: lead.stage ?? 'DETECTED',
        priority: lead.priority ?? 'MEDIUM',
        estimatedValue: lead.estimatedValue?.toString() ?? '',
        probability: lead.probability?.toString() ?? '',
        isHot: lead.isHot ?? false,
      })
    } else {
      setForm(emptyForm)
    }
    createLead.reset()
    updateLead.reset()
  }, [lead, open]) // eslint-disable-line react-hooks/exhaustive-deps

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      ...form,
      companySize: form.companySize || undefined,
      estimatedValue: form.estimatedValue ? parseFloat(form.estimatedValue) : undefined,
      probability: form.probability ? parseFloat(form.probability) : undefined,
    }
    if (isEdit && lead) {
      updateLead.mutate({ id: lead.id, data: payload as never }, { onSuccess: onClose })
    } else {
      createLead.mutate(payload as never, { onSuccess: onClose })
    }
  }

  function handleDelete() {
    if (!lead) return
    if (!confirm(`¿Borrar "${lead.companyName}"? Esta acción no se puede deshacer.`)) return
    deleteLead.mutate(lead.id, { onSuccess: onClose })
  }

  const saving = createLead.isPending || updateLead.isPending
  const errorMsg = (createLead.error as Error)?.message || (updateLead.error as Error)?.message || (deleteLead.error as Error)?.message

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? lead!.companyName : 'Nuevo lead'}
      subtitle={isEdit ? 'Editar información del lead' : 'Cargar un prospecto nuevo'}
      width="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="text-[12px] rounded-[7px] px-3 py-2" style={{ background: 'rgba(239,68,68,0.1)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.2)' }}>
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Empresa *">
            <Input required value={form.companyName} onChange={e => set('companyName', e.target.value)} />
          </Field>
          <Field label="Contacto">
            <Input value={form.contactName} onChange={e => set('contactName', e.target.value)} />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} />
          </Field>
          <Field label="WhatsApp">
            <Input value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} />
          </Field>
          <Field label="Instagram">
            <Input value={form.instagram} onChange={e => set('instagram', e.target.value)} />
          </Field>
          <Field label="Sitio web">
            <Input value={form.website} onChange={e => set('website', e.target.value)} />
          </Field>
          <Field label="País">
            <Input value={form.country} onChange={e => set('country', e.target.value)} />
          </Field>
          <Field label="Ciudad">
            <Input value={form.city} onChange={e => set('city', e.target.value)} />
          </Field>
          <Field label="Rubro">
            <Input value={form.industry} onChange={e => set('industry', e.target.value)} />
          </Field>
          <Field label="Tamaño de empresa">
            <Select value={form.companySize} onChange={e => set('companySize', e.target.value)}>
              <option value="">—</option>
              {SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Origen">
            <Select value={form.source} onChange={e => set('source', e.target.value)}>
              {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Etapa">
            <Select value={form.stage} onChange={e => set('stage', e.target.value)}>
              {STAGE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Prioridad">
            <Select value={form.priority} onChange={e => set('priority', e.target.value)}>
              {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </Select>
          </Field>
          <Field label="Valor estimado (USD)">
            <Input type="number" min="0" step="1" value={form.estimatedValue} onChange={e => set('estimatedValue', e.target.value)} />
          </Field>
          <Field label="Probabilidad de cierre (%)">
            <Input type="number" min="0" max="100" step="1" value={form.probability} onChange={e => set('probability', e.target.value)} />
          </Field>
          <Field label="Lead caliente 🔥">
            <label className="flex items-center gap-2 h-[34px] cursor-pointer">
              <input type="checkbox" checked={form.isHot} onChange={e => set('isHot', e.target.checked)} className="w-4 h-4 accent-[var(--accent)]" />
              <span className="text-[12px]" style={{ color: 'var(--text-2)' }}>Marcar como prioritario</span>
            </label>
          </Field>
        </div>

        <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
          {isEdit ? (
            <button type="button" onClick={handleDelete} disabled={deleteLead.isPending} className="text-[12px] font-medium text-red-400 hover:text-red-300 transition-all disabled:opacity-50">
              {deleteLead.isPending ? 'Borrando...' : 'Borrar lead'}
            </button>
          ) : <span />}
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="px-3.5 py-1.5 rounded-[7px] text-[12.5px] font-medium border transition-all" style={{ borderColor: 'var(--border-2)', color: 'var(--text-2)' }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="px-3.5 py-1.5 rounded-[7px] text-[12.5px] font-medium text-white transition-all disabled:opacity-50" style={{ background: 'var(--accent)' }}>
              {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear lead'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
