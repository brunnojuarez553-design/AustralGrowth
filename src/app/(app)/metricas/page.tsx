'use client'
import { Topbar } from '@/components/layout/Topbar'
import { useDashboard } from '@/hooks/useDashboard'
import { formatCurrency } from '@/lib/utils'

const INDUSTRY_COLORS = ['#F97316', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6']

export default function MetricasPage() {
  const { data: m, isLoading, isError, error } = useDashboard()

  const byIndustry = (m?.revenueByIndustry ?? []).map((item, i) => ({
    label: item.industry,
    pct: Math.round(item.closeRate),
    color: INDUSTRY_COLORS[i % INDUSTRY_COLORS.length],
  }))

  const stageLabels: Record<string, string> = {
    DETECTED: 'Detectado', CONTACTED: 'Contactado', REPLIED: 'Respondió',
    MEETING: 'Reunión', DEMO: 'Demo', PROPOSAL: 'Propuesta',
    NEGOTIATION: 'Negociación', WON: 'Ganado',
  }
  const byStage = (m?.funnelData ?? [])
    .filter(s => s.stage !== 'LOST' && s.conversionRate != null)
    .map((s, i, arr) => ({
      label: `${stageLabels[arr[i - 1]?.stage] ?? '—'} → ${stageLabels[s.stage] ?? s.stage}`,
      pct: Math.round(s.conversionRate ?? 0),
    }))

  return (
    <>
      <Topbar title="Centro de Métricas" subtitle="Rendimiento comercial completo" />
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {isError && (
          <div className="text-[12.5px] rounded-[8px] px-4 py-3" style={{ background: 'rgba(239,68,68,0.1)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.2)' }}>
            No se pudieron cargar las métricas: {(error as Error)?.message}
          </div>
        )}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Conversión total', value: `${(m?.closeRate ?? 0).toFixed(0)}%` },
            { label: 'Tiempo prom. cierre', value: m?.avgCloseDays != null ? `${Math.round(m.avgCloseDays)} días` : '—' },
            { label: 'ROI comercial', value: m?.roi != null ? `${m.roi.toFixed(1)}x` : '—', green: true },
            { label: 'Ticket promedio', value: formatCurrency(m?.avgTicket ?? 0) },
          ].map((k, i) => (
            <div key={i} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-[10px] p-4">
              <div className="text-[10.5px] text-[var(--text-3)] mb-[6px]">{k.label}</div>
              <div className={`text-[22px] font-bold font-mono tracking-tight ${k.green ? 'text-[var(--green)]' : 'text-[var(--text)]'}`}>{isLoading ? '...' : k.value}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[10px] p-4">
            <div className="text-[13px] font-semibold text-[var(--text)] mb-4">Conversión por rubro</div>
            <div className="space-y-0">
              {byIndustry.length === 0 && !isLoading && (
                <div className="text-[12px] text-[var(--text-3)] py-4 text-center">Todavía no hay leads con rubro cargado.</div>
              )}
              {byIndustry.map(item => (
                <div key={item.label} className="flex items-center gap-3 py-[7px] border-b border-[var(--border)] last:border-0">
                  <div className="w-[85px] sm:w-[110px] text-[11px] sm:text-[12px] text-[var(--text-2)] shrink-0 truncate">{item.label}</div>
                  <div className="flex-1 h-[5px] bg-[var(--surface-3)] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${item.pct}%`, background: item.color }} />
                  </div>
                  <div className="w-10 text-right text-[11.5px] font-mono text-[var(--text)]">{item.pct}%</div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[10px] p-4">
            <div className="text-[13px] font-semibold text-[var(--text)] mb-4">Conversión por etapa</div>
            <div className="space-y-0">
              {byStage.length === 0 && !isLoading && (
                <div className="text-[12px] text-[var(--text-3)] py-4 text-center">Todavía no hay suficientes leads para calcular el embudo.</div>
              )}
              {byStage.map(item => (
                <div key={item.label} className="flex items-center gap-3 py-[7px] border-b border-[var(--border)] last:border-0">
                  <div className="w-[120px] sm:w-[160px] text-[11px] sm:text-[12px] text-[var(--text-2)] shrink-0 truncate">{item.label}</div>
                  <div className="flex-1 h-[5px] bg-[var(--surface-3)] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${item.pct}%` }} />
                  </div>
                  <div className="w-10 text-right text-[11.5px] font-mono text-[var(--text)]">{item.pct}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
