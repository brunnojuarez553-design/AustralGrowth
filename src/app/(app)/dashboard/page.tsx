'use client'

import { useDashboard } from '@/hooks/useDashboard'
import { Topbar } from '@/components/layout/Topbar'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

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

const STAGE_COLORS = ['#6366F1','#7C3AED','#3B82F6','#06B6D4','#10B981','#F59E0B','#EF4444','#059669','#475569']

export default function DashboardPage() {
  const { data: metrics, isLoading } = useDashboard()

  if (isLoading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-[var(--text-3)] text-[13px]">Cargando métricas...</div>
    </div>
  )

  const m = metrics

  return (
    <>
      <Topbar title="Dashboard Ejecutivo" subtitle={`${new Date().toLocaleDateString('es', { month: 'long', year: 'numeric' })} · Vista general`} primaryAction={{ label: 'Nuevo lead', onClick: () => {} }} />
      <div className="flex-1 overflow-y-auto p-5 space-y-4">

        {/* KPI Row */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Facturación mes', value: formatCurrency(m?.monthlyRevenue ?? 4820), change: '+23%', up: true, icon: 'ti-coin' },
            { label: 'Objetivo mensual', value: formatCurrency(m?.monthlyGoal ?? 6000), progress: m?.monthlyGoalProgress ?? 80, icon: 'ti-target' },
            { label: 'Leads activos', value: String(m?.activeLeads ?? 24), change: `${m?.hotLeads ?? 6} calientes 🔥`, up: true, icon: 'ti-users' },
            { label: 'Tasa de cierre', value: `${(m?.closeRate ?? 31).toFixed(0)}%`, change: '+4pts vs mes ant.', up: true, icon: 'ti-percentage' },
          ].map((kpi, i) => (
            <div key={i} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-[10px] p-4">
              <div className="flex items-center gap-[5px] text-[11px] text-[var(--text-3)] font-medium mb-[6px]">
                <i className={`ti ${kpi.icon}`} aria-hidden="true" /> {kpi.label}
              </div>
              <div className="text-[22px] font-bold text-[var(--text)] font-mono tracking-tight">{kpi.value}</div>
              {kpi.progress !== undefined ? (
                <>
                  <div className="h-1 bg-[var(--surface-3)] rounded-full overflow-hidden mt-[6px]">
                    <div className="h-full bg-[var(--accent)] rounded-full" style={{ width: `${Math.min(kpi.progress, 100)}%` }} />
                  </div>
                  <div className="text-[10.5px] text-[var(--text-3)] mt-1">{kpi.progress.toFixed(0)}% completado</div>
                </>
              ) : (
                <div className={`text-[11px] mt-1 flex items-center gap-1 ${kpi.up ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                  <i className={`ti ${kpi.up ? 'ti-trending-up' : 'ti-trending-down'}`} aria-hidden="true" /> {kpi.change}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-2 gap-3">
          {/* Funnel */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[10px] p-4">
            <div className="text-[13px] font-semibold text-[var(--text)] mb-4">Embudo de conversión</div>
            <div className="space-y-2">
              {(m?.funnelData ?? []).filter(f => !['WON','LOST'].includes(f.stage)).map((stage, i) => (
                <div key={stage.stage} className="flex items-center gap-3">
                  <div className="w-[100px] text-[11.5px] text-[var(--text-2)] shrink-0">{stage.label}</div>
                  <div className="flex-1 h-[22px] rounded-[4px] flex items-center pl-2" style={{ background: STAGE_COLORS[i], width: `${Math.max((stage.count / ((m?.funnelData[0]?.count) ?? 1)) * 180, 30)}px`, minWidth: 30 }}>
                    <span className="text-[11px] font-semibold text-white">{stage.count}</span>
                  </div>
                  <div className="text-[11.5px] text-[var(--text-3)] font-mono w-8 text-right">{stage.count}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue Chart */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[10px] p-4">
            <div className="text-[13px] font-semibold text-[var(--text)] mb-4">Facturación 2026</div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={m?.monthlyChart ?? []} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" name="Ingresos" fill="#6366F1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-2 gap-3">
          {/* Follow-ups */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[10px] p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="text-[13px] font-semibold text-[var(--text)]">Próximos seguimientos</div>
              <span className="ml-auto text-[10px] bg-[rgba(245,158,11,0.12)] text-[var(--amber)] border border-[rgba(245,158,11,0.2)] rounded-full px-2 py-[2px] font-medium">Hoy</span>
            </div>
            <div className="space-y-1">
              {(m?.upcomingFollowUps ?? []).map(lead => (
                <div key={lead.id} className="flex items-center gap-3 px-3 py-[9px] rounded-[7px] hover:bg-[var(--surface-3)] cursor-pointer transition-all">
                  <div className="w-[30px] h-[30px] rounded-full bg-[var(--accent)] flex items-center justify-center text-[11px] font-semibold text-white shrink-0">
                    {lead.companyName.slice(0,2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-medium text-[var(--text)] truncate">{lead.companyName}</div>
                    <div className="text-[11px] text-[var(--text-3)]">{lead.nextFollowUpAt ? formatRelativeTime(lead.nextFollowUpAt) : 'Pendiente'}</div>
                  </div>
                  <span className={`text-[10.5px] px-2 py-[2px] rounded-full font-medium ${
                    lead.isHot ? 'bg-[rgba(99,102,241,0.12)] text-[#A5B4FC] border border-[rgba(99,102,241,0.2)]'
                    : 'bg-[var(--surface-3)] text-[var(--text-2)] border border-[var(--border-2)]'
                  }`}>
                    {lead.isHot ? '🔥 Caliente' : lead.stage}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Insights */}
          <div className="bg-[rgba(245,158,11,0.06)] border border-[rgba(245,158,11,0.18)] rounded-[10px] p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-[7px] bg-[rgba(245,158,11,0.15)] flex items-center justify-center text-[var(--amber)] text-[14px]">
                <i className="ti ti-brain" aria-hidden="true" />
              </div>
              <div>
                <div className="text-[12.5px] font-semibold text-[var(--text)]">IA Comercial · Alertas</div>
                <div className="text-[10.5px] text-[var(--text-3)]">Actualizado hace 12 min</div>
              </div>
            </div>
            <div className="space-y-2">
              {[
                { icon: 'ti-flame', color: 'rgba(99,102,241,0.15)', iconColor: '#A5B4FC', text: <><strong className="text-[var(--text)]">6 leads calientes</strong> con alta probabilidad de cierre. WitcherTorque lidera con 84%.</> },
                { icon: 'ti-clock', color: 'rgba(245,158,11,0.15)', iconColor: 'var(--amber)', text: <><strong className="text-[var(--text)]">Hace 5 días</strong> sin contacto con Instaservice Panama. Riesgo de enfriamiento.</> },
                { icon: 'ti-trending-up', color: 'rgba(16,185,129,0.15)', iconColor: 'var(--green)', text: <>Tu tasa de cierre <strong className="text-[var(--text)]">mejora 12% los martes</strong>. Agendá demos hoy.</> },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2 py-2 border-b border-[rgba(245,158,11,0.1)] last:border-0 last:pb-0">
                  <div className="w-[22px] h-[22px] rounded-[5px] flex items-center justify-center text-[12px] shrink-0 mt-[1px]" style={{ background: item.color, color: item.iconColor }}>
                    <i className={`ti ${item.icon}`} aria-hidden="true" />
                  </div>
                  <div className="text-[12px] text-[var(--text-2)] leading-[1.5]">{item.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </>
  )
}
