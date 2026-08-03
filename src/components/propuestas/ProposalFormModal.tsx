'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal, Field, Input, Select, Textarea } from '@/components/ui/Modal'

interface Props {
  open: boolean
  onClose: () => void
}

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

export function ProposalFormModal({ open, onClose }: Props) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ leadId: '', title: '', serviceType: '', description: '', amount: '', validUntil: '' })

  const { data: leads } = useQuery({
    queryKey: ['leads', 'for-proposal-select'],
    queryFn: async () => {
      const res = await fetch('/api/leads')
      const json = await toJSONOrThrow(res)
      return json.data as { id: string; companyName: string }[]
    },
    enabled: open,
    staleTime: 60_000,
  })

  const create = useMutation({
    mutationFn: async () => toJSONOrThrow(await fetch('/api/proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId: form.leadId,
        title: form.title,
        serviceType: form.serviceType,
        description: form.description || undefined,
        amount: parseFloat(form.amount),
        validUntil: form.validUntil ? new Date(form.validUntil).toISOString() : undefined,
      }),
    })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proposals'] })
      setForm({ leadId: '', title: '', serviceType: '', description: '', amount: '', validUntil: '' })
      onClose()
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.leadId || !form.title || !form.serviceType || !form.amount) return
    create.mutate()
  }

  const errorMsg = (create.error as Error)?.message

  return (
    <Modal open={open} onClose={onClose} title="Nueva propuesta" subtitle="Se vincula a un lead existente">
      <form onSubmit={handleSubmit} className="space-y-3">
        {errorMsg && (
          <div className="text-[12px] rounded-[7px] px-3 py-2" style={{ background: 'rgba(239,68,68,0.1)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.2)' }}>
            {errorMsg}
          </div>
        )}
        <Field label="Lead *">
          <Select required value={form.leadId} onChange={e => setForm(f => ({ ...f, leadId: e.target.value }))}>
            <option value="">Elegí un lead...</option>
            {(leads ?? []).map(l => <option key={l.id} value={l.id}>{l.companyName}</option>)}
          </Select>
        </Field>
        <Field label="Título de la propuesta *">
          <Input required placeholder="Ej: Sitio web premium + IA" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        </Field>
        <Field label="Tipo de servicio *">
          <Input required placeholder="Ej: Desarrollo web, SEO, Branding" value={form.serviceType} onChange={e => setForm(f => ({ ...f, serviceType: e.target.value }))} />
        </Field>
        <Field label="Descripción">
          <Textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Monto (USD) *">
            <Input required type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          </Field>
          <Field label="Válida hasta">
            <Input type="date" value={form.validUntil} onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))} />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <button type="button" onClick={onClose} className="px-3.5 py-1.5 rounded-[7px] text-[12.5px] font-medium border" style={{ borderColor: 'var(--border-2)', color: 'var(--text-2)' }}>
            Cancelar
          </button>
          <button type="submit" disabled={create.isPending} className="px-3.5 py-1.5 rounded-[7px] text-[12.5px] font-medium text-white disabled:opacity-50" style={{ background: 'var(--accent)' }}>
            {create.isPending ? 'Creando...' : 'Crear propuesta'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
