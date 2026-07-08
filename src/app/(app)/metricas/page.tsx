'use client'
import { Topbar } from '@/components/layout/Topbar'

const byIndustry = [
  { label: 'Automotriz VZ', pct: 74, color: '#6366F1' },
  { label: 'Automotriz MX', pct: 51, color: '#3B82F6' },
  { label: 'Hospitalidad AR', pct: 38, color: '#10B981' },
  { label: 'Detailing LATAM', pct: 29, color: '#F59E0B' },
  { label: 'Retail general', pct: 18, color: '#8B5CF6' },
]
const byStage = [
  { label: 'Detectado → Contactado', pct: 74 },
  { label: 'Contactado → Respondió', pct: 59 },
  { label: 'Respondió → Propuesta', pct: 55 },
  { label: 'Propuesta → Ganado', pct: 52 },
]

export default function MetricasPage() {
  return (
    <>
      <Topbar title="Centro de Métricas" subtitle="Rendimiento comercial completo" primaryAction={{ label: 'Exportar reporte', onClick: () => {} }} />
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Conversión total', value: '31%' },
            { label: 'Tiempo prom. cierre', value: '18 días' },
            { label: 'ROI comercial', value: '8.4x', green: true },
            { label: 'Ticket promedio', value: '$595' },
          ].map((k, i) => (
            <div key={i} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-[10px] p-4">
              <div className="text-[10.5px] text-[var(--text-3)] mb-[6px]">{k.label}</div>
              <div className={`text-[22px] font-bold font-mono tracking-tight ${k.green ? 'text-[var(--green)]' : 'text-[var(--text)]'}`}>{k.value}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[10px] p-4">
            <div className="text-[13px] font-semibold text-[var(--text)] mb-4">Conversión por rubro</div>
            <div className="space-y-0">
              {byIndustry.map(item => (
                <div key={item.label} className="flex items-center gap-3 py-[7px] border-b border-[var(--border)] last:border-0">
                  <div className="w-[110px] text-[12px] text-[var(--text-2)] shrink-0">{item.label}</div>
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
              {byStage.map(item => (
                <div key={item.label} className="flex items-center gap-3 py-[7px] border-b border-[var(--border)] last:border-0">
                  <div className="w-[160px] text-[12px] text-[var(--text-2)] shrink-0">{item.label}</div>
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
