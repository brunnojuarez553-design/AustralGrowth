'use client'

import { useState, useEffect } from 'react'
import { useDashboard } from '@/hooks/useDashboard'
import { Topbar } from '@/components/layout/Topbar'
import { LeadFormModal } from '@/components/crm/LeadFormModal'
import { ScoreRing, statusFor } from '@/components/dashboard/ScoreRing'
import { BoldText } from '@/components/ui/BoldText'
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

function greetingWord(hour: number) {
  if (hour < 12) return 'Buenos días'
  if (hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function DeltaBadge({ value, invertColor = false }: { value: number | null; suffix?: string; invertColor?: boolean }) {
  if (value === null) return null
  const positive = invertColor ? value <= 0 : value >= 0
  return (
    <span className={`text-[10.5px] font-semibold px-1.5 py-[1px] rounded-full ${positive ? 'text-[var(--green)] bg-[rgba(16,185,129,0.12)]' : 'text-[#FCA5A5] bg-[rgba(239,68,68,0.12)]'}`}>
      {value >= 0 ? '+' : ''}{value.toFixed(1)}%
    </span>
  )
}

export default function DashboardPage() {
  const { data: metrics, isLoading, isError, error } = useDashboard()
  const [modalOpen, setModalOpen] = useState(false)
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  function exportReport() {
    if (!m) return
    const rows = [
      ['Métrica', 'Valor'],
      ['Facturación del mes', formatCurrency(m.monthlyRevenue)],
      ['Objetivo mensual', formatCurrency(m.monthlyGoal)],
      ['Puntaje comercial', `${m.businessScore}/100`],
      ['Leads activos', String(m.activeLeads)],
      ['Leads calientes', String(m.hotLeads)],
      ['Tasa de cierre', `${m.closeRate.toFixed(1)}%`],
      ['Ticket promedio', formatCurrency(m.avgTicket)],
      ['Valor de pipeline ponderado', formatCurrency(m.weightedPipelineValue)],
    ]
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte-austral-growth-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-[var(--text-3)] text-[13px]">Cargando métricas...</div>
    </div>
  )

  const m = metrics
  const remaining = Math.max((m?.monthlyGoal ?? 0) - (m?.monthlyRevenue ?? 0), 0)
  const goalMet = (m?.monthlyGoalProgress ?? 0) >= 100
  const topAlertText = (m?.alerts ?? [])[0]?.text ?? 'Cargá tus primeros leads para empezar a ver insights acá.'

  return (
    <>
      <Topbar title="Dashboard Ejecutivo" subtitle="Vista general" primaryAction={{ label: 'Nuevo lead', onClick: () => setModalOpen(true) }} />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 max-w-[1400px] mx-auto w-full">

        {isError && (
          <div className="text-[12.5px] rounded-[8px] px-4 py-3" style={{ background: 'rgba(239,68,68,0.1)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.2)' }}>
            No se pudo cargar el dashboard: {(error as Error)?.message}
          </div>
        )}

        {/* Greeting header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="relative flex h-[7px] w-[7px]">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--green)] opacity-75" />
                <span className="relative inline-flex rounded-full h-[7px] w-[7px] bg-[var(--green)]" />
              </span>
              <span className="text-[10.5px] font-semibold text-[var(--green)] tracking-[0.08em] uppercase">Pipeline activo</span>
              {now && (
                <span className="text-[11px] text-[var(--text-3)]" suppressHydrationWarning>
                  · {now.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })} · {now.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
            <h1 className="text-[28px] md:text-[34px] font-bold text-[var(--text)] tracking-tight" suppressHydrationWarning>
              {now ? greetingWord(now.getHours()) : 'Hola'}, Bruno.
            </h1>
            <p className="text-[13px] text-[var(--text-3)] mt-1">Austral está siguiendo tu pipeline y facturación en tiempo real.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={exportReport} className="flex items-center gap-[6px] px-3.5 py-2 rounded-[8px] text-[12.5px] font-medium text-[var(--text-2)] border border-[var(--border-2)] hover:bg-[var(--surface-3)] hover:text-[var(--text)] transition-all">
              <i className="ti ti-download text-[14px]" aria-hidden="true" /> Exportar reporte
            </button>
          </div>
        </div>

        {/* Hero: Austral Intelligence */}
        <div className="rounded-[20px] p-6 md:p-8 border border-[rgba(249,115,22,0.18)] overflow-hidden relative" style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.12) 0%, var(--surface-2) 55%)', boxShadow: '0 1px 0 0 rgba(249,115,22,0.25) inset, 0 20px 60px -20px rgba(249,115,22,0.15)' }}>
          <div className="absolute top-0 left-[10%] right-[10%] h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(249,115,22,0.5), transparent)' }} aria-hidden="true" />
          <div className="flex flex-col lg:flex-row gap-7">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-[6px] bg-[var(--accent)] flex items-center justify-center text-white text-[13px] font-bold">+</div>
                <span className="text-[10.5px] font-semibold text-[#FDBA74] tracking-[0.1em] uppercase">Austral Intelligence</span>
              </div>
              <h2 className="text-[30px] md:text-[42px] font-bold text-white leading-[1.12] tracking-tight mb-3">
                {goalMet ? (
                  <>Superaste tu objetivo con <span className="text-[#FDBA74]">{formatCurrency(m?.monthlyRevenue ?? 0)}</span> este mes.</>
                ) : (
                  <>Facturaste <span className="text-[#FDBA74]">{formatCurrency(m?.monthlyRevenue ?? 0)}</span> este mes.</>
                )}
              </h2>
              <p className="text-[13px] text-[var(--text-2)] leading-[1.6] max-w-[520px] mb-5">
                <BoldText text={topAlertText} />
              </p>
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <a href="/crm" className="flex items-center gap-[6px] px-4 py-2 rounded-[8px] text-[12.5px] font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-all">
                  Ver leads calientes
                </a>
                <a href="/metricas" className="flex items-center gap-[6px] text-[12.5px] font-medium text-[var(--text-2)] hover:text-white transition-all">
                  Ver análisis completo <i className="ti ti-arrow-right text-[13px]" aria-hidden="true" />
                </a>
              </div>
              <div className="flex flex-wrap gap-6 pt-5 border-t border-white/[0.06]">
                <div>
                  <div className="text-[19px] font-bold text-white font-mono">{m?.activeLeads ?? 0}</div>
                  <div className="text-[10.5px] text-[var(--text-3)]">leads activos</div>
                </div>
                <div>
                  <div className="text-[19px] font-bold text-white font-mono">{m?.avgCloseDays != null ? Math.round(m.avgCloseDays) : '—'}</div>
                  <div className="text-[10.5px] text-[var(--text-3)]">días prom. de cierre</div>
                </div>
                <div>
                  <div className="text-[19px] font-bold text-white font-mono">{m?.hotLeads ?? 0}</div>
                  <div className="text-[10.5px] text-[var(--text-3)]">leads calientes 🔥</div>
                </div>
              </div>
            </div>

            {/* Score panel */}
            <div className="lg:w-[270px] lg:shrink-0 bg-black/20 border border-white/[0.06] rounded-[14px] p-5 flex flex-col items-center">
              <div className="w-full flex items-start justify-between mb-5">
                <div>
                  <div className="text-[9.5px] font-semibold text-[var(--text-3)] tracking-[0.1em] uppercase mb-[3px]">Salud comercial</div>
                  <div className="text-[13px] font-semibold text-white">Puntaje comercial</div>
                </div>
                {m && (() => {
                  const status = statusFor(m.businessScore)
                  return (
                    <span className="text-[9.5px] font-semibold px-2 py-[3px] rounded-full whitespace-nowrap shrink-0" style={{ background: status.bg, color: status.color }}>
                      {status.label}
                    </span>
                  )
                })()}
              </div>
              <ScoreRing score={m?.businessScore ?? 0} showBadge={false} />
              <div className="w-full mt-6 space-y-3">
                {(m?.businessScoreBreakdown ?? []).map(item => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between text-[10.5px] mb-1">
                      <span className="text-[var(--text-3)]">{item.label}</span>
                      <span className="text-[var(--text-2)] font-mono font-medium">{item.value}</span>
                    </div>
                    <div className="h-[4px] bg-white/[0.06] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-[var(--accent-hover)] to-[var(--accent)]" style={{ width: `${item.value}%`, transition: 'width 1s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-[12px] p-4 transition-all hover:border-[var(--border-2)]">
            <div className="flex items-center justify-between mb-2">
              <div className="w-7 h-7 rounded-full bg-[rgba(16,185,129,0.12)] text-[var(--green)] flex items-center justify-center"><i className="ti ti-currency-dollar text-[14px]" aria-hidden="true" /></div>
              <DeltaBadge value={m?.revenueDelta ?? null} />
            </div>
            <div className="text-[10.5px] text-[var(--text-3)] font-medium mb-[2px]">Ingresos del mes</div>
            <div className="text-[24px] font-bold text-[var(--text)] font-mono tracking-tight">{formatCurrency(m?.monthlyRevenue ?? 0)}</div>
            <div className="text-[11px] text-[var(--text-3)] mt-1">de {formatCurrency(m?.monthlyGoal ?? 0)} objetivo</div>
          </div>
          <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-[12px] p-4 transition-all hover:border-[var(--border-2)]">
            <div className="flex items-center justify-between mb-2">
              <div className="w-7 h-7 rounded-full bg-[rgba(249,115,22,0.12)] text-[#FDBA74] flex items-center justify-center"><i className="ti ti-users text-[14px]" aria-hidden="true" /></div>
              {m?.newLeadsDelta != null && (
                <span className={`text-[10.5px] font-semibold px-1.5 py-[1px] rounded-full ${m.newLeadsDelta >= 0 ? 'text-[var(--green)] bg-[rgba(16,185,129,0.12)]' : 'text-[#FCA5A5] bg-[rgba(239,68,68,0.12)]'}`}>
                  {m.newLeadsDelta >= 0 ? '+' : ''}{m.newLeadsDelta}
                </span>
              )}
            </div>
            <div className="text-[10.5px] text-[var(--text-3)] font-medium mb-[2px]">Leads nuevos</div>
            <div className="text-[24px] font-bold text-[var(--text)] font-mono tracking-tight">{m?.newLeadsThisMonth ?? 0}</div>
            <div className="text-[11px] text-[var(--text-3)] mt-1">este mes</div>
          </div>
          <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-[12px] p-4 transition-all hover:border-[var(--border-2)]">
            <div className="flex items-center justify-between mb-2">
              <div className="w-7 h-7 rounded-full bg-[rgba(59,130,246,0.12)] text-[#93C5FD] flex items-center justify-center"><i className="ti ti-percentage text-[14px]" aria-hidden="true" /></div>
            </div>
            <div className="text-[10.5px] text-[var(--text-3)] font-medium mb-[2px]">Tasa de cierre</div>
            <div className="text-[24px] font-bold text-[var(--text)] font-mono tracking-tight">{(m?.closeRate ?? 0).toFixed(0)}%</div>
            <div className="text-[11px] text-[var(--text-3)] mt-1">de todos tus leads</div>
          </div>
          <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-[12px] p-4 transition-all hover:border-[var(--border-2)]">
            <div className="flex items-center justify-between mb-2">
              <div className="w-7 h-7 rounded-full bg-[rgba(245,158,11,0.12)] text-[var(--amber)] flex items-center justify-center"><i className="ti ti-receipt text-[14px]" aria-hidden="true" /></div>
            </div>
            <div className="text-[10.5px] text-[var(--text-3)] font-medium mb-[2px]">Ticket promedio</div>
            <div className="text-[24px] font-bold text-[var(--text)] font-mono tracking-tight">{formatCurrency(m?.avgTicket ?? 0)}</div>
            <div className="text-[11px] text-[var(--text-3)] mt-1">por negocio ganado</div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
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
                    <BoldText text={alert.text} className="text-[12px] text-[var(--text-2)] leading-[1.5]" />
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
