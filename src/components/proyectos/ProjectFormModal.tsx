'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal, Field, Input, Select, Textarea } from '@/components/ui/Modal'

interface Props {
  open: boolean
  onClose: () => void
}

const STATUS_OPTIONS = [
  { value: 'PLANNING', label: 'Planificación' },
  { value: 'IN_PROGRESS', label: 'En curso' },
  { value: 'IN_REVIEW', label: 'En revisión' },
  { value: 'ON_HOLD', label: 'En pausa' },
]

async function toJSONOrThrow(res: Response) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? `Error ${res.status}`)
  }
  return res.json()
}

export function ProjectFormModal({ open, onClose }: Props) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ name: '', description: '', status: 'PLANNING', leadId: '', dueDate: '' })

  const { data: leads } = useQuery({
    queryKey: ['leads', 'for-project-select'],
    queryFn: async () => {
      const res = await fetch('/api/leads')
      const json = await toJSONOrThrow(res)
      return json.data as { id: string; companyName: string }[]
    },
    enabled: open,
    staleTime: 60_000,
  })

  const create = useMutation({
    mutationFn: async () => toJSONOrThrow(await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        description: form.description || undefined,
        status: form.status,
        leadId: form.leadId || undefined,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
      }),
    })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      setForm({ name: '', description: '', status: 'PLANNING', leadId: '', dueDate: '' })
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
    <Modal open={open} onClose={onClose} title="Nuevo proyecto" subtitle="Se crea a partir de un lead ganado o desde cero">
      <form onSubmit={handleSubmit} className="space-y-3">
        {errorMsg && (
          <div className="text-[12px] rounded-[7px] px-3 py-2" style={{ background: 'rgba(239,68,68,0.1)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.2)' }}>
            {errorMsg}
          </div>
        )}
        <Field label="Nombre *">
          <Input required placeholder="Ej: Sitio web Roco4WD" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </Field>
        <Field label="Descripción">
          <Textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Vincular a un lead">
            <Select value={form.leadId} onChange={e => setForm(f => ({ ...f, leadId: e.target.value }))}>
              <option value="">— Ninguno —</option>
              {(leads ?? []).map(l => <option key={l.id} value={l.id}>{l.companyName}</option>)}
            </Select>
          </Field>
          <Field label="Estado inicial">
            <Select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Fecha de entrega">
          <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
        </Field>

        <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <button type="button" onClick={onClose} className="px-3.5 py-1.5 rounded-[7px] text-[12.5px] font-medium border" style={{ borderColor: 'var(--border-2)', color: 'var(--text-2)' }}>
            Cancelar
          </button>
          <button type="submit" disabled={create.isPending} className="px-3.5 py-1.5 rounded-[7px] text-[12.5px] font-medium text-white disabled:opacity-50" style={{ background: 'var(--accent)' }}>
            {create.isPending ? 'Creando...' : 'Crear proyecto'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
