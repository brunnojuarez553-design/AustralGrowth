'use client'

import { useQuery } from '@tanstack/react-query'
import { Topbar } from '@/components/layout/Topbar'
import { formatCurrency, formatDate } from '@/lib/utils'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

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
  const { data, isLoading } = useQuery({
    queryKey: ['finances'],
    queryFn: async () => {
      const res = await fetch('/api/finances')
      const json = await res.json()
      return json.data
    },
    staleTime: 60_000,
  })

  const summary = data?.summary ?? { totalIncome: 4820, totalExpenses: 480, netProfit: 2957, pending: 1180 }
  const finances = data?.finances ?? []

  const mockChart = [
    { month: 'Ene', revenue: 1800, expenses: 320 },
    { month: 'Feb', revenue: 2400, expenses: 410 },
    { month: 'Mar', revenue: 3100, expenses: 380 },
    { month: 'Abr', revenue: 2900, expenses: 520 },
    { month: 'May', revenue: 3900, expenses: 460 },
    { month: 'Jun', revenue: 4820, expenses: 480 },
  ]

  return (
    <>
      <Topbar title="Finanzas" subtitle="Control financiero completo" primaryAction={{ label: 'Registrar ingreso', onClick: () => {} }} />
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Facturación mes', value: formatCurrency(summary.totalIncome), color: 'var(--text)', icon: 'ti-coin' },
            { label: 'Cobrado', value: formatCurrency(summary.totalIncome - summary.pending), color: 'var(--text)', icon: 'ti-check' },
            { label: 'Pendiente', value: formatCurrency(summary.pending ?? 1180), color: 'var(--amber)', icon: 'ti-clock' },
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

        <div className="grid grid-cols-2 gap-3">
          {/* Movements */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[10px] p-4">
            <div className="text-[13px] font-semibold text-[var(--text)] mb-4">Movimientos · {new Date().toLocaleDateString('es', { month: 'long', year: 'numeric' })}</div>
            <div className="space-y-0">
              {[
                { desc: 'Roco4WD · Anticipo 50%', amount: 750, type: 'INCOME', date: '2026-06-15' },
                { desc: 'Valentino Motors · Pago final', amount: 490, type: 'INCOME', date: '2026-06-12' },
                { desc: 'JART Luxe · Anticipo 50%', amount: 450, type: 'INCOME', date: '2026-06-08' },
                { desc: 'Barba Roja · Pago final', amount: 350, type: 'INCOME', date: '2026-06-05' },
                { desc: 'Vercel Pro', amount: 20, type: 'EXPENSE', date: '2026-06-01' },
                { desc: 'Cloudinary Plan', amount: 45, type: 'EXPENSE', date: '2026-06-01' },
                { desc: 'Groq API', amount: 18, type: 'EXPENSE', date: '2026-06-15' },
              ].map((mov, i) => (
                <div key={i} className="flex items-center justify-between py-[10px] border-b border-[var(--border)] last:border-0">
                  <div>
                    <div className="text-[12.5px] text-[var(--text)]">{mov.desc}</div>
                    <div className="text-[10.5px] text-[var(--text-3)]">{mov.date}</div>
                  </div>
                  <span className={`font-mono text-[13px] font-semibold ${mov.type === 'INCOME' ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                    {mov.type === 'INCOME' ? '+' : '-'}{formatCurrency(mov.amount)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between py-3">
                <span className="text-[12.5px] font-semibold text-[var(--text)]">Beneficio neto</span>
                <span className="font-mono text-[15px] font-bold text-[var(--green)]">{formatCurrency(summary.netProfit ?? 2957)}</span>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[10px] p-4">
            <div className="text-[13px] font-semibold text-[var(--text)] mb-4">Flujo de caja 2026</div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={mockChart} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
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

            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-[var(--border)] pt-4">
              <div className="text-center">
                <div className="text-[10px] text-[var(--text-3)]">Margen neto</div>
                <div className="text-[15px] font-bold text-[var(--green)] font-mono">61%</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-[var(--text-3)]">MRR</div>
                <div className="text-[15px] font-bold text-[var(--text)] font-mono">$4.820</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-[var(--text-3)]">Proyección anual</div>
                <div className="text-[15px] font-bold text-[var(--text)] font-mono">$57K</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
