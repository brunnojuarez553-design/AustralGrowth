'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal, Field, Input, Select } from '@/components/ui/Modal'

const TYPE_OPTIONS = [
  { value: 'INCOME', label: 'Ingreso' },
  { value: 'EXPENSE', label: 'Gasto' },
  { value: 'ADVANCE', label: 'Anticipo' },
  { value: 'PENDING', label: 'Pendiente de cobro' },
]

interface FinanceEntry {
  id: string
  type: string
  category: string
  description: string
  amount: number
  currency: string
  date: string
  isPaid: boolean
}

interface Props {
  open: boolean
  onClose: () => void
  entry?: FinanceEntry | null
}

const emptyForm = { type: 'INCOME', category: '', description: '', amount: '', date: new Date().toISOString().slice(0, 10), isPaid: true }

async function toJSONOrThrow(res: Response) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? `Error ${res.status}`)
  }
  return res.json()
}

export function FinanceFormModal({ open, onClose, entry }: Props) {
  const [form, setForm] = useState(emptyForm)
  const qc = useQueryClient()
  const isEdit = Boolean(entry)

  useEffect(() => {
    if (entry) {
      setForm({
        type: entry.type,
        category: entry.category,
        description: entry.description,
        amount: String(entry.amount),
        date: entry.date.slice(0, 10),
        isPaid: entry.isPaid,
      })
    } else {
      setForm(emptyForm)
    }
    save.reset()
  }, [entry, open]) // eslint-disable-line react-hooks/exhaustive-deps

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        type: form.type,
        category: form.category,
        description: form.description,
        amount: parseFloat(form.amount),
        currency: 'USD',
        date: new Date(form.date).toISOString(),
        isPaid: form.isPaid,
      }
      const res = await fetch(isEdit ? `/api/finances/${entry!.id}` : '/api/finances', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      return toJSONOrThrow(res)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finances'] }); onClose() },
  })

  const del = useMutation({
    mutationFn: async () => toJSONOrThrow(await fetch(`/api/finances/${entry!.id}`, { method: 'DELETE' })),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finances'] }); onClose() },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    save.mutate()
  }

  const errorMsg = (save.error as Error)?.message || (del.error as Error)?.message

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar movimiento' : 'Nuevo movimiento'} width="sm">
      <form onSubmit={handleSubmit} className="space-y-3">
        {errorMsg && (
          <div className="text-[12px] rounded-[7px] px-3 py-2" style={{ background: 'rgba(239,68,68,0.1)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.2)' }}>
            {errorMsg}
          </div>
        )}
        <Field label="Tipo">
          <Select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
            {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
        </Field>
        <Field label="Descripción *">
          <Input required placeholder="Ej: Roco4WD · Anticipo 50%" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </Field>
        <Field label="Categoría *">
          <Input required placeholder="Ej: Proyecto web, Herramientas, etc." value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Monto (USD) *">
            <Input required type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          </Field>
          <Field label="Fecha">
            <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </Field>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.isPaid} onChange={e => setForm(f => ({ ...f, isPaid: e.target.checked }))} className="w-4 h-4 accent-[var(--accent)]" />
          <span className="text-[12px]" style={{ color: 'var(--text-2)' }}>Ya cobrado / pagado</span>
        </label>

        <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
          {isEdit ? (
            <button type="button" onClick={() => del.mutate()} disabled={del.isPending} className="text-[12px] font-medium text-red-400 hover:text-red-300 disabled:opacity-50">
              {del.isPending ? 'Borrando...' : 'Borrar'}
            </button>
          ) : <span />}
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="px-3.5 py-1.5 rounded-[7px] text-[12.5px] font-medium border" style={{ borderColor: 'var(--border-2)', color: 'var(--text-2)' }}>
              Cancelar
            </button>
            <button type="submit" disabled={save.isPending} className="px-3.5 py-1.5 rounded-[7px] text-[12.5px] font-medium text-white disabled:opacity-50" style={{ background: 'var(--accent)' }}>
              {save.isPending ? 'Guardando...' : isEdit ? 'Guardar' : 'Registrar'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
