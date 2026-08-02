'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Topbar } from '@/components/layout/Topbar'
import { FinanceFormModal } from '@/components/finanzas/FinanceFormModal'
import { formatCurrency, formatDate } from '@/lib/utils'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface FinanceEntry {
  id: string
  type: 'INCOME' | 'EXPENSE' | 'ADVANCE' | 'PENDING'
  category: string
  description: string
  amount: number
  currency: string
  date: string
  isPaid: boolean
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1C1C2A] border border-[#252535] rounded-lg px-3 py-2 text-[12px]">
      <p className="text-[var(--text-3)] mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {formatCurrency(p.value)}</p>
      ))}
    </div>
  )
}

export default function FinanzasPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<FinanceEntry | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['finances'],
    queryFn: async () => {
      const res = await fetch('/api/finances')
      const json = await res.json()
      return json.data as { finances: FinanceEntry[]; summary: Record<string, number> }
    },
    staleTime: 30_000,
  })

  const summary = data?.summary ?? { totalIncome: 0, totalExpenses: 0, netProfit: 0, pending: 0, margin: 0 }
  const finances = data?.finances ?? []

  const chartData = (() => {
    const now = new Date()
    const months: { month: string; revenue: number; expenses: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const label = d.toLocaleDateString('es', { month: 'short' })
      const inMonth = finances.filter(f => {
        const fd = new Date(f.date)
        return fd.getFullYear() === d.getFullYear() && fd.getMonth() === d.getMonth()
      })
      months.push({
        month: label,
        revenue: inMonth.filter(f => f.type === 'INCOME').reduce((s, f) => s + f.amount, 0),
        expenses: inMonth.filter(f => f.type === 'EXPENSE').reduce((s, f) => s + f.amount, 0),
      })
    }
    return months
  })()

  function openCreate() { setEditingEntry(null); setModalOpen(true) }
  function openEdit(entry: FinanceEntry) { setEditingEntry(entry); setModalOpen(true) }

  return (
    <>
      <Topbar title="Finanzas" subtitle="Control financiero completo" primaryAction={{ label: 'Registrar movimiento', onClick: openCreate }} />
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Facturación mes', value: formatCurrency(summary.totalIncome), color: 'var(--text)', icon: 'ti-coin' },
            { label: 'Cobrado', value: formatCurrency(summary.totalIncome - (summary.pending ?? 0)), color: 'var(--text)', icon: 'ti-check' },
            { label: 'Pendiente', value: formatCurrency(summary.pending ?? 0), color: 'var(--amber)', icon: 'ti-clock' },
            { label: 'Gastos del mes', value: formatCurrency(summary.totalExpenses), color: 'var(--red)', icon: 'ti-minus' },
          ].map((k, i) => (
            <div key={i} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-[10px] p-4">
              <div className="flex items-center gap-[5px] text-[11px] text-[var(--text-3)] mb-[6px]">
                <i className={`ti ${k.icon}`} aria-hidden="true" /> {k.label}
              </div>
              <div className="text-[22px] font-bold font-mono tracking-tight" style={{ color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[10px] p-4">
            <div className="text-[13px] font-semibold text-[var(--text)] mb-4">Movimientos · {new Date().toLocaleDateString('es', { month: 'long', year: 'numeric' })}</div>
            <div className="space-y-0 max-h-[340px] overflow-y-auto">
              {isLoading && <div className="text-[12px] text-[var(--text-3)] py-4 text-center">Cargando...</div>}
              {!isLoading && finances.length === 0 && (
                <div className="text-[12px] text-[var(--text-3)] py-4 text-center">
                  Todavía no cargaste ningún movimiento. Usá el botón "Registrar movimiento".
                </div>
              )}
              {finances.map(mov => (
                <div key={mov.id} onClick={() => openEdit(mov)} className="flex items-center justify-between py-[10px] border-b border-[var(--border)] last:border-0 cursor-pointer hover:bg-[var(--surface-3)] px-1 rounded transition-all">
                  <div>
                    <div className="text-[12.5px] text-[var(--text)]">{mov.description}</div>
                    <div className="text-[10.5px] text-[var(--text-3)]">{formatDate(mov.date)} · {mov.category}</div>
                  </div>
                  <span className={`font-mono text-[13px] font-semibold ${mov.type === 'INCOME' || mov.type === 'ADVANCE' ? 'text-[var(--green)]' : mov.type === 'PENDING' ? 'text-[var(--amber)]' : 'text-[var(--red)]'}`}>
                    {mov.type === 'EXPENSE' ? '-' : '+'}{formatCurrency(mov.amount)}
                  </span>
                </div>
              ))}
              {finances.length > 0 && (
                <div className="flex items-center justify-between py-3">
                  <span className="text-[12.5px] font-semibold text-[var(--text)]">Beneficio neto</span>
                  <span className="font-mono text-[15px] font-bold text-[var(--green)]">{formatCurrency(summary.netProfit ?? 0)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[10px] p-4">
            <div className="text-[13px] font-semibold text-[var(--text)] mb-4">Flujo de caja · últimos 6 meses</div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" name="Ingresos" stroke="#10B981" strokeWidth={2} fill="url(#colorRevenue)" />
                <Area type="monotone" dataKey="expenses" name="Gastos" stroke="#EF4444" strokeWidth={2} fill="url(#colorExpenses)" />
              </AreaChart>
            </ResponsiveContainer>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-[var(--border)] pt-4">
              <div className="text-center">
                <div className="text-[10px] text-[var(--text-3)]">Margen neto</div>
                <div className="text-[15px] font-bold text-[var(--green)] font-mono">{Math.round(summary.margin ?? 0)}%</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-[var(--text-3)]">Facturación mes</div>
                <div className="text-[15px] font-bold text-[var(--text)] font-mono">{formatCurrency(summary.totalIncome)}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-[var(--text-3)]">Proyección anual</div>
                <div className="text-[15px] font-bold text-[var(--text)] font-mono">{formatCurrency(summary.totalIncome * 12)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <FinanceFormModal open={modalOpen} onClose={() => setModalOpen(false)} entry={editingEntry} />
    </>
  )
}
