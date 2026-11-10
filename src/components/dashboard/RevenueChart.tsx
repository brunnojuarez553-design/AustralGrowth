'use client'

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import type { TooltipProps } from 'recharts'
import { formatCurrency } from '@/lib/utils'

function RevenueTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-white/10 bg-[#1c1c1e]/95 px-3 py-2 shadow-2xl backdrop-blur-xl">
      <p className="text-[10px] text-zinc-500">{label}</p>
      <p className="mt-1 text-xs text-white">Ingresos · {formatCurrency(payload[0].value ?? 0)}</p>
    </div>
  )
}

interface RevenueChartProps {
  data: { month: string; revenue: number }[]
  replay: number
  animate: boolean
}

export function RevenueChart({ data, replay, animate }: RevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart key={replay} data={data} margin={{ top: 8, right: 10, bottom: 4, left: 10 }}>
        <defs>
          <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-revenue)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--chart-revenue)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border-2)" strokeDasharray="3 5" />
        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-3)', fontSize: 10 }} dy={10} />
        <Tooltip cursor={{ fill: 'rgba(255,255,255,.025)' }} content={<RevenueTooltip />} />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="var(--chart-revenue)"
          strokeWidth={2}
          fill="url(#revenue-fill)"
          isAnimationActive={animate}
          animationBegin={150}
          animationDuration={2600}
          animationEasing="ease-in-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
