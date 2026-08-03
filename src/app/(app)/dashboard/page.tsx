'use client'

import { useState } from 'react'
import { useDashboard } from '@/hooks/useDashboard'
import { Topbar } from '@/components/layout/Topbar'
import { LeadFormModal } from '@/components/crm/LeadFormModal'
import { GoalRing } from '@/components/dashboard/GoalRing'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

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

const STAGE_COLORS = ['#F97316','#7C3AED','#3B82F6','#06B6D4','#10B981','#F59E0B','#EF4444','#059669','#475569']

const ALERT_META = {
  hot:     { icon: 'ti-flame', color: 'rgba(249,115,22,0.15)', iconColor: '#FDBA74' },
  stale:   { icon: 'ti-clock', color: 'rgba(245,158,11,0.15)', iconColor: 'var(--amber)' },
  insight: { icon: 'ti-trending-up', color: 'rgba(16,185,129,0.15)', iconColor: 'var(--green)' },
  empty:   { icon: 'ti-info-circle', color: 'rgba(148,163,184,0.15)', iconColor: 'var(--text-3)' },
}

export default function DashboardPage() {
  const { data: metrics, isLoading, isError, error } = useDashboard()
  const [modalOpen, setModalOpen] = useState(false)

  if (isLoading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-[var(--text-3)] text-[13px]">Cargando métricas...</div>
    </div>
  )

  const m = metrics
  const monthLabel = new Date().toLocaleDateString('es', { month: 'long', year: 'numeric' })
  const remaining = Math.max((m?.monthlyGoal ?? 0) - (m?.monthlyRevenue ?? 0), 0)
  const goalMet = (m?.monthlyGoalProgress ?? 0) >= 100

  return (
    <>
      <Topbar title="Dashboard Ejecutivo" subtitle={`${monthLabel} · Vista general`} primaryAction={{ label: 'Nuevo lead', onClick: () => setModalOpen(true) }} />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 max-w-[1400px] mx-auto w-full">

        {isError && (
          <div className="text-[12.5px] rounded-[8px] px-4 py-3" style={{ background: 'rgba(239,68,68,0.1)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.2)' }}>
            No se pudo cargar el dashboard: {(error as Error)?.message}
          </div>
        )}

        {/* Hero: objetivo mensual con anillo de progreso */}
        <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-[16px] p-6 md:p-7 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <GoalRing percent={m?.monthlyGoalProgress ?? 0} />
          <div className="flex-1 text-center sm:text-left">
            <div className="text-[10.5px] font-semibold text-[var(--text-3)] tracking-[0.1em] uppercase mb-1">
              Objetivo de {monthLabel.split(' de ')[0]}
            </div>
            <div className="text-[38px] md:text-[44px] font-bold font-mono text-[var(--text)] tracking-tight leading-none">
              {formatCurrency(m?.monthlyRevenue ?? 0)}
            </div>
            <div className="text-[13px] text-[var(--text-3)] mt-2">
              {goalMet ? (
                <span className="text-[var(--green)] font-medium">Objetivo cumplido — superaste los {formatCurrency(m?.monthlyGoal ?? 0)} previstos.</span>
              ) : (
                <>de <span className="text-[var(--text-2)] font-medium">{formatCurrency(m?.monthlyGoal ?? 0)}</span> · faltan <span className="text-[var(--text-2)] font-medium">{formatCurrency(remaining)}</span></>
              )}
            </div>
          </div>
        </div>

        {/* Stats secundarias */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'Leads activos', value: String(m?.activeLeads ?? 0), sub: `${m?.hotLeads ?? 0} calientes 🔥` },
            { label: 'Tasa de cierre', value: `${(m?.closeRate ?? 0).toFixed(0)}%`, sub: 'de todos tus leads' },
            { label: 'Ticket promedio', value: formatCurrency(m?.avgTicket ?? 0), sub: 'por negocio ganado' },
          ].map((kpi, i) => (
            <div key={i} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-[12px] p-4 transition-all hover:border-[var(--border-2)]">
              <div className="text-[10.5px] text-[var(--text-3)] font-medium mb-[6px]">{kpi.label}</div>
              <div className="text-[24px] font-bold text-[var(--text)] font-mono tracking-tight">{kpi.value}</div>
              <div className="text-[11px] text-[var(--text-3)] mt-1">{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Funnel */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[12px] p-5">
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
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[12px] p-5">
            <div className="text-[13px] font-semibold text-[var(--text)] mb-4">Facturación {new Date().getFullYear()}</div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={m?.monthlyChart ?? []} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" name="Ingresos" fill="#F97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Follow-ups */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[12px] p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="text-[13px] font-semibold text-[var(--text)]">Próximos seguimientos</div>
            </div>
            <div className="space-y-1">
              {(m?.upcomingFollowUps ?? []).length === 0 && (
                <div className="text-[12px] text-[var(--text-3)] py-3">No tenés seguimientos programados en los próximos días.</div>
              )}
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
                    lead.isHot ? 'bg-[rgba(249,115,22,0.12)] text-[#FDBA74] border border-[rgba(249,115,22,0.2)]'
                    : 'bg-[var(--surface-3)] text-[var(--text-2)] border border-[var(--border-2)]'
                  }`}>
                    {lead.isHot ? '🔥 Caliente' : lead.stage}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Insights */}
          <div className="bg-[rgba(245,158,11,0.06)] border border-[rgba(245,158,11,0.18)] rounded-[12px] p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-[7px] bg-[rgba(245,158,11,0.15)] flex items-center justify-center text-[var(--amber)] text-[14px]">
                <i className="ti ti-brain" aria-hidden="true" />
              </div>
              <div>
                <div className="text-[12.5px] font-semibold text-[var(--text)]">IA Comercial · Alertas</div>
                <div className="text-[10.5px] text-[var(--text-3)]">Calculado en base a tu pipeline actual</div>
              </div>
            </div>
            <div className="space-y-2">
              {(m?.alerts ?? []).map((alert, i) => {
                const meta = ALERT_META[alert.type]
                return (
                  <div key={i} className="flex items-start gap-2 py-2 border-b border-[rgba(245,158,11,0.1)] last:border-0 last:pb-0">
                    <div className="w-[22px] h-[22px] rounded-[5px] flex items-center justify-center text-[12px] shrink-0 mt-[1px]" style={{ background: meta.color, color: meta.iconColor }}>
                      <i className={`ti ${meta.icon}`} aria-hidden="true" />
                    </div>
                    <div className="text-[12px] text-[var(--text-2)] leading-[1.5]" dangerouslySetInnerHTML={{
                      __html: alert.text.replace(/\*\*(.+?)\*\*/g, '<strong class="text-[var(--text)]">$1</strong>'),
                    }} />
                  </div>
                )
              })}
            </div>
          </div>
        </div>

      </div>

      <LeadFormModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}
