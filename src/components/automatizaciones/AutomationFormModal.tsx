'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal, Field, Input, Select, Textarea } from '@/components/ui/Modal'

interface Props {
  open: boolean
  onClose: () => void
}

const TRIGGER_OPTIONS = [
  { value: 'LEAD_STAGE_CHANGED', label: 'Un lead cambia de etapa' },
  { value: 'LEAD_CREATED', label: 'Se crea un lead nuevo' },
  { value: 'NO_CONTACT_DAYS', label: 'Sin contacto por X días' },
  { value: 'PROPOSAL_SENT', label: 'Se envía una propuesta' },
  { value: 'PROPOSAL_VIEWED', label: 'Se ve una propuesta' },
  { value: 'PROPOSAL_ACCEPTED', label: 'Se acepta una propuesta' },
  { value: 'TASK_OVERDUE', label: 'Una tarea vence' },
  { value: 'DEAL_WON', label: 'Se gana un negocio' },
  { value: 'DEAL_LOST', label: 'Se pierde un negocio' },
]

async function toJSONOrThrow(res: Response) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    if (err.details) {
      const fields = err.details.map((d: { path: string[]; message: string }) => `${d.path.join('.')}: ${d.message}`).join(' · ')
      throw new Error(`${err.error} (${fields})`)
    }
    throw new Error(err.debug ? `${err.error}: ${err.debug}` : (err.error ?? `Error ${res.status}`))
  }
  return res.json()
}

export function AutomationFormModal({ open, onClose }: Props) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ name: '', description: '', trigger: 'LEAD_STAGE_CHANGED', actionMessage: '', isActive: true })

  const create = useMutation({
    mutationFn: async () => toJSONOrThrow(await fetch('/api/automations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        description: form.description || undefined,
        trigger: form.trigger,
        actions: { type: 'notify', message: form.actionMessage || undefined },
        isActive: form.isActive,
      }),
    })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automations'] })
      setForm({ name: '', description: '', trigger: 'LEAD_STAGE_CHANGED', actionMessage: '', isActive: true })
      onClose()
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    create.mutate()
  }

  const errorMsg = (create.error as Error)?.message

  return (
    <Modal open={open} onClose={onClose} title="Nueva automatización" subtitle="Definí qué evento la dispara y qué debería pasar">
      <form onSubmit={handleSubmit} className="space-y-3">
        {errorMsg && (
          <div className="text-[12px] rounded-[7px] px-3 py-2" style={{ background: 'rgba(239,68,68,0.1)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.2)' }}>
            {errorMsg}
          </div>
        )}
        <Field label="Nombre *">
          <Input required placeholder="Ej: Avisar cuando un lead se enfría" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </Field>
        <Field label="Descripción">
          <Textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </Field>
        <Field label="Se dispara cuando...">
          <Select value={form.trigger} onChange={e => setForm(f => ({ ...f, trigger: e.target.value }))}>
            {TRIGGER_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
        </Field>
        <Field label="¿Qué querés que pase?">
          <Textarea rows={2} placeholder="Ej: Notificarme por WhatsApp para hacer seguimiento" value={form.actionMessage} onChange={e => setForm(f => ({ ...f, actionMessage: e.target.value }))} />
        </Field>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 accent-[var(--accent)]" />
          <span className="text-[12px]" style={{ color: 'var(--text-2)' }}>Activarla ahora</span>
        </label>

        <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <button type="button" onClick={onClose} className="px-3.5 py-1.5 rounded-[7px] text-[12.5px] font-medium border" style={{ borderColor: 'var(--border-2)', color: 'var(--text-2)' }}>
            Cancelar
          </button>
          <button type="submit" disabled={create.isPending} className="px-3.5 py-1.5 rounded-[7px] text-[12.5px] font-medium text-white disabled:opacity-50" style={{ background: 'var(--accent)' }}>
            {create.isPending ? 'Creando...' : 'Crear automatización'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
